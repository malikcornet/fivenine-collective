# Multi-stage build for Railway. Produces a single image that contains:
#   /app/server/     — the ASP.NET server (entrypoint)
#   /app/migrator/   — the one-shot migrator binary (invoked via preDeployCommand)
#   /app/server/wwwroot/ — the Vite-built frontend
#
# railway.toml drives the deploy: preDeployCommand runs the migrator against
# the production DB before traffic cuts over; startCommand boots the server.

# ── Frontend build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS frontend
WORKDIR /src
COPY Src/frontend/package*.json ./
RUN npm ci
COPY Src/frontend/ ./
RUN npm run build
# Output lands in /src/dist

# ── .NET build + publish ────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS dotnet-build
WORKDIR /src

# Copy only the csprojs first so restore is cached separately from source.
COPY Src/FiveNine-Collective.Site.Data/FiveNine-Collective.Site.Data.csproj           FiveNine-Collective.Site.Data/
COPY Src/FiveNine-Collective.Site.Server/FiveNine-Collective.Site.Server.csproj       FiveNine-Collective.Site.Server/
COPY Src/FiveNine-Collective.Site.Migrations/FiveNine-Collective.Site.Migrations.csproj FiveNine-Collective.Site.Migrations/
RUN dotnet restore FiveNine-Collective.Site.Server/FiveNine-Collective.Site.Server.csproj \
 && dotnet restore FiveNine-Collective.Site.Migrations/FiveNine-Collective.Site.Migrations.csproj

# Now copy the actual source and publish.
COPY Src/FiveNine-Collective.Site.Data/      FiveNine-Collective.Site.Data/
COPY Src/FiveNine-Collective.Site.Server/    FiveNine-Collective.Site.Server/
COPY Src/FiveNine-Collective.Site.Migrations/ FiveNine-Collective.Site.Migrations/

RUN dotnet publish FiveNine-Collective.Site.Server/FiveNine-Collective.Site.Server.csproj \
        -c Release -o /publish/server --no-restore \
 && dotnet publish FiveNine-Collective.Site.Migrations/FiveNine-Collective.Site.Migrations.csproj \
        -c Release -o /publish/migrator --no-restore

# ── Runtime image ───────────────────────────────────────────────────────────
# Chiseled variant: ~40 MB vs ~200 MB for the standard image. No shell, no
# package manager — just the .NET runtime and ICU. Fine for a self-contained
# ASP.NET process that doesn't shell out. Smaller image = less registry
# storage and faster cold starts on Railway.
FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview-noble-chiseled AS runtime
WORKDIR /app

# Server (the entrypoint for the running service) and the frontend it serves.
COPY --from=dotnet-build /publish/server /app/server
COPY --from=frontend     /src/dist       /app/server/wwwroot

# Migrator binary lives in the same image so Railway's preDeployCommand can
# invoke it against the production DB before each deploy goes live.
COPY --from=dotnet-build /publish/migrator /app/migrator

# Railway sets PORT at runtime; ASP.NET reads ASPNETCORE_URLS.
ENV ASPNETCORE_URLS=http://+:${PORT:-8080}
EXPOSE 8080

WORKDIR /app/server
ENTRYPOINT ["dotnet", "FiveNine-Collective.Site.Server.dll"]
