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
    VITE_GOOGLE_SITE_VERIFICATION: z.string().min(1).optional(),
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

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function googleSiteVerificationPlugin(token?: string): Plugin {
  return {
    name: "family-events:google-site-verification",
    transformIndexHtml(html) {
      if (!token) return html

      return html.replace(
        "    <title>Family Events</title>",
        `    <meta name="google-site-verification" content="${escapeHtmlAttribute(token)}" />\n    <title>Family Events</title>`
      )
    },
  }
}

export default defineConfig(() => {
  const release = buildEnv.SENTRY_RELEASE ?? buildEnv.RAILWAY_GIT_COMMIT_SHA
  const appVersion = release ?? `dev-${Date.now()}`

  const plugins = [
    react(),
    tailwindcss(),
    versionManifestPlugin(appVersion),
    googleSiteVerificationPlugin(buildEnv.VITE_GOOGLE_SITE_VERIFICATION),
  ]

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
      // Strip heavy single-purpose vendor chunks (maplibre/recharts/sentry)
      // from <link rel="modulepreload"> on first paint. They are route-
      // specific — only needed once the user navigates to /map, /admin, or
      // an error path triggers Sentry — and React.lazy() already gates them
      // behind a Suspense boundary. The default preload graph defeats that
      // gate by hinting every reachable chunk on initial HTML load, which
      // costs ~2 MB of JS for nothing on the first paint of /. Keep all
      // other preloads (route chunks, shared vendor deps) intact so warm
      // navigation between common pages stays snappy.
      modulePreload: {
        resolveDependencies: (_filename, deps) =>
          deps.filter((dep) => !/\/(maplibre|recharts|sentry)-[A-Za-z0-9_-]+\.js$/.test(dep)),
      },
      rollupOptions: {
        output: {
          // Heavy single-purpose vendors that only load on specific pages get
          // their own chunk so route nav doesn't refetch them and the browser
          // can cache each independently. Function form is required by the
          // current Rollup typings (record form is deprecated).
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined
            if (id.includes("maplibre-gl") || id.includes("react-map-gl")) return "maplibre"
            // d3 sub-packages (d3-shape, d3-scale, etc.) before recharts so
            // they land in their own chunk instead of the recharts bundle.
            if (id.includes("d3-")) return "d3"
            if (id.includes("recharts")) return "recharts"
            if (id.includes("@sentry")) return "sentry"
            // Match "motion" the npm package but not paths like
            // "node_modules/framer-motion" or "react-motion".
            if (id.match(/node_modules\/motion(\/|$)/)) return "motion"
            if (id.includes("date-fns")) return "date-fns"
            if (id.includes("@radix-ui")) return "radix-ui"
            if (id.includes("@supabase")) return "supabase"
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
