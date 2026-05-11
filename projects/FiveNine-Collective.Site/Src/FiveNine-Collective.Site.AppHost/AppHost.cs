var builder = DistributedApplication.CreateBuilder(args);

var server = builder.AddProject<Projects.FiveNine_Collective_Site_Server>("server")
    .WithHttpHealthCheck("/health")
    .WithExternalHttpEndpoints();

var webfrontend = builder.AddViteApp("webfrontend", "../frontend")
    .WithEndpoint("http", e => e.Port = 5173)
    .WithReference(server)
    .WaitFor(server);

server.PublishWithContainerFiles(webfrontend, "wwwroot");
builder.Build().Run();
