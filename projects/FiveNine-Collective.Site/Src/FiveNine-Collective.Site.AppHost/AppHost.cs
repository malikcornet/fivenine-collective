var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres")
    .WithPgAdmin()
    .WithLifetime(ContainerLifetime.Persistent);

var db = postgres.AddDatabase("fiveninedb");

var server = builder.AddProject<Projects.FiveNine_Collective_Site_Server>("server")
    .WithReference(db)
    .WaitFor(db)
    .WithHttpHealthCheck("/health")
    .WithExternalHttpEndpoints();

var webfrontend = builder.AddViteApp("webfrontend", "../frontend")
    .WithEndpoint("http", e => { e.Port = 5173; e.IsProxied = false; })
    .WithReference(server)
    .WaitFor(server);

server.PublishWithContainerFiles(webfrontend, "wwwroot");
builder.Build().Run();
