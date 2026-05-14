namespace FiveNine_Collective_Site_Server.Infrastructure.Http;

/// <summary>
/// Registers a CORS default policy populated from the <c>ALLOWED_ORIGINS</c>
/// environment variable (comma-separated list of origin URLs).
/// </summary>
public static class CorsExtensions
{
    public static IServiceCollection AddCorsFromConfig(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var allowedOrigins = configuration["ALLOWED_ORIGINS"]?.Split(',') ?? [];

        services.AddCors(options =>
            options.AddDefaultPolicy(policy =>
                policy
                    .WithOrigins(allowedOrigins)
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials()));

        return services;
    }
}
