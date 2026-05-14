using System.Text.Json;

namespace FiveNine_Collective_Site_Server.Contracts;

/// <summary>
/// Payload for PUT /api/studio/widgets — the caller's full widget set across
/// every container they can edit (their own profile, plus any project they
/// collaborate in). Server replaces each container's widgets independently.
/// </summary>
public record UpdateWidgetsRequest(List<WidgetInput> Widgets);

/// <summary>
/// Client widget representation. <see cref="Id"/> is either a server-issued GUID
/// (existing widget, preserved) or a "draft-*" id (new widget, server mints a GUID).
/// </summary>
public record WidgetInput(
    string Id,
    Guid CanvasItemId,
    string Type,
    int Col,
    int Row,
    int W,
    int H,
    JsonElement Data);
