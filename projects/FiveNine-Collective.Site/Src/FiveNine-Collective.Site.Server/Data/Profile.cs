namespace FiveNine_Collective_Site_Server.Data;

public class Profile
{
    public Guid Id { get; set; }

    /// <summary>Auth0 subject claim of the profile owner (e.g. "auth0|abc123").</summary>
    public required string Auth0Sub { get; set; }

    /// <summary>Display name shown in the studio identity layer and breadcrumb.</summary>
    public string Name { get; set; } = "";

    /// <summary>Short role/title line under the name.</summary>
    public string Role { get; set; } = "";

    /// <summary>One-line bio.</summary>
    public string Bio { get; set; } = "";

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public List<Widget> Widgets { get; set; } = [];
}
