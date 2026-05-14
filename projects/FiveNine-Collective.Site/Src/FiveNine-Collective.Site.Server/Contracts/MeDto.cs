namespace FiveNine_Collective_Site_Server.Contracts;

/// <summary>Authenticated caller's profile state, used by the frontend to gate
/// onboarding.</summary>
public sealed record MeDto(
    string Sub,
    string? FirstName,
    string? LastName,
    bool Onboarded);

/// <summary>Payload posted by the onboarding wizard's final step.</summary>
public sealed record CompleteOnboardingRequest(string FirstName, string LastName);
