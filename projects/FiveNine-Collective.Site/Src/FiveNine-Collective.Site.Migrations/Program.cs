using FiveNine_Collective_Site.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

// One-shot migrator. Resolves the same "fiveninedb" connection string as the
// server (via AddNpgsqlDbContext + ServiceDiscovery / env vars), applies all
// pending EF Core migrations, and exits with code 0 on success or non-zero on
// failure so the orchestrator (Aspire AppHost locally, Railway pre-deploy
// remotely) can fail the deploy.
//
// Note: deliberately does NOT call AddServiceDefaults — OpenTelemetry,
// resilience handlers, and health checks add startup overhead that's wasted
// on a sub-second process.

var builder = Host.CreateApplicationBuilder(args);
builder.AddNpgsqlDbContext<AppDbContext>("fiveninedb");

using var host = builder.Build();

var logger = host.Services.GetRequiredService<ILogger<Program>>();
using var scope = host.Services.CreateScope();
var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

try
{
    logger.LogInformation("Applying EF Core migrations…");
    await db.Database.MigrateAsync();
    logger.LogInformation("Migrations complete.");
    return 0;
}
catch (Exception ex)
{
    logger.LogCritical(ex, "Migration failed");
    return 1;
}
