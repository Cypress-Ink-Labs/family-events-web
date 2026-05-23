import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"
import type { Database } from "@/lib/db"

const supabaseEnvSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
})

let client: SupabaseClient<Database> | null = null

function supabaseStorageHost(supabaseUrl: string): string {
  try {
    return new URL(supabaseUrl).host.replace(/[^a-z0-9.-]/gi, "_")
  } catch {
    return "unknown"
  }
}

function readSupabaseEnv() {
  return supabaseEnvSchema.parse({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  })
}

export function getSupabaseClient(): SupabaseClient<Database> {
  if (client) return client

  const env = readSupabaseEnv()
  client = createClient<Database>(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: {
      storageKey: `family-events-auth-${supabaseStorageHost(env.VITE_SUPABASE_URL)}`,
    },
  })
  return client
}

export function setSupabaseClientForTests(nextClient: SupabaseClient<Database> | null): void {
  client = nextClient
}

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, property) {
    const supabaseClient = getSupabaseClient()
    const value = Reflect.get(supabaseClient, property, supabaseClient)
    return typeof value === "function" ? value.bind(supabaseClient) : value
  },
})
