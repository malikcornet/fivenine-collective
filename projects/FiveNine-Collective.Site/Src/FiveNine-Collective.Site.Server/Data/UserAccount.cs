namespace FiveNine_Collective_Site_Server.Data;

public class UserAccount
{
    public int Id { get; set; }

    /// <summary>Auth0 subject claim (e.g. "auth0|abc123")</summary>
    public required string Auth0Sub { get; set; }

    public required string FirstName { get; set; }

    public required string LastName { get; set; }

    public DateOnly? DateOfBirth { get; set; }

    public string? Bio { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
