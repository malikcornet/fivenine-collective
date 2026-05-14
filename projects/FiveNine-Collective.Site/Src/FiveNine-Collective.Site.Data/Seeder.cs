using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FiveNine_Collective_Site.Data;

/// <summary>
/// Reference / demo data inserted by the seeder. Destructive: wipes all
/// CanvasItems (which cascades to Widgets via FK) before inserting the demo
/// data. Use only for fresh starts — production runs should not invoke this
/// unless you explicitly want to lose user data.
///
/// Per-user profiles are NOT inserted here; they're created on-demand inside
/// StudioService when an authenticated user first loads the studio.
/// </summary>
public static class Seeder
{
    /// <summary>Truncates CanvasItems (cascades to Widgets via the FK) and
    /// inserts the FiveNine demo project. EF migrations history is left
    /// untouched so the schema is still considered current.</summary>
    public static async Task SeedDemoDataAsync(
        AppDbContext db,
        ILogger logger,
        CancellationToken ct = default)
    {
        logger.LogWarning("Truncating CanvasItems (cascades to Widgets). All existing canvas data will be lost.");
        await db.Database.ExecuteSqlRawAsync(
            "TRUNCATE TABLE \"CanvasItems\" RESTART IDENTITY CASCADE;",
            ct);

        // Anchor far enough right that it never collides with profile slots
        // (profiles are placed at multiples of ContainerColumnStride starting
        // at column 0; this stays well clear).
        const int projectColOffset = 200;

        var project = new ProjectItem
        {
            Auth0Sub = "system",
            Name = "FiveNine Project",
            Description = "A shared workspace where collaborators drop ideas, references, and drafts together.",
            CollaboratorSubs = [],
            Widgets =
            [
                MakeWidget("text", projectColOffset, 0, 6, 3, new { body = "Welcome to the first FiveNine project." }),
                MakeWidget("picture", projectColOffset + 6, 0, 4, 4, new { url = (string?)null, caption = "Mood board" }),
                MakeWidget("video", projectColOffset, 3, 5, 3, new { url = (string?)null, title = "Pitch reel" }),
            ],
        };

        db.Projects.Add(project);
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Seeded demo project '{Name}' ({Id}).", project.Name, project.Id);
    }

    private static Widget MakeWidget(string type, int col, int row, int w, int h, object data) => new()
    {
        Id = Guid.NewGuid(),
        Type = type,
        Col = col,
        Row = row,
        W = w,
        H = h,
        Data = JsonSerializer.SerializeToDocument(data),
    };
}
