# FiveNine Collective — Agent Guidance

## Working conventions

- Always write files directly to the user's checked-out working directory (`projects/FiveNine-Collective.Site/`). Never use agent-managed worktree or sandbox paths.
- Work on whatever branch the user currently has checked out — do not create or switch to a separate branch.

## Project layout

```
projects/FiveNine-Collective.Site/Src/
  frontend/          # React/Vite SPA (Auth0 PKCE, TypeScript)
  FiveNine-Collective.Site.Server/   # ASP.NET Core API (JWT bearer auth)
  FiveNine-Collective.Site.AppHost/  # .NET Aspire orchestration host
```

## Infrastructure

### Railway

- **Dashboard**: https://railway.com/project/ecb8f37f-247c-460f-a422-fb4feace116b?environmentId=fbb7e678-710f-4500-8af1-52fa9f5e01b4
- **Project ID**: `ecb8f37f-247c-460f-a422-fb4feace116b`
- **Environment ID** (production): `fbb7e678-710f-4500-8af1-52fa9f5e01b4`
- **frontend service** — `https://frontend-production-b973e.up.railway.app`
- **server service** — `https://server-production-fa4f.up.railway.app`

Use the `railway:use-railway` skill for Railway operations. Always pass explicit project/environment IDs rather than relying on `railway link`.

**Variable convention — never hardcode URLs between services.** Use Railway template references so the dashboard shows dependency arrows and values stay in sync automatically:

```
# Good — reference another service's variable
VITE_API_URL=https://${{server.RAILWAY_PUBLIC_DOMAIN}}
ConnectionStrings__fiveninedb=Host=${{Postgres.PGHOST}};...

# Bad — hardcoded URL
VITE_API_URL=https://server-production-fa4f.up.railway.app
```

Use `${{ServiceName.RAILWAY_PRIVATE_DOMAIN}}` for server-to-server connections (avoids egress fees). Use `${{ServiceName.RAILWAY_PUBLIC_DOMAIN}}` only when the connection originates outside Railway's network (e.g. a browser SPA calling an API).

### Auth0

- **Dashboard**: https://manage.auth0.com/dashboard/eu/fivenine/
- **Tenant**: `fivenine` (EU region) — domain `fivenine.eu.auth0.com`
- **SPA application**: "FiveNine Collective" — client ID `N5BHrtQZDyKpENk8HlfZhENmDNvkskoG`
- **API (resource server)**: "FiveNine Collective API" — identifier `https://api.fivenine.collective`

Use the `mcp__auth0__*` tools for Auth0 operations (list/get/update applications, resource servers, etc.).

#### Auth0 SPA app — allowed URLs (keep in sync when adding domains)

| List | Values |
|---|---|
| Callbacks | `http://localhost:5173`, `http://localhost:5173/callback`, `http://webfrontend-fivenine_collective_site.dev.localhost:5173`, `http://webfrontend-fivenine_collective_site.dev.localhost:5173/callback`, `https://frontend-production-b973e.up.railway.app`, `https://frontend-production-b973e.up.railway.app/callback` |
| Logout URLs | `http://localhost:5173`, `http://webfrontend-fivenine_collective_site.dev.localhost:5173`, `https://frontend-production-b973e.up.railway.app` |
| Web Origins | `http://localhost:5173`, `http://webfrontend-fivenine_collective_site.dev.localhost:5173`, `https://frontend-production-b973e.up.railway.app` |

#### Auth0 SPA app — refresh tokens

Refresh Token Rotation is **enabled** (`rotation_type: rotating`, 30-day lifetime, 15-day idle). The frontend sets `useRefreshTokens={true}` and `cacheLocation="localstorage"`. If you see `feacft` failures in Auth0 logs about rotating refresh tokens, rotation has been disabled — re-enable it via the Auth0 MCP or dashboard.

## Local development

Start the AppHost from Visual Studio using the **https** profile. This orchestrates all services via .NET Aspire.

### Fixed local ports (https profile — set in `Src/FiveNine-Collective.Site.AppHost/Properties/launchSettings.json`)

| Service | URL |
|---|---|
| Aspire Dashboard | `https://fivenine_collective_site.dev.localhost:17162` |
| Backend API | `https://server-fivenine_collective_site.dev.localhost:7377` |
| Frontend | `http://webfrontend-fivenine_collective_site.dev.localhost:5173` |

The Vite dev server proxies `/api/*` to the backend using `SERVER_HTTPS` / `SERVER_HTTP` env vars injected by Aspire.

### Aspire MCP

The `.mcp.json` configures `aspire mcp start` (stdio transport) — the MCP server starts automatically, no manual command needed.

**Version requirement**: The Aspire CLI and AppHost SDK must match. Both are currently **13.3.0**. If you see `GetDashboardUrlsAsync` or `GetResourceSnapshotsAsync` RPC errors, update `Src/FiveNine-Collective.Site.AppHost/FiveNine-Collective.Site.AppHost.csproj` to match `aspire --version`.

When the AppHost is started from Visual Studio (not `aspire run`), call `select_apphost` with the full path to the `.csproj` before using other Aspire MCP tools.

### Local frontend env vars

Lives in `Src/frontend/.env.local` (not committed):

| Variable | Value |
|---|---|
| `VITE_AUTH0_DOMAIN` | `fivenine.eu.auth0.com` |
| `VITE_AUTH0_CLIENT_ID` | `N5BHrtQZDyKpENk8HlfZhENmDNvkskoG` |
| `VITE_AUTH0_AUDIENCE` | `https://api.fivenine.collective` |

## Environment variables

### Railway — frontend service

| Variable | Value |
|---|---|
| `VITE_AUTH0_DOMAIN` | `fivenine.eu.auth0.com` |
| `VITE_AUTH0_CLIENT_ID` | `N5BHrtQZDyKpENk8HlfZhENmDNvkskoG` |
| `VITE_AUTH0_AUDIENCE` | `https://api.fivenine.collective` |
| `VITE_API_URL` | `https://${{server.RAILWAY_PUBLIC_DOMAIN}}` |

Watch pattern: `projects/FiveNine-Collective.Site/Src/frontend/**`

### Railway — server service

Auth0 config is baked into `appsettings.json` (`Auth0:Domain`, `Auth0:Audience`) — no env vars needed for auth.

| Variable | Value |
|---|---|
| `ALLOWED_ORIGINS` | `https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}` |
| `ConnectionStrings__fiveninedb` | `Host=${{Postgres.PGHOST}};Port=5432;Database=${{Postgres.PGDATABASE}};Username=${{Postgres.PGUSER}};Password=${{Postgres.PGPASSWORD}};SSL Mode=Require;Trust Server Certificate=true` |

Watch pattern: `projects/FiveNine-Collective.Site/Src/FiveNine-Collective.Site.Server/**`

Health check path: `/health` (from Aspire service defaults — Railway waits for 200 before routing traffic).

Pre-deploy command: `dotnet FiveNine-Collective.Site.Server.dll --migrate-only` — runs EF Core migrations before the new instance starts serving. The app also runs migrations on startup as a fallback. Pass `--migrate-only` to add a new migration runner entry point (see `Program.cs`).
