# Deployment

How `family-events-web` reaches production.

## What deploys, and how

The web app (`apps/web`) is the `web` service on Railway (project `family-events-ui`,
`production` environment). It deploys through **GitHub Actions**, not Railway's
auto-deploy:

1. `ci` passes on `main` (or run `deploy.yml` via **workflow_dispatch**).
2. `.github/workflows/deploy.yml`'s `deploy` job pauses on the **`production`** GitHub
   Environment until a required reviewer approves.
3. On approval it runs `scripts/deploy-web.sh` → `railway up --ci`, which uploads the
   exact green commit; Railway builds it via `railway.toml` and deploys.

Railway's own auto-deploy-on-push is **disabled** for the `web` service, so this is the
single, CI-gated deploy path (a red CI can no longer reach production).

### Required GitHub secret

| Secret | Purpose |
| --- | --- |
| `RAILWAY_API_TOKEN` | Railway account token used by `railway up` |

(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `NODE_AUTH_TOKEN` already exist for CI builds.)

## Local / manual deploy

```bash
railway login          # one-time (or set RAILWAY_API_TOKEN)
pnpm run deploy        # railway up --ci to family-events-ui / production / web
```

## Cross-repo ordering

The backend (`family-events-backend`) deploys migrations + edge functions through its own
gated pipeline. When a web change depends on a new RPC/column, deploy the **backend**
first: make backend schema changes additive (expand/contract) and approve the backend
`production` deploy before the web one. A web release must never call an RPC/column
introduced in the same release. See the backend repo's `docs/DEPLOYMENT.md` (CIL-190).
