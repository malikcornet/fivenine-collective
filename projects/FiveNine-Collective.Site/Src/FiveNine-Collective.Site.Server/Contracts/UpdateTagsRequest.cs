namespace FiveNine_Collective_Site_Server.Contracts;

/// <summary>Request body for <c>PUT /api/account/tags</c>.</summary>
public record UpdateTagsRequest(List<string> Tags);
