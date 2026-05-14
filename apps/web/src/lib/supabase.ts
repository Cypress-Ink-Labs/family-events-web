import { createClient } from "@supabase/supabase-js"
import { env } from "@/env"
import type { Database } from "./db"

const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY
const supabaseHost = (() => {
  try {
    return new URL(supabaseUrl).host.replace(/[^a-z0-9.-]/gi, "_")
  } catch {
    return "unknown"
  }
})()

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: `family-events-auth-${supabaseHost}`,
  },
})
