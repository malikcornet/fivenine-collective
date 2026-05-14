using System.Text.Json;
using System.Text.Json.Serialization;
using FiveNine_Collective_Site.Data;

namespace FiveNine_Collective_Site_Server.Contracts;

/// <summary>Full studio snapshot returned by GET /api/studio.</summary>
public record StudioDto(
    string Id,
    int Version,
    string? CurrentProfileId,
    List<CanvasItemDto> CanvasItems,
    List<WidgetDto> Widgets,
    DateTimeOffset UpdatedAt);

/// <summary>
/// CanvasItem wire shape. The <see cref="Kind"/> discriminator tells the
/// client which template to render; per-kind fields are nullable on the
/// other kinds.
/// </summary>
[JsonPolymorphic(TypeDiscriminatorPropertyName = "kind")]
[JsonDerivedType(typeof(ProfileItemDto), "profile")]
[JsonDerivedType(typeof(ProjectItemDto), "project")]
public abstract record CanvasItemDto(
    Guid Id,
    string OwnerSub,
    string Name)
{
    // No manual "Kind" property here — [JsonPolymorphic] above injects the
    // "kind" discriminator into the wire shape automatically using the values
    // declared in [JsonDerivedType]. Defining one ourselves throws at
    // serializer-configure time.

    public static CanvasItemDto From(CanvasItem c) => c switch
    {
        ProfileItem p => new ProfileItemDto(p.Id, p.Auth0Sub, p.Name, p.Role, p.Bio),
        ProjectItem pr => new ProjectItemDto(
            pr.Id,
            pr.Auth0Sub,
            pr.Name,
            pr.Description,
            [.. pr.CollaboratorSubs]),
        _ => throw new InvalidOperationException($"Unknown CanvasItem subtype: {c.GetType().Name}"),
    };
}

public sealed record ProfileItemDto(
    Guid Id,
    string OwnerSub,
    string Name,
    string Role,
    string Bio)
    : CanvasItemDto(Id, OwnerSub, Name);

public sealed record ProjectItemDto(
    Guid Id,
    string OwnerSub,
    string Name,
    string Description,
    List<string> CollaboratorSubs)
    : CanvasItemDto(Id, OwnerSub, Name);

public record WidgetDto(
    string Id,
    Guid CanvasItemId,
    string CanvasItemKind,
    string Type,
    int Col,
    int Row,
    int W,
    int H,
    JsonElement Data)
{
    public static WidgetDto From(Widget w) => new(
        w.Id.ToString(),
        w.CanvasItemId,
        w.CanvasItem switch
        {
            ProfileItem => "profile",
            ProjectItem => "project",
            _ => "unknown",
        },
        w.Type,
        w.Col,
        w.Row,
        w.W,
        w.H,
        w.Data.RootElement.Clone());

    /// <summary>Variant used when the parent CanvasItem isn't loaded — caller
    /// supplies the kind explicitly (e.g. inside StudioService where we know
    /// it from the call site).</summary>
    public static WidgetDto FromWithKind(Widget w, string kind) => new(
        w.Id.ToString(),
        w.CanvasItemId,
        kind,
        w.Type,
        w.Col,
        w.Row,
        w.W,
        w.H,
        w.Data.RootElement.Clone());
}
