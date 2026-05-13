using System.Text.Json;
using FiveNine_Collective_Site_Server.Contracts;
using FiveNine_Collective_Site_Server.Data;
using Microsoft.EntityFrameworkCore;

namespace FiveNine_Collective_Site_Server.Application;

/// <summary>
/// Reads and writes the shared studio — all profiles and their widgets.
/// </summary>
public sealed class StudioService(AppDbContext db)
{
    private static readonly HashSet<string> AllowedWidgetTypes =
    [
        "text", "picture", "video",
    ];

    public const string StudioId = "fivenine-studio";

    /// <summary>Cells of horizontal space allocated to each profile in the shared studio.</summary>
    private const int ProfileColumnStride = 22;

    /// <summary>
    /// Returns the full studio snapshot. When <paramref name="sub"/> is non-null,
    /// the caller's profile is auto-created (with a starter widget set) if missing
    /// and returned as currentProfileId.
    /// </summary>
    public async Task<StudioDto> GetStudioAsync(string? sub, CancellationToken ct = default)
    {
        Guid? currentProfileId = null;
        if (sub is not null)
        {
            var existing = await db.Profiles.SingleOrDefaultAsync(p => p.Auth0Sub == sub, ct);
            if (existing is null)
            {
                existing = await CreateProfileWithDefaultsAsync(sub, ct);
            }
            currentProfileId = existing.Id;
        }

        var profiles = await db.Profiles.AsNoTracking().ToListAsync(ct);
        var widgets = await db.Widgets.AsNoTracking().ToListAsync(ct);

        var updatedAt = profiles.Count == 0
            ? DateTimeOffset.UtcNow
            : profiles.Max(p => p.UpdatedAt);

        return new StudioDto(
            Id: StudioId,
            Version: 1,
            CurrentProfileId: currentProfileId?.ToString(),
            Profiles: [.. profiles.Select(ProfileDto.From)],
            Widgets: [.. widgets.Select(WidgetDto.From)],
            UpdatedAt: updatedAt);
    }

    public sealed record SaveResult(bool Validation, string? Field, string? Message, StudioDto? Studio)
    {
        public static SaveResult Invalid(string field, string message) => new(true, field, message, null);
        public static SaveResult Ok(StudioDto studio) => new(false, null, null, studio);
    }

    /// <summary>
    /// Replaces the calling user's widgets with the supplied list.
    /// Auto-creates the caller's profile on first save.
    /// </summary>
    public async Task<SaveResult> ReplaceMyWidgetsAsync(
        string sub,
        IReadOnlyList<WidgetInput> inputs,
        CancellationToken ct = default)
    {
        foreach (var input in inputs)
        {
            if (!AllowedWidgetTypes.Contains(input.Type))
                return SaveResult.Invalid("widgets", $"Unknown widget type '{input.Type}'.");
            if (input.W < 1 || input.H < 1)
                return SaveResult.Invalid("widgets", "Widget width and height must be >= 1.");
        }

        var profile = await db.Profiles
            .Include(p => p.Widgets)
            .SingleOrDefaultAsync(p => p.Auth0Sub == sub, ct);

        if (profile is null)
        {
            profile = new Profile { Auth0Sub = sub, Name = "New profile" };
            db.Profiles.Add(profile);
        }

        var existing = profile.Widgets.ToDictionary(w => w.Id);
        var keptIds = new HashSet<Guid>(existing.Count);

        foreach (var input in inputs)
        {
            if (Guid.TryParse(input.Id, out var id) && existing.TryGetValue(id, out var widget))
            {
                if (widget.Type != input.Type) widget.Type = input.Type;
                if (widget.Col != input.Col) widget.Col = input.Col;
                if (widget.Row != input.Row) widget.Row = input.Row;
                if (widget.W != input.W) widget.W = input.W;
                if (widget.H != input.H) widget.H = input.H;
                var newData = input.Data.GetRawText();
                if (widget.Data.RootElement.GetRawText() != newData)
                    widget.Data = JsonDocument.Parse(newData);
                keptIds.Add(id);
            }
            else
            {
                // Unknown id (or draft-* sentinel): mint a server GUID — never
                // trust a caller-supplied id for a row that isn't already theirs.
                profile.Widgets.Add(new Widget
                {
                    Id = Guid.NewGuid(),
                    Type = input.Type,
                    Col = input.Col,
                    Row = input.Row,
                    W = input.W,
                    H = input.H,
                    Data = JsonDocument.Parse(input.Data.GetRawText()),
                });
            }
        }

        foreach (var (id, widget) in existing)
        {
            if (!keptIds.Contains(id))
                db.Widgets.Remove(widget);
        }

        profile.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        return SaveResult.Ok(await GetStudioAsync(sub, ct));
    }

    /// <summary>
    /// Creates a profile with a starter widget set. Each new profile gets its
    /// own horizontal slot (offset by <see cref="ProfileColumnStride"/> cells)
    /// so multiple users coexist on the shared canvas without overlapping.
    /// </summary>
    private async Task<Profile> CreateProfileWithDefaultsAsync(string sub, CancellationToken ct)
    {
        var slot = await db.Profiles.CountAsync(ct);
        var colOffset = slot * ProfileColumnStride;

        var profile = new Profile
        {
            Auth0Sub = sub,
            Name = "New profile",
            Role = "",
            Bio = "",
            Widgets =
            [
                MakeWidget("text", colOffset, 0, 5, 3, new
                {
                    body = "A quote, a thought, a manifesto.",
                }),
                MakeWidget("picture", colOffset + 5, 0, 4, 4, new
                {
                    url = (string?)null,
                    caption = "Caption",
                }),
                MakeWidget("video", colOffset, 3, 5, 3, new
                {
                    url = (string?)null,
                    title = "Video",
                }),
            ],
        };

        db.Profiles.Add(profile);
        await db.SaveChangesAsync(ct);
        return profile;
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
