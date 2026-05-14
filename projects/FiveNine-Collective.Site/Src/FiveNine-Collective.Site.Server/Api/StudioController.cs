using FiveNine_Collective_Site_Server.Application;
using FiveNine_Collective_Site_Server.Contracts;
using FiveNine_Collective_Site_Server.Infrastructure.Auth;
using FiveNine_Collective_Site_Server.Realtime;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace FiveNine_Collective_Site_Server.Api;

[ApiController]
[Route("api/studio")]
public class StudioController(
    StudioService svc,
    IHubContext<StudioHub, IStudioClient> hub) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<StudioDto>> Get(CancellationToken ct)
    {
        var sub = User.Identity?.IsAuthenticated == true ? User.GetAuth0Sub() : null;
        return Ok(await svc.GetStudioAsync(sub, ct));
    }

    [HttpPost("widgets")]
    [Authorize]
    public async Task<ActionResult<WidgetDto>> CreateWidget(
        [FromBody] WidgetInput req,
        CancellationToken ct)
    {
        var sub = User.GetAuth0Sub();
        if (sub is null) return Unauthorized();

        var result = await svc.CreateWidgetAsync(sub, req, ct);
        if (result.Validation)
        {
            ModelState.AddModelError(result.Field!, result.Message!);
            return ValidationProblem(ModelState);
        }

        var widget = result.Widget!;
        await hub.Clients.Group(StudioHub.Room).WidgetUpserted(widget);
        return Ok(widget);
    }

    [HttpPut("widgets")]
    [Authorize]
    public async Task<ActionResult<StudioDto>> ReplaceMyWidgets(
        [FromBody] UpdateWidgetsRequest req,
        CancellationToken ct)
    {
        var sub = User.GetAuth0Sub();
        if (sub is null) return Unauthorized();

        var result = await svc.ReplaceMyWidgetsAsync(sub, req.Widgets, ct);
        if (result.Validation)
        {
            ModelState.AddModelError(result.Field!, result.Message!);
            return ValidationProblem(ModelState);
        }

        var studio = result.Studio!;
        // Fan out one WidgetsChanged per touched container. We don't know
        // exactly which containers were touched after the save, so broadcast
        // for every container that has at least one widget in the input set.
        var touchedIds = req.Widgets
            .Select(w => w.CanvasItemId)
            .Where(id => id != Guid.Empty)
            .Distinct()
            .ToList();
        if (touchedIds.Count == 0 && Guid.TryParse(studio.CurrentProfileId, out var pid))
            touchedIds.Add(pid);

        foreach (var cid in touchedIds)
        {
            var widgets = studio.Widgets.Where(w => w.CanvasItemId == cid).ToList();
            await hub.Clients.Group(StudioHub.Room).WidgetsChanged(cid, widgets);
        }

        return Ok(studio);
    }
}
