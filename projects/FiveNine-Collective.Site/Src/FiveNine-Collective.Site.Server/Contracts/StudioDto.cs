using System.Text.Json;
using FiveNine_Collective_Site_Server.Data;

namespace FiveNine_Collective_Site_Server.Contracts;

/// <summary>Full studio snapshot returned by GET /api/studio.</summary>
public record StudioDto(
    string Id,
    int Version,
    string? CurrentProfileId,
    List<ProfileDto> Profiles,
    List<WidgetDto> Widgets,
    DateTimeOffset UpdatedAt);

public record ProfileDto(Guid Id, string OwnerSub, string Name, string Role, string Bio)
{
    public static ProfileDto From(Profile p) => new(p.Id, p.Auth0Sub, p.Name, p.Role, p.Bio);
}

public record WidgetDto(
    string Id,
    Guid ProfileId,
    string Type,
    int Col,
    int Row,
    int W,
    int H,
    JsonElement Data)
{
    public static WidgetDto From(Widget w) => new(
        w.Id.ToString(),
        w.ProfileId,
        w.Type,
        w.Col,
        w.Row,
        w.W,
        w.H,
        w.Data.RootElement.Clone());
}
