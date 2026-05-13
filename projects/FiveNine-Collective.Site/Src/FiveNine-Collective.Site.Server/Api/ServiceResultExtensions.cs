using FiveNine_Collective_Site_Server.Application;
using Microsoft.AspNetCore.Mvc;

namespace FiveNine_Collective_Site_Server.Api;

/// <summary>
/// Maps <see cref="ServiceResult"/> discriminated union values to MVC
/// <see cref="IActionResult"/> HTTP responses.
/// </summary>
internal static class ServiceResultExtensions
{
    internal static IActionResult ToActionResult(this ServiceResult result) => result switch
    {
        ServiceResult.OkResult => new NoContentResult(),
        ServiceResult.NotFoundResult => new NotFoundResult(),
        ServiceResult.ConflictResult c => new ConflictObjectResult(c.Message),
        ServiceResult.ValidationErrorResult v => new BadRequestObjectResult(
            new ValidationProblemDetails(new Dictionary<string, string[]> { [v.Field] = [v.Message] })),
        _ => new StatusCodeResult(500),
    };
}
