using FiveNine_Collective_Site.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

// One-shot DB CLI. Two modes, selected by argv:
//
//   (no args)                       — apply pending EF Core migrations and exit
//   --seed-only --confirm-wipe      — wipe CanvasItems (cascades to Widgets)
//                                     and insert the FiveNine demo project.
//                                     Both flags required so a stray
//                                     `dotnet run -- --seed-only` can't
//                                     destroy data on its own.
//
// Both modes resolve the same "fiveninedb" connection string the server uses
// (via AddNpgsqlDbContext + ServiceDiscovery / env vars). Exit code 0 on
// success, non-zero on failure so the orchestrator can fail the deploy.

var seedOnly = args.Contains("--seed-only");
var confirmWipe = args.Contains("--confirm-wipe");

if (seedOnly && !confirmWipe)
{
    Console.Error.WriteLine(
        "--seed-only is destructive (truncates CanvasItems). " +
        "Pass --confirm-wipe to acknowledge and proceed.");
    return 2;
}

var builder = Host.CreateApplicationBuilder(args);
builder.AddNpgsqlDbContext<AppDbContext>("fiveninedb");

using var host = builder.Build();

var logger = host.Services.GetRequiredService<ILogger<Program>>();
using var scope = host.Services.CreateScope();
var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

try
{
    if (seedOnly)
    {
        logger.LogInformation("Seeder running (--seed-only --confirm-wipe).");
        await Seeder.SeedDemoDataAsync(db, logger);
        logger.LogInformation("Seed complete.");
    }
    else
    {
        logger.LogInformation("Applying EF Core migrations…");
        await db.Database.MigrateAsync();
        logger.LogInformation("Migrations complete.");
    }

    return 0;
}
catch (Exception ex)
{
    logger.LogCritical(ex, "{Mode} failed", seedOnly ? "Seeder" : "Migrator");
    return 1;
}
