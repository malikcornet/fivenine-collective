using FiveNine_Collective_Site_Server.Application;
using FiveNine_Collective_Site_Server.Contracts;
using FiveNine_Collective_Site_Server.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FiveNine_Collective_Site_Server.Api;

[ApiController]
[Route("api/account")]
[Authorize]
public class AccountController : ControllerBase
{
    private readonly AccountService _svc;

    public AccountController(AccountService svc) => _svc = svc;

    [HttpGet("me")]
    public async Task<IActionResult> GetMyAccount(CancellationToken ct)
    {
        var sub = User.GetAuth0Sub();
        if (sub is null) return Unauthorized();

        var account = await _svc.FindBySubAsync(sub, ct);
        return account is null
            ? NotFound()
            : Ok(AccountDto.From(account));
    }

    [HttpPost("onboard")]
    public async Task<IActionResult> Onboard([FromBody] OnboardRequest req, CancellationToken ct)
    {
        var sub = User.GetAuth0Sub();
        if (sub is null) return Unauthorized();

        var account = await _svc.CreateAsync(sub, req, ct);
        return account is null
            ? Conflict("Account already exists.")
            : Created("/api/account/me", AccountDto.From(account));
    }

    [HttpPut("page")]
    public async Task<IActionResult> UpdatePage([FromBody] UpdatePageRequest req, CancellationToken ct)
    {
        var sub = User.GetAuth0Sub();
        if (sub is null) return Unauthorized();

        return (await _svc.UpdatePageAsync(sub, req.Html, ct)).ToActionResult();
    }

    [HttpPut("website")]
    public async Task<IActionResult> UpdateWebsite([FromBody] UpdateWebsiteRequest req, CancellationToken ct)
    {
        var sub = User.GetAuth0Sub();
        if (sub is null) return Unauthorized();

        return (await _svc.UpdateWebsiteAsync(sub, req.Url, ct)).ToActionResult();
    }

    [HttpPut("tags")]
    public async Task<IActionResult> UpdateTags([FromBody] UpdateTagsRequest req, CancellationToken ct)
    {
        var sub = User.GetAuth0Sub();
        if (sub is null) return Unauthorized();

        return (await _svc.UpdateTagsAsync(sub, req.Tags, ct)).ToActionResult();
    }
}
