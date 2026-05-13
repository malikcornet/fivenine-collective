namespace FiveNine_Collective_Site_Server.Application;

/// <summary>
/// Discriminated union that represents the outcome of an application-layer operation.
/// Route handlers map this to the appropriate HTTP result — keeping HTTP concerns
/// out of the application layer.
/// </summary>
public abstract record ServiceResult
{
    public static ServiceResult Ok() => new OkResult();
    public static ServiceResult NotFound() => new NotFoundResult();
    public static ServiceResult Conflict(string message) => new ConflictResult(message);
    public static ServiceResult ValidationError(string field, string message) =>
        new ValidationErrorResult(field, message);

    /// <summary>The operation succeeded with no data to return (204 No Content).</summary>
    public sealed record OkResult : ServiceResult;

    /// <summary>The requested resource does not exist (404 Not Found).</summary>
    public sealed record NotFoundResult : ServiceResult;

    /// <summary>The operation conflicts with existing data (409 Conflict).</summary>
    public sealed record ConflictResult(string Message) : ServiceResult;

    /// <summary>A field failed validation (422 Unprocessable Entity / ValidationProblem).</summary>
    public sealed record ValidationErrorResult(string Field, string Message) : ServiceResult;
}
