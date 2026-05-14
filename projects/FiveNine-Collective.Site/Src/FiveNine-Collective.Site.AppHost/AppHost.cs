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
builder.AddProject<Projects.FiveNine_Collective_Site_Migrations>("seeder")
    .WithReference(db)
    .WithArgs("--seed-only", "--confirm-wipe")
    .WaitForCompletion(migrator)
    .WithParentRelationship(migrator)
    .WithExplicitStart();

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
