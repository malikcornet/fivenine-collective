using FiveNine_Collective_Site_Server.Application;
using FiveNine_Collective_Site_Server.Contracts;
using FiveNine_Collective_Site_Server.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FiveNine_Collective_Site_Server.Api;

[ApiController]
[Route("api/studio")]
public class StudioController(StudioService svc) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<StudioDto>> Get(CancellationToken ct)
    {
        var sub = User.Identity?.IsAuthenticated == true ? User.GetAuth0Sub() : null;
        return Ok(await svc.GetStudioAsync(sub, ct));
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
        return Ok(result.Studio);
    }
}
