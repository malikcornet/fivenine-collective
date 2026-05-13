using FiveNine_Collective_Site_Server.Data;
using Microsoft.EntityFrameworkCore;

namespace FiveNine_Collective_Site_Server.Infrastructure.Startup;

/// <summary>
/// Extension methods for applying EF Core migrations at startup or pre-deploy time.
/// </summary>
public static class DatabaseMigrator
{
    /// <summary>
    /// Applies all pending migrations and returns.
    /// Used as a Railway pre-deploy command via the <c>--migrate-only</c> CLI flag.
    /// The process exits after this method completes (caller's responsibility).
    /// </summary>
    public static async Task MigrateAndExitAsync(this IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();

        logger.LogInformation("Running pre-deploy migrations");
        await db.Database.MigrateAsync();
        logger.LogInformation("Pre-deploy migrations complete");
    }

    /// <summary>
    /// Applies all pending migrations on startup.
    /// Acts as a fallback for environments where the pre-deploy command did not run.
    /// Throws on failure so the host fails fast rather than serving with a stale schema.
    /// </summary>
    public static async Task MigrateOnStartupAsync(this IServiceProvider services)
    {
        using var scope = services.CreateScope();
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
}
