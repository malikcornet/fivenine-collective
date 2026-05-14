using FiveNine_Collective_Site.Data;
using FiveNine_Collective_Site_Server.Application;
using FiveNine_Collective_Site_Server.Contracts;
using FiveNine_Collective_Site_Server.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiveNine_Collective_Site_Server.Api;

[ApiController]
[Route("api/me")]
[Authorize]
public class MeController(AppDbContext db, StudioService studio) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<MeDto>> Get(CancellationToken ct)
    {
        var sub = User.GetAuth0Sub();
        if (sub is null) return Unauthorized();

        // Reuse the studio's auto-create-on-first-load behavior so a brand new
        // user gets a ProfileItem row before they hit onboarding.
        await studio.GetStudioAsync(sub, ct);

        var profile = await db.Profiles.AsNoTracking().SingleAsync(p => p.Auth0Sub == sub, ct);
        return Ok(new MeDto(
            Sub: sub,
            FirstName: profile.FirstName,
            LastName: profile.LastName,
            Onboarded: profile.OnboardedAt is not null));
    }

    [HttpPost("onboarding")]
    public async Task<ActionResult<MeDto>> CompleteOnboarding(
        [FromBody] CompleteOnboardingRequest req,
        CancellationToken ct)
    {
        var sub = User.GetAuth0Sub();
        if (sub is null) return Unauthorized();

        var firstName = (req.FirstName ?? "").Trim();
        var lastName = (req.LastName ?? "").Trim();
        if (firstName.Length == 0)
        {
            ModelState.AddModelError(nameof(req.FirstName), "First name is required.");
            return ValidationProblem(ModelState);
        }
        if (lastName.Length == 0)
        {
            ModelState.AddModelError(nameof(req.LastName), "Last name is required.");
            return ValidationProblem(ModelState);
        }
        if (firstName.Length > 80 || lastName.Length > 80)
        {
            ModelState.AddModelError("name", "Names must be 80 characters or fewer.");
            return ValidationProblem(ModelState);
        }

        await studio.GetStudioAsync(sub, ct);
        var profile = await db.Profiles.SingleAsync(p => p.Auth0Sub == sub, ct);
        profile.FirstName = firstName;
        profile.LastName = lastName;
        profile.Name = $"{firstName} {lastName}";
        profile.OnboardedAt = DateTimeOffset.UtcNow;
        profile.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        return Ok(new MeDto(sub, profile.FirstName, profile.LastName, Onboarded: true));
    }
}
