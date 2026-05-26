import path from "path"
import fs from "fs"
import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { sentryVitePlugin } from "@sentry/vite-plugin"
import { defineConfig, type Plugin } from "vite"

const buildEnv = createEnv({
  server: {
    SENTRY_AUTH_TOKEN: z.string().min(1).optional(),
    SENTRY_ORG: z.string().min(1).optional(),
    SENTRY_PROJECT: z.string().min(1).optional(),
    SENTRY_RELEASE: z.string().min(1).optional(),
    RAILWAY_GIT_COMMIT_SHA: z.string().min(1).optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})

function versionManifestPlugin(appVersion: string): Plugin {
  const startedAt = new Date().toISOString()
  const manifest = () =>
    JSON.stringify({ version: appVersion, builtAt: startedAt }) + "\n"

  return {
    name: "family-events:version-manifest",
    // Dev: serve a synthetic /version.json so useVersionCheck doesn't 404-spam.
    configureServer(server) {
      server.middlewares.use("/version.json", (_req, res) => {
        res.setHeader("Content-Type", "application/json")
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate")
        res.end(manifest())
      })
    },
    // Build: write the file into dist/ for production serving.
    closeBundle() {
      const outDir = path.resolve(__dirname, "dist")
      fs.mkdirSync(outDir, { recursive: true })
      fs.writeFileSync(path.join(outDir, "version.json"), manifest())
    },
  }
}

export default defineConfig(() => {
  const release = buildEnv.SENTRY_RELEASE ?? buildEnv.RAILWAY_GIT_COMMIT_SHA
  const appVersion = release ?? `dev-${Date.now()}`

  const plugins = [react(), tailwindcss(), versionManifestPlugin(appVersion)]

  if (buildEnv.SENTRY_AUTH_TOKEN && buildEnv.SENTRY_ORG && buildEnv.SENTRY_PROJECT && release) {
    plugins.push(
      sentryVitePlugin({
        authToken: buildEnv.SENTRY_AUTH_TOKEN,
        org: buildEnv.SENTRY_ORG,
        project: buildEnv.SENTRY_PROJECT,
        release: {
          name: release,
        },
        sourcemaps: {
          assets: "./dist/**",
          filesToDeleteAfterUpload: ["./dist/**/*.map"],
        },
        telemetry: false,
      })
    )
  }

  return {
    plugins,
    server: {
      warmup: {
        clientFiles: [
          "./src/main.tsx",
          "./src/app/App.tsx",
          "./src/app/app-router.tsx",
          "./src/app/app-providers.tsx",
          "./src/app/app-route-pages.ts",
          "./src/features/dashboard/pages/dashboard.tsx",
        ],
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
    build: {
      // Emit sourcemaps only when we have a Sentry upload pipeline to
      // consume + delete them. Without Sentry, leaving *.map files in dist/
      // is a code-disclosure risk via `serve -s dist`.
      sourcemap: Boolean(
        buildEnv.SENTRY_AUTH_TOKEN &&
          buildEnv.SENTRY_ORG &&
          buildEnv.SENTRY_PROJECT &&
          release
      ),
      // Drops back to Rollup's default 500 KB warning so future bloat
      // surfaces in CI rather than hiding under a raised ceiling.
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          // Heavy single-purpose vendors that only load on specific pages get
          // their own chunk so route nav doesn't refetch them and the browser
          // can cache each independently. Function form is required by the
          // current Rollup typings (record form is deprecated).
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined
            if (id.includes("maplibre-gl") || id.includes("react-map-gl")) return "maplibre"
            if (id.includes("recharts")) return "recharts"
            if (id.includes("@sentry")) return "sentry"
            // Match "motion" the npm package but not paths like
            // "node_modules/framer-motion" or "react-motion".
            if (id.match(/node_modules\/motion(\/|$)/)) return "motion"
            return undefined
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
})
