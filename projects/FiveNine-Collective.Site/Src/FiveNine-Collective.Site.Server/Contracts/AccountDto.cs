using FiveNine_Collective_Site_Server.Data;

namespace FiveNine_Collective_Site_Server.Contracts;

/// <summary>
/// Public representation of a user account returned by the API.
/// Intentionally omits internal fields such as <see cref="UserAccount.Id"/>
/// and <see cref="UserAccount.Auth0Sub"/>.
/// </summary>
public record AccountDto(
    string FirstName,
    string LastName,
    string? DisplayName,
    DateOnly? DateOfBirth,
    string? Bio,
    string? WebsiteUrl,
    string? PageHtml,
    List<string> Tags,
    DateTimeOffset CreatedAt)
{
    /// <summary>Maps a <see cref="UserAccount"/> entity to its public DTO representation.</summary>
    public static AccountDto From(UserAccount account) => new(
        account.FirstName,
        account.LastName,
        account.DisplayName,
        account.DateOfBirth,
        account.Bio,
        account.WebsiteUrl,
        account.PageHtml,
        account.Tags,
        account.CreatedAt);
}
