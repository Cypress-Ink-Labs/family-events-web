# Deployment (family-events-app)

Railway service, railpack build (`railway.toml`), Node 22 (`NODE_VERSION=22`
service variable). Healthcheck: `GET /healthz` (TanStack server route).

Authoritative variable list: `.env.example`.

## Service variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Same shared Postgres as the API — the app's server functions query it directly until cutover (U33). Local dev uses the family-events-backend Supabase stack at `127.0.0.1:55322`. |
| `VITE_CLERK_PUBLISHABLE_KEY` | yes | Clerk publishable key (`pk_...`); the only Clerk value the browser receives. |
| `CLERK_SECRET_KEY` | yes | Clerk secret key (`sk_...`), server-side session verification. |
| `CLERK_WEBHOOK_SIGNING_SECRET` | yes | Svix signing secret for `/api/webhooks/clerk`; unverified webhook requests are rejected. |
| `NODE_VERSION` | yes | `22` — Railway service variable, not a `.env` entry. |

There is no API-URL variable yet: the app does not call the NestJS API at
runtime until cutover. When U33 wires the generated client in, the variable it
introduces gets documented here and pointed at the API service's public URL.

## Deploy flow (operator)

1. Create/link the Railway service to the family-events-app repo (`main` branch).
2. Set the variables above plus `NODE_VERSION=22`.
3. First deploy: verify `/healthz` returns 200, then load `/` in a browser:
   events should render (DB reachable), sign-in should open Clerk.
4. Set the API service's `WEB_ORIGIN` to this app's public URL and redeploy the API.
