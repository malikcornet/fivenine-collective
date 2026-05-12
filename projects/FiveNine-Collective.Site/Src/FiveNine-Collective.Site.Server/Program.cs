using System.Security.Claims;
using FiveNine_Collective_Site_Server.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();

var allowedOrigins = builder.Configuration["ALLOWED_ORIGINS"]?.Split(',') ?? [];
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = $"https://{builder.Configuration["Auth0:Domain"]}/";
        options.Audience = builder.Configuration["Auth0:Audience"];
    });
builder.Services.AddAuthorization();

builder.AddNpgsqlDbContext<AppDbContext>("fiveninedb");

var app = builder.Build();

// --migrate-only: apply pending migrations then exit (used as Railway preDeployCommand)
if (args.Contains("--migrate-only"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();
    logger.LogInformation("Running pre-deploy migrations");
    await db.Database.MigrateAsync();
    logger.LogInformation("Pre-deploy migrations complete");
    return;
}

// Apply migrations on startup (fallback if pre-deploy command did not run)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();
    try
    {
        await db.Database.MigrateAsync();
    }
    catch (Exception ex)
    {
        logger.LogCritical(ex, "Database migration failed on startup");
        throw;
    }
}

app.UseExceptionHandler();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

string[] summaries = ["Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"];

var api = app.MapGroup("/api");

api.MapGet("weatherforecast", () =>
{
    var forecast = Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return forecast;
})
.WithName("GetWeatherForecast")
.RequireAuthorization();

// GET /api/account/me — returns the current user's account, or 404 if not onboarded
api.MapGet("account/me", async (ClaimsPrincipal user, AppDbContext db) =>
{
    var sub = user.FindFirstValue(ClaimTypes.NameIdentifier)
              ?? user.FindFirstValue("sub");
    if (sub is null) return Results.Unauthorized();

    var account = await db.UserAccounts.SingleOrDefaultAsync(a => a.Auth0Sub == sub);
    return account is null
        ? Results.NotFound()
        : Results.Ok(new AccountDto(account.DisplayName, account.Bio, account.CreatedAt));
})
.WithName("GetMyAccount")
.RequireAuthorization();

// POST /api/account/onboard — creates the account on first login
api.MapPost("account/onboard", async (ClaimsPrincipal user, OnboardRequest req, AppDbContext db) =>
{
    var sub = user.FindFirstValue(ClaimTypes.NameIdentifier)
              ?? user.FindFirstValue("sub");
    if (sub is null) return Results.Unauthorized();

    if (await db.UserAccounts.AnyAsync(a => a.Auth0Sub == sub))
        return Results.Conflict("Account already exists.");

    var account = new UserAccount
    {
        Auth0Sub = sub,
        DisplayName = req.DisplayName.Trim(),
        Bio = req.Bio?.Trim(),
    };
    db.UserAccounts.Add(account);
    await db.SaveChangesAsync();

    return Results.Created($"/api/account/me", new AccountDto(account.DisplayName, account.Bio, account.CreatedAt));
})
.WithName("OnboardAccount")
.RequireAuthorization();

app.MapDefaultEndpoints();

app.UseFileServer();

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}

record AccountDto(string DisplayName, string? Bio, DateTimeOffset CreatedAt);
record OnboardRequest(string DisplayName, string? Bio);
