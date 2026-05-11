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

### Auth0

- **Dashboard**: https://manage.auth0.com/dashboard/eu/fivenine/
- **Tenant**: `fivenine` (EU region) — domain `fivenine.eu.auth0.com`
- **SPA application**: "FiveNine Collective" — client ID `N5BHrtQZDyKpENk8HlfZhENmDNvkskoG`
- **API (resource server)**: "FiveNine Collective API" — identifier `https://api.fivenine.collective`

Use the `mcp__auth0__*` tools for Auth0 operations (list/get/update applications, resource servers, etc.).

#### Auth0 SPA app — allowed URLs (keep in sync when adding domains)

| List | Values |
|---|---|
| Callbacks | `http://localhost:5173`, `http://localhost:5173/callback`, `https://frontend-production-b973e.up.railway.app`, `https://frontend-production-b973e.up.railway.app/callback` |
| Logout URLs | `http://localhost:5173`, `https://frontend-production-b973e.up.railway.app` |
| Web Origins | `http://localhost:5173`, `https://frontend-production-b973e.up.railway.app` |

## Environment variables

### Railway — frontend service

| Variable | Value |
|---|---|
| `VITE_AUTH0_DOMAIN` | `fivenine.eu.auth0.com` |
| `VITE_AUTH0_CLIENT_ID` | `N5BHrtQZDyKpENk8HlfZhENmDNvkskoG` |
| `VITE_AUTH0_AUDIENCE` | `https://api.fivenine.collective` |
| `VITE_API_URL` | `https://server-production-fa4f.up.railway.app` |

### Railway — server service

Auth0 config is baked into `appsettings.json` (`Auth0:Domain`, `Auth0:Audience`) — no env vars needed for auth.
`ALLOWED_ORIGINS` is set to `https://frontend-production-b973e.up.railway.app`.
