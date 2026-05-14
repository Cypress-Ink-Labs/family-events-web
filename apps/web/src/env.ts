import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_SUPABASE_URL: z.url(),
    VITE_SUPABASE_ANON_KEY: z.string().min(1),
    VITE_APP_ENV: z.string().min(1).optional(),
    VITE_SENTRY_DSN: z.url().optional(),
    VITE_SENTRY_RELEASE: z.string().min(1).optional(),
    VITE_SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional(),
    VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional(),
    VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional(),
    VITE_OPENWEATHER_API_KEY: z.string().min(1).optional(),
  },
  runtimeEnvStrict: {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_APP_ENV: import.meta.env.VITE_APP_ENV,
    VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
    VITE_SENTRY_RELEASE: import.meta.env.VITE_SENTRY_RELEASE,
    VITE_SENTRY_TRACES_SAMPLE_RATE: import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE,
    VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE: import.meta.env
      .VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
    VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE: import.meta.env
      .VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
    VITE_OPENWEATHER_API_KEY: import.meta.env.VITE_OPENWEATHER_API_KEY,
  },
  emptyStringAsUndefined: true,
})
