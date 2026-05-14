using Aspire.Hosting.ApplicationModel;
using Microsoft.Extensions.DependencyInjection;

var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres")
    .WithPgAdmin()
    .WithLifetime(ContainerLifetime.Persistent);

var db = postgres.AddDatabase("fiveninedb");

var storageUser = builder.AddParameter("storage-user", "minioadmin");
var storagePassword = builder.AddParameter("storage-password", "minioadmin", secret: true);

var storage = builder.AddMinioContainer("storage", storageUser, storagePassword)
    .WithLifetime(ContainerLifetime.Persistent)
    .WithDataVolume();

// One-shot migrator. Runs to completion before the server starts so the
// schema is always current when traffic hits the API. Same lifecycle on
// Railway is enforced via the preDeployCommand.
var migrator = builder.AddProject<Projects.FiveNine_Collective_Site_Migrations>("migrator")
    .WithReference(db)
    .WaitFor(db);

// Optional seeder. Same binary as the migrator with `--seed-only`; nested
// under it in the dashboard via WithParentRelationship and not auto-started
// (WithExplicitStart) — click "Start" on the dashboard to insert the demo
// project. Idempotent: re-running is a no-op once any project exists.
var seeder = builder.AddProject<Projects.FiveNine_Collective_Site_Migrations>("seeder")
    .WithReference(db)
    .WithArgs("--seed-only", "--confirm-wipe")
    .WaitForCompletion(migrator)
    .WithParentRelationship(migrator)
    .WithExplicitStart();

// Dashboard button on the database: wipes CanvasItems and re-runs the seeder.
// Delegates to the seeder resource's built-in `resource-start` command so the
// actual work still happens inside the migrator binary (one source of truth
// for seed logic). Enabled only once Postgres is healthy.
db.WithCommand(
    name: "reseed-database",
    displayName: "Reseed database",
    executeCommand: async ctx =>
    {
        var commands = ctx.ServiceProvider.GetRequiredService<ResourceCommandService>();
        return await commands.ExecuteCommandAsync(
            seeder.Resource,
            "resource-start",
            ctx.CancellationToken);
    },
    commandOptions: new CommandOptions
    {
        Description = "Truncates CanvasItems and inserts fresh demo data (6 fake profiles + demo project).",
        ConfirmationMessage = "This wipes all canvas data. Continue?",
        IconName = "DatabaseArrowRight",
        IconVariant = IconVariant.Filled,
        UpdateState = ctx => ctx.ResourceSnapshot.HealthStatus is Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Healthy
            ? ResourceCommandState.Enabled
            : ResourceCommandState.Disabled,
    });

var server = builder.AddProject<Projects.FiveNine_Collective_Site_Server>("server")
    .WithReference(db)
    .WaitForCompletion(migrator)
    .WithReference(storage)
    .WaitFor(storage)
    .WithHttpHealthCheck("/health")
    .WithExternalHttpEndpoints();

var webfrontend = builder.AddViteApp("webfrontend", "../frontend")
    .WithEndpoint("http", e => { e.Port = 5173; e.IsProxied = false; })
    .WithReference(server)
    .WaitFor(server);

server.PublishWithContainerFiles(webfrontend, "wwwroot");
builder.Build().Run();
