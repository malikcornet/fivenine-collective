using FiveNine_Collective_Site.Data;
using FiveNine_Collective_Site_Server.Application;
using FiveNine_Collective_Site_Server.Infrastructure.Auth;
using FiveNine_Collective_Site_Server.Infrastructure.Http;
using FiveNine_Collective_Site_Server.Infrastructure.Storage;
using FiveNine_Collective_Site_Server.Realtime;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.Services.AddProblemDetails();
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddOpenApi();
builder.Services.AddCorsFromConfig(builder.Configuration);
builder.Services.AddAuth0(builder.Configuration);
builder.AddNpgsqlDbContext<AppDbContext>("fiveninedb");
builder.Services.AddObjectStorage(builder.Configuration);
builder.Services.AddScoped<StudioService>();

var app = builder.Build();

// Schema migrations are owned by the FiveNine-Collective.Site.Migrations
// console project. Locally it runs as a WaitForCompletion resource in the
// Aspire AppHost; on Railway it runs as the preDeployCommand. The server
// itself no longer migrates on startup — fail fast if the DB schema is stale.

app.UseExceptionHandler();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.MapControllers();
app.MapHub<StudioHub>("/hubs/studio");
app.MapDefaultEndpoints();
app.UseFileServer();
app.Run();
