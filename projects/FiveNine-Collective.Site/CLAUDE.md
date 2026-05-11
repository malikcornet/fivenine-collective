# FiveNine Collective Site — Agent Guide

## Project Structure

```
Src/
  FiveNine-Collective.Site.AppHost/   # .NET Aspire AppHost (orchestration)
  FiveNine-Collective.Site.Server/    # ASP.NET Core Web API backend
  frontend/                           # Vite + React + TypeScript frontend
```

## Running the App

Start the AppHost from Visual Studio using the **https** profile. This starts:
- **Aspire Dashboard**: `https://fivenine_collective_site.dev.localhost:17162`
- **Backend API (server)**: `https://server-fivenine_collective_site.dev.localhost:7377`
- **Frontend (webfrontend)**: `http://webfrontend-fivenine_collective_site.dev.localhost:5173`

The Vite dev server proxies `/api/*` requests to the backend via the `SERVER_HTTPS` / `SERVER_HTTP` env vars injected by Aspire.

## Aspire MCP

The project uses `aspire mcp start` (stdio transport) configured in `.mcp.json`. Claude Code launches the MCP server automatically — no manual command needed.

**Important**: The Aspire CLI version must match the AppHost SDK version. Both are currently **13.3.0**. If you see `GetDashboardUrlsAsync` or `GetResourceSnapshotsAsync` RPC errors, there is a version mismatch — update `AppHost.csproj` to match `aspire --version`.

After connecting, select the AppHost explicitly if it was started outside the CLI:
```
select_apphost → D:\...\FiveNine-Collective.Site.AppHost\FiveNine-Collective.Site.AppHost.csproj
```

## Auth0 Configuration

- **Tenant**: `fivenine.eu.auth0.com`
- **Application**: FiveNine Collective (SPA, PKCE flow)
- **Client ID**: `N5BHrtQZDyKpENk8HlfZhENmDNvkskoG`
- **Audience**: `https://api.fivenine.collective`
- **Scopes**: `openid profile email read:data`
- **Refresh Token Rotation**: enabled (required — `useRefreshTokens={true}` is set in the frontend)
- **Cache location**: `localstorage` (tokens persist across page refreshes)

Allowed callback URLs include `http://webfrontend-fivenine_collective_site.dev.localhost:5173` and `https://frontend-production-b973e.up.railway.app`.

Frontend Auth0 env vars live in `Src/frontend/.env.local` (not committed).

## Key Ports (https profile — fixed in launchSettings.json)

| Service | URL |
|---|---|
| Dashboard UI | `https://fivenine_collective_site.dev.localhost:17162` |
| Dashboard (http) | `http://fivenine_collective_site.dev.localhost:15181` |
| Backend API | `https://server-fivenine_collective_site.dev.localhost:7377` |
| Frontend | `http://webfrontend-fivenine_collective_site.dev.localhost:5173` |
| OTLP endpoint | `https://localhost:21020` |
| MCP endpoint | `https://localhost:23108` (internal, used by Aspire CLI) |

## Aspire Skills

Skill files for Claude Code are in `.claude/skills/aspire/` — installed via `aspire agent init`. These teach the agent how to use Aspire CLI commands for monitoring, deployment, and resource management.
