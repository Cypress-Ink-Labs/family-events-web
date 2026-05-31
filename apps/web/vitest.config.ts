import path from "path"
import { defineConfig } from "vitest/config"

// Vitest runs against plain TS/JS — no React plugin needed for these unit tests
// (no JSX, no DOM). Kept separate from vite.config.ts so dev/build stays lean.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    env: {
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_ANON_KEY: "test-anon-key",
    },
    environment: "node",
    include: ["src/**/*.test.ts", "../../supabase/functions/**/*.test.ts"],
    exclude: [
      "node_modules",
      "dist",
      ".git",
      "../../supabase/functions/**/node_modules/**",
      "../../supabase/functions/send-weekly-digest/**",
      "../../supabase/functions/send-push/**",
      "../../supabase/functions/send-reminders/**",
    ],
    includeTaskLocation: true,
  },
})
