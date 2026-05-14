using System.Text.Json;
using Bogus;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FiveNine_Collective_Site.Data;

/// <summary>
/// Reference / demo data inserted by the seeder. Destructive: wipes all
/// CanvasItems (which cascades to Widgets via FK) before inserting demo data.
/// Use only for fresh starts — production runs should not invoke this unless
/// you explicitly want to lose data.
///
/// Real per-user profiles (matched by Auth0 sub) are created on-demand inside
/// StudioService when an authenticated user first loads the studio. The fake
/// profiles seeded here use a "seed|" sub prefix so they cannot collide with
/// real Auth0 subjects.
///
/// Fake data is generated via Bogus with a fixed seed so reruns produce the
/// same output. Property assignment goes through public setters, so adding new
/// non-required properties to the model doesn't break this seeder — only
/// renames or new required members will.
/// </summary>
public static class Seeder
{
    private const int FakeProfileCount = 6;
    private const int BogusSeed = 5959;
    private const int ContainerColumnStride = 22;

    /// <summary>Truncates CanvasItems (cascades to Widgets via the FK) and
    /// inserts the FiveNine demo project plus a handful of randomized fake
    /// profiles. EF migrations history is left untouched so the schema is
    /// still considered current.</summary>
    public static async Task SeedDemoDataAsync(
        AppDbContext db,
        ILogger logger,
        CancellationToken ct = default)
    {
        logger.LogWarning("Truncating CanvasItems (cascades to Widgets). All existing canvas data will be lost.");
        await db.Database.ExecuteSqlRawAsync(
            "TRUNCATE TABLE \"CanvasItems\" RESTART IDENTITY CASCADE;",
            ct);

        Randomizer.Seed = new Random(BogusSeed);

        var profiles = BuildFakeProfiles(FakeProfileCount);
        db.Profiles.AddRange(profiles);

        // Anchor far enough right that it never collides with profile slots
        // (profiles are placed at multiples of ContainerColumnStride starting
        // at column 0; this stays well clear).
        const int projectColOffset = 200;

        var project = new ProjectItem
        {
            Auth0Sub = "system",
            Name = "FiveNine Project",
            Description = "A shared workspace where collaborators drop ideas, references, and drafts together.",
            CollaboratorSubs = [.. profiles.Take(3).Select(p => p.Auth0Sub)],
            Widgets =
            [
                MakeWidget("text", projectColOffset, 0, 6, 3, new { body = "Welcome to the first FiveNine project." }),
                MakeWidget("picture", projectColOffset + 6, 0, 4, 4, new { url = (string?)null, caption = "Mood board" }),
                MakeWidget("video", projectColOffset, 3, 5, 3, new { url = (string?)null, title = "Pitch reel" }),
            ],
        };
        db.Projects.Add(project);

        await db.SaveChangesAsync(ct);
        logger.LogInformation(
            "Seeded {ProfileCount} fake profiles and demo project '{Name}' ({Id}).",
            profiles.Count, project.Name, project.Id);
    }

    private static List<ProfileItem> BuildFakeProfiles(int count)
    {
        // Bogus binds rule names to property setters by reflection — adding new
        // optional properties to ProfileItem won't break this. If a property is
        // renamed or becomes required, update the matching RuleFor below.
        var widgetFaker = new Faker();

        var faker = new Faker<ProfileItem>()
            .UseSeed(BogusSeed)
            .RuleFor(p => p.Auth0Sub, _ => $"seed|{Guid.NewGuid():N}")
            .RuleFor(p => p.FirstName, f => f.Name.FirstName())
            .RuleFor(p => p.LastName, f => f.Name.LastName())
            .RuleFor(p => p.Name, (_, p) => $"{p.FirstName} {p.LastName}")
            .RuleFor(p => p.Role, f => f.Name.JobTitle())
            .RuleFor(p => p.Bio, f => f.Lorem.Sentence(12))
            // Npgsql's `timestamp with time zone` only accepts UTC offsets,
            // so coerce Bogus's local-time fakes to UTC.
            .RuleFor(p => p.OnboardedAt, f => f.Date.RecentOffset(30).ToUniversalTime())
            .RuleFor(p => p.CreatedAt, f => f.Date.PastOffset(1).ToUniversalTime())
            .RuleFor(p => p.UpdatedAt, (_, p) => p.CreatedAt);

        var profiles = faker.Generate(count);

        for (var i = 0; i < profiles.Count; i++)
        {
            var col = i * ContainerColumnStride;
            profiles[i].Widgets =
            [
                MakeWidget("text", col, 0, 5, 3, new { body = widgetFaker.Lorem.Sentence(8) }),
                MakeWidget("picture", col + 5, 0, 4, 4, new
                {
                    url = (string?)null,
                    caption = widgetFaker.Lorem.Sentence(3),
                }),
                MakeWidget("video", col, 3, 5, 3, new
                {
                    url = (string?)null,
                    title = widgetFaker.Hacker.Phrase(),
                }),
            ];
        }

        return profiles;
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
