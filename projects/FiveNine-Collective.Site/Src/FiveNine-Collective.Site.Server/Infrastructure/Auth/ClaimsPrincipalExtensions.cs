using System.Security.Claims;

namespace FiveNine_Collective_Site_Server.Infrastructure.Auth;

/// <summary>
/// Helpers for reading Auth0 identity claims from a <see cref="ClaimsPrincipal"/>.
/// </summary>
public static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// Returns the Auth0 subject claim (<c>sub</c>), or <c>null</c> when the claim is absent.
    /// Auth0 maps the subject to either the standard NameIdentifier or the raw "sub" claim
    /// depending on JWT middleware configuration; this method handles both.
    /// </summary>
    public static string? GetAuth0Sub(this ClaimsPrincipal user) =>
        user.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? user.FindFirstValue("sub");
}
