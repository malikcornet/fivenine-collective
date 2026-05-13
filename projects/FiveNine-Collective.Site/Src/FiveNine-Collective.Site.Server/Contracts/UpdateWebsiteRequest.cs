namespace FiveNine_Collective_Site_Server.Contracts;

/// <summary>Request body for <c>PUT /api/account/website</c>.</summary>
public record UpdateWebsiteRequest(string? Url);
