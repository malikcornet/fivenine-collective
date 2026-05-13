using FiveNine_Collective_Site_Server.Contracts;
using FiveNine_Collective_Site_Server.Data;
using FiveNine_Collective_Site_Server.Domain;
using Ganss.Xss;
using Microsoft.EntityFrameworkCore;

namespace FiveNine_Collective_Site_Server.Application;

/// <summary>
/// Application-layer service for account operations.
/// Contains all business logic; has no knowledge of HTTP or routing.
/// </summary>
public sealed class AccountService(AppDbContext db, HtmlSanitizer sanitizer)
{
    /// <summary>
    /// Returns the account for the given Auth0 sub, or <c>null</c> if not found.
    /// </summary>
    public Task<UserAccount?> FindBySubAsync(string sub, CancellationToken ct = default) =>
        db.UserAccounts.SingleOrDefaultAsync(a => a.Auth0Sub == sub, ct);

    /// <summary>
    /// Creates a new account for the given Auth0 sub.
    /// Returns <c>null</c> when an account already exists (caller should respond with 409).
    /// </summary>
    public async Task<UserAccount?> CreateAsync(
        string sub,
        OnboardRequest req,
        CancellationToken ct = default)
    {
        if (await db.UserAccounts.AnyAsync(a => a.Auth0Sub == sub, ct))
            return null;

        var account = new UserAccount
        {
            Auth0Sub = sub,
            FirstName = req.FirstName.Trim(),
            LastName = req.LastName.Trim(),
            DisplayName = req.DisplayName?.Trim(),
            DateOfBirth = req.DateOfBirth,
            Bio = req.Bio?.Trim(),
        };

        db.UserAccounts.Add(account);
        await db.SaveChangesAsync(ct);
        return account;
    }

    /// <summary>
    /// Replaces the user's custom page HTML (sanitised) or clears it when <c>null</c>.
    /// </summary>
    public async Task<ServiceResult> UpdatePageAsync(
        string sub,
        string? html,
        CancellationToken ct = default)
    {
        if (html is { Length: > 512_000 })
            return ServiceResult.ValidationError("html", "Page HTML must be under 500 KB.");

        var account = await FindBySubAsync(sub, ct);
        if (account is null) return ServiceResult.NotFound();

        account.PageHtml = html is null ? null : sanitizer.SanitizeDocument(html);
        await db.SaveChangesAsync(ct);
        return ServiceResult.Ok();
    }

    /// <summary>
    /// Sets the user's website URL after validating that it is an absolute http/https URL,
    /// or clears it when <c>null</c>.
    /// </summary>
    public async Task<ServiceResult> UpdateWebsiteAsync(
        string sub,
        string? url,
        CancellationToken ct = default)
    {
        var trimmed = url?.Trim();

        if (trimmed is not null &&
            (!Uri.TryCreate(trimmed, UriKind.Absolute, out var parsed) ||
             parsed.Scheme is not ("http" or "https")))
        {
            return ServiceResult.ValidationError("url", "Website URL must be a valid http or https URL.");
        }

        var account = await FindBySubAsync(sub, ct);
        if (account is null) return ServiceResult.NotFound();

        account.WebsiteUrl = trimmed;
        await db.SaveChangesAsync(ct);
        return ServiceResult.Ok();
    }

    /// <summary>
    /// Replaces the user's tag list, validating every tag against the canonical allowed set.
    /// </summary>
    public async Task<ServiceResult> UpdateTagsAsync(
        string sub,
        List<string> tags,
        CancellationToken ct = default)
    {
        if (!TagDefinitions.AllValid(tags))
            return ServiceResult.ValidationError("tags", "One or more tags are not in the allowed set.");

        var account = await FindBySubAsync(sub, ct);
        if (account is null) return ServiceResult.NotFound();

        account.Tags = tags;
        await db.SaveChangesAsync(ct);
        return ServiceResult.Ok();
    }
}
