using FiveNine_Collective_Site_Server.Contracts;
using Microsoft.AspNetCore.SignalR;

namespace FiveNine_Collective_Site_Server.Realtime;

public sealed record CursorPosition(double X, double Y);

public interface IStudioClient
{
    Task PeerJoined(string peerId, string? displayName);
    Task PeerLeft(string peerId);
    Task CursorMoved(string peerId, CursorPosition pos);
    /// <summary>Fired when one container's widget set is replaced wholesale
    /// (PUT). <paramref name="canvasItemId"/> identifies the container; the
    /// list contains the new authoritative widgets for that container.</summary>
    Task WidgetsChanged(Guid canvasItemId, IReadOnlyList<WidgetDto> widgets);
    Task WidgetUpserted(WidgetDto widget);
}

/// <summary>
/// Single-room hub for the shared studio. Anonymous viewers may join to
/// receive updates and broadcast cursors; widget writes still go through
/// the REST endpoint which then fans out via <see cref="IStudioClient.WidgetsChanged"/>.
/// </summary>
public sealed class StudioHub : Hub<IStudioClient>
{
    public const string Room = "studio";

    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, Room);
        var name = Context.User?.Identity?.IsAuthenticated == true
            ? Context.User.Identity.Name
            : null;
        await Clients.OthersInGroup(Room).PeerJoined(Context.ConnectionId, name);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await Clients.OthersInGroup(Room).PeerLeft(Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    public Task Cursor(CursorPosition pos) =>
        Clients.OthersInGroup(Room).CursorMoved(Context.ConnectionId, pos);
}
