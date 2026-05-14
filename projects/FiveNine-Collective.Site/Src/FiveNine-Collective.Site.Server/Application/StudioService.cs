using System.Collections.Concurrent;
using System.Text.Json;
using FiveNine_Collective_Site_Server.Contracts;
using FiveNine_Collective_Site.Data;
using Microsoft.EntityFrameworkCore;

namespace FiveNine_Collective_Site_Server.Application;

/// <summary>
/// Reads and writes the shared studio — all canvas items (profiles and
/// projects) and their widgets.
/// </summary>
public sealed class StudioService(AppDbContext db)
{
    /// <summary>Widget kinds the server accepts, with the canvas-item kinds
    /// they may live in. Mirrors the frontend widgets/catalog.ts.</summary>
    private static readonly Dictionary<string, HashSet<string>> WidgetAllowedIn = new()
    {
        ["text"] = ["profile", "project"],
        ["picture"] = ["profile", "project"],
        ["video"] = ["profile", "project"],
    };

    // Per-user save queue. Serializes ReplaceMyWidgetsAsync calls for the same
    // sub so concurrent tabs / racing autosaves / parallel HTTP connections
    // don't read-modify-write the same Widgets rows and trip EF's
    // "expected 1 row, affected 0" concurrency check.
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> SaveLocks = new();

    public const string StudioId = "fivenine-studio";

    /// <summary>Cells of horizontal space allocated to each profile/project
    /// when they're auto-seeded on the shared canvas.</summary>
    private const int ContainerColumnStride = 22;

    /// <summary>
    /// Returns the full studio snapshot. When <paramref name="sub"/> is non-null,
    /// the caller's profile is auto-created on first load. Also seeds a default
    /// shared project on first call so the canvas isn't empty.
    /// </summary>
    public async Task<StudioDto> GetStudioAsync(string? sub, CancellationToken ct = default)
    {
        Guid? currentProfileId = null;
        if (sub is not null)
        {
            var existing = await db.Profiles.SingleOrDefaultAsync(p => p.Auth0Sub == sub, ct);
            existing ??= await CreateProfileWithDefaultsAsync(sub, ct);
            currentProfileId = existing.Id;
        }

        await EnsureDefaultProjectAsync(ct);

        var items = await db.CanvasItems.AsNoTracking().ToListAsync(ct);
        var widgets = await db.Widgets.AsNoTracking().ToListAsync(ct);

        // Build a kind lookup so WidgetDto.FromWithKind doesn't re-query.
        var kindById = items.ToDictionary(
            i => i.Id,
            i => i is ProfileItem ? "profile" : "project");

        var updatedAt = items.Count == 0
            ? DateTimeOffset.UtcNow
            : items.Max(i => i.UpdatedAt);

        return new StudioDto(
            Id: StudioId,
            Version: 1,
            CurrentProfileId: currentProfileId?.ToString(),
            CanvasItems: [.. items.Select(CanvasItemDto.From)],
            Widgets: [.. widgets.Select(w => WidgetDto.FromWithKind(w, kindById.GetValueOrDefault(w.CanvasItemId, "unknown")))],
            UpdatedAt: updatedAt);
    }

    public sealed record SaveResult(bool Validation, string? Field, string? Message, StudioDto? Studio)
    {
        public static SaveResult Invalid(string field, string message) => new(true, field, message, null);
        public static SaveResult Ok(StudioDto studio) => new(false, null, null, studio);
    }

    public sealed record CreateResult(bool Validation, string? Field, string? Message, WidgetDto? Widget)
    {
        public static CreateResult Invalid(string field, string message) => new(true, field, message, null);
        public static CreateResult Ok(WidgetDto widget) => new(false, null, null, widget);
    }

    /// <summary>
    /// Creates a single widget inside the given container. The caller must
    /// have edit rights on the container: own the profile, or be listed as a
    /// project collaborator (creator is implicitly included). Auto-creates
    /// the caller's profile on first use.
    /// </summary>
    public async Task<CreateResult> CreateWidgetAsync(
        string sub,
        WidgetInput input,
        CancellationToken ct = default)
    {
        var gate = SaveLocks.GetOrAdd(sub, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(ct);
        try
        {
            var profile = await db.Profiles.SingleOrDefaultAsync(p => p.Auth0Sub == sub, ct)
                ?? await CreateProfileWithDefaultsAsync(sub, ct);

            var container = input.CanvasItemId == Guid.Empty || input.CanvasItemId == profile.Id
                ? (CanvasItem)profile
                : await db.CanvasItems.SingleOrDefaultAsync(c => c.Id == input.CanvasItemId, ct)
                  ?? (CanvasItem)profile;

            if (!CanEdit(container, sub))
                return CreateResult.Invalid("widget", "You don't have edit rights on this container.");

            var kind = container is ProfileItem ? "profile" : "project";
            if (!IsAllowed(input.Type, kind))
                return CreateResult.Invalid("widget", $"Widget type '{input.Type}' isn't allowed in a {kind}.");
            if (input.W < 1 || input.H < 1)
                return CreateResult.Invalid("widget", "Widget width and height must be >= 1.");

            // Honor caller-supplied GUIDs when they're free; mint a fresh one
            // if taken (anywhere) or unparseable (draft- sentinel).
            Guid id;
            if (Guid.TryParse(input.Id, out var parsed)
                && !await db.Widgets.AnyAsync(w => w.Id == parsed, ct))
            {
                id = parsed;
            }
            else
            {
                id = Guid.NewGuid();
            }

            var widget = new Widget
            {
                Id = id,
                CanvasItemId = container.Id,
                Type = input.Type,
                Col = input.Col,
                Row = input.Row,
                W = input.W,
                H = input.H,
                Data = JsonDocument.Parse(input.Data.GetRawText()),
            };
            db.Widgets.Add(widget);
            container.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(ct);

            return CreateResult.Ok(WidgetDto.FromWithKind(widget, kind));
        }
        finally
        {
            gate.Release();
        }
    }

    /// <summary>
    /// Replaces the calling user's widgets across every container they have
    /// edit rights on. Inputs are grouped by container; rows belonging to
    /// containers the caller can't edit are silently dropped.
    /// </summary>
    public async Task<SaveResult> ReplaceMyWidgetsAsync(
        string sub,
        IReadOnlyList<WidgetInput> inputs,
        CancellationToken ct = default)
    {
        foreach (var input in inputs)
        {
            if (!WidgetAllowedIn.ContainsKey(input.Type))
                return SaveResult.Invalid("widgets", $"Unknown widget type '{input.Type}'.");
            if (input.W < 1 || input.H < 1)
                return SaveResult.Invalid("widgets", "Widget width and height must be >= 1.");
        }

        var gate = SaveLocks.GetOrAdd(sub, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(ct);
        try
        {
            return await SaveWidgetsAsync(sub, inputs, ct);
        }
        finally
        {
            gate.Release();
        }
    }

    private async Task<SaveResult> SaveWidgetsAsync(
        string sub,
        IReadOnlyList<WidgetInput> inputs,
        CancellationToken ct)
    {
        var profile = await db.Profiles
            .Include(p => p.Widgets)
            .SingleOrDefaultAsync(p => p.Auth0Sub == sub, ct)
            ?? await CreateProfileWithDefaultsAsync(sub, ct);

        // Group inputs by container. Default empty/missing CanvasItemId to
        // the caller's profile so older clients (no CanvasItemId on widget)
        // still save correctly.
        var grouped = inputs
            .GroupBy(i => i.CanvasItemId == Guid.Empty ? profile.Id : i.CanvasItemId)
            .ToList();

        // Load containers in one round-trip with their existing widgets.
        var ids = grouped.Select(g => g.Key).ToHashSet();
        var containers = await db.CanvasItems
            .Include(c => c.Widgets)
            .Where(c => ids.Contains(c.Id))
            .ToListAsync(ct);
        var containerById = containers.ToDictionary(c => c.Id);

        foreach (var group in grouped)
        {
            if (!containerById.TryGetValue(group.Key, out var container))
                continue; // unknown container — drop silently
            if (!CanEdit(container, sub))
                continue; // not editable by caller — drop silently

            var kind = container is ProfileItem ? "profile" : "project";
            ApplyWidgetGroup(container, kind, [.. group]);
            container.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        return SaveResult.Ok(await GetStudioAsync(sub, ct));
    }

    /// <summary>Per-container apply: keeps matching widgets in place, inserts
    /// new ones, deletes any that weren't in the input set. Used as the inner
    /// loop of <see cref="SaveWidgetsAsync"/>.</summary>
    private void ApplyWidgetGroup(CanvasItem container, string kind, List<WidgetInput> inputs)
    {
        // Validation already done at the SaveWidgetsAsync boundary; here we
        // re-check kind because allowed-in depends on the container.
        foreach (var input in inputs)
        {
            if (!IsAllowed(input.Type, kind))
                throw new InvalidOperationException(
                    $"Widget type '{input.Type}' isn't allowed in a {kind} container.");
        }

        var existing = container.Widgets.ToDictionary(w => w.Id);
        var keptIds = new HashSet<Guid>(existing.Count);

        var orphanCandidates = inputs
            .Select(i => Guid.TryParse(i.Id, out var g) && !existing.ContainsKey(g) ? g : (Guid?)null)
            .Where(g => g.HasValue)
            .Select(g => g!.Value)
            .ToHashSet();
        var idsTakenElsewhere = orphanCandidates.Count == 0
            ? new HashSet<Guid>()
            : (db.Widgets
                .Where(w => orphanCandidates.Contains(w.Id) && w.CanvasItemId != container.Id)
                .Select(w => w.Id)
                .ToList()).ToHashSet();

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
                var newId = Guid.TryParse(input.Id, out var parsed) && !idsTakenElsewhere.Contains(parsed)
                    ? parsed
                    : Guid.NewGuid();
                container.Widgets.Add(new Widget
                {
                    Id = newId,
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
    }

    private static bool IsAllowed(string widgetType, string containerKind) =>
        WidgetAllowedIn.TryGetValue(widgetType, out var kinds) && kinds.Contains(containerKind);

    /// <summary>Edit rights: profile owner always; project creator + listed
    /// collaborators.</summary>
    private static bool CanEdit(CanvasItem container, string sub) => container switch
    {
        ProfileItem p => p.Auth0Sub == sub,
        ProjectItem pr => pr.Auth0Sub == sub || pr.CollaboratorSubs.Contains(sub),
        _ => false,
    };

    /// <summary>
    /// Creates a profile with a starter widget set. Each new profile gets its
    /// own horizontal slot offset by <see cref="ContainerColumnStride"/>.
    /// </summary>
    private async Task<ProfileItem> CreateProfileWithDefaultsAsync(string sub, CancellationToken ct)
    {
        var slot = await db.Profiles.CountAsync(ct);
        var colOffset = slot * ContainerColumnStride;

        var profile = new ProfileItem
        {
            Auth0Sub = sub,
            Name = "New profile",
            Role = "",
            Bio = "",
            Widgets =
            [
                MakeWidget("text", colOffset, 0, 5, 3, new { body = "A quote, a thought, a manifesto." }),
                MakeWidget("picture", colOffset + 5, 0, 4, 4, new { url = (string?)null, caption = "Caption" }),
                MakeWidget("video", colOffset, 3, 5, 3, new { url = (string?)null, title = "Video" }),
            ],
        };

        db.Profiles.Add(profile);
        await db.SaveChangesAsync(ct);
        return profile;
    }

    /// <summary>Seeds a single demo project the first time the studio is
    /// loaded so the new container kind has something to render. Anchored
    /// far enough to the right that it doesn't overlap profile slots.</summary>
    private async Task EnsureDefaultProjectAsync(CancellationToken ct)
    {
        if (await db.Projects.AnyAsync(ct)) return;

        // Anchor projects well to the right of the profile slots.
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
