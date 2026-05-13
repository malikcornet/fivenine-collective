using Amazon.Runtime;
using Amazon.S3;

namespace FiveNine_Collective_Site_Server.Infrastructure.Storage;

public static class StorageRegistration
{
    public static IServiceCollection AddObjectStorage(this IServiceCollection services, IConfiguration configuration)
    {
        var options = StorageOptions.FromConfiguration(configuration);
        services.AddSingleton(options);
        services.AddSingleton<IAmazonS3>(_ =>
        {
            var credentials = new BasicAWSCredentials(options.AccessKey, options.SecretKey);
            var config = new AmazonS3Config
            {
                ServiceURL = options.Endpoint,
                ForcePathStyle = options.ForcePathStyle,
                AuthenticationRegion = options.Region,
            };
            return new AmazonS3Client(credentials, config);
        });
        return services;
    }
}

public sealed record StorageOptions(string Endpoint, string AccessKey, string SecretKey, string Bucket, string Region, bool ForcePathStyle)
{
    public static StorageOptions FromConfiguration(IConfiguration configuration)
    {
        // Local dev: AppHost injects ConnectionStrings:storage as "Endpoint=...;AccessKey=...;SecretKey=..."
        // Production (Railway): values come from environment variables provisioned by the Bucket service.
        var bucket = configuration["Storage:Bucket"] ?? configuration["BUCKET"] ?? "fivenine";
        var region = configuration["Storage:Region"] ?? configuration["REGION"] ?? "auto";

        var connection = configuration.GetConnectionString("storage");
        if (!string.IsNullOrWhiteSpace(connection))
        {
            var parts = connection.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(p => p.Split('=', 2))
                .Where(p => p.Length == 2)
                .ToDictionary(p => p[0], p => p[1], StringComparer.OrdinalIgnoreCase);

            return new StorageOptions(
                Endpoint: parts.GetValueOrDefault("Endpoint", "http://localhost:9000"),
                AccessKey: parts.GetValueOrDefault("AccessKey", "minioadmin"),
                SecretKey: parts.GetValueOrDefault("SecretKey", "minioadmin"),
                Bucket: bucket,
                Region: region,
                ForcePathStyle: true);
        }

        return new StorageOptions(
            Endpoint: configuration["ENDPOINT"] ?? throw new InvalidOperationException("Storage endpoint not configured"),
            AccessKey: configuration["ACCESS_KEY_ID"] ?? throw new InvalidOperationException("Storage ACCESS_KEY_ID not configured"),
            SecretKey: configuration["SECRET_ACCESS_KEY"] ?? throw new InvalidOperationException("Storage SECRET_ACCESS_KEY not configured"),
            Bucket: bucket,
            Region: region,
            ForcePathStyle: false);
    }
}
