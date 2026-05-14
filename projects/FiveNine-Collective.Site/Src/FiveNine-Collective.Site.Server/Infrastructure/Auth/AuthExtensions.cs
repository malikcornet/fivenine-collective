using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace FiveNine_Collective_Site_Server.Infrastructure.Auth;

/// <summary>
/// Registers Auth0 JWT bearer authentication with settings from <c>appsettings.json</c>.
/// </summary>
public static class AuthExtensions
{
    public static IServiceCollection AddAuth0(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.Authority = $"https://{configuration["Auth0:Domain"]}/";
                options.Audience = configuration["Auth0:Audience"];
                // WebSockets can't set Authorization headers, so SignalR clients
                // pass the access token as a query string on hub paths.
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = ctx =>
                    {
                        var token = ctx.Request.Query["access_token"];
                        if (!string.IsNullOrEmpty(token) &&
                            ctx.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                        {
                            ctx.Token = token;
                        }
                        return Task.CompletedTask;
                    },
                };
            });

        services.AddAuthorization();

        return services;
    }
}
