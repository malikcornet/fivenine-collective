namespace FiveNine_Collective_Site_Server.Contracts;

/// <summary>Request body for <c>POST /api/account/onboard</c>.</summary>
public record OnboardRequest(
    string FirstName,
    string LastName,
    string? DisplayName,
    DateOnly DateOfBirth,
    string? Bio);
