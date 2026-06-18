import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

// Vitest config: .ts tests run in Node (fast, no DOM), .tsx tests run in jsdom
// so React Testing Library can render components. The React plugin provides
// JSX transform; setupFiles wires @testing-library/jest-dom matchers.
export default defineConfig({
  plugins: [react()],
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
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "../../supabase/functions/**/*.test.ts"],
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
