using FiveNine_Collective_Site_Server.Application;
using FiveNine_Collective_Site_Server.Data;
using FiveNine_Collective_Site_Server.Infrastructure.Auth;
using FiveNine_Collective_Site_Server.Infrastructure.Http;
using FiveNine_Collective_Site_Server.Infrastructure.Startup;
using FiveNine_Collective_Site_Server.Infrastructure.Storage;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.Services.AddProblemDetails();
builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddCorsFromConfig(builder.Configuration);
builder.Services.AddAuth0(builder.Configuration);
builder.AddNpgsqlDbContext<AppDbContext>("fiveninedb");
builder.Services.AddObjectStorage(builder.Configuration);
builder.Services.AddScoped<StudioService>();

var app = builder.Build();

// --migrate-only: apply pending migrations then exit (used as Railway preDeployCommand)
if (args.Contains("--migrate-only"))
{
    await app.Services.MigrateAndExitAsync();
    return;
}

// Apply migrations on startup (fallback if pre-deploy command did not run)
await app.Services.MigrateOnStartupAsync();

app.UseExceptionHandler();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.MapControllers();
app.MapDefaultEndpoints();
app.UseFileServer();
app.Run();
