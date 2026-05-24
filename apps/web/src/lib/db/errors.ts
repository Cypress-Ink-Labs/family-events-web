import type { PostgrestError } from "@supabase/supabase-js"

export type DbErrorKind = "forbidden" | "validation" | "not_found" | "unknown"

export interface DbError {
  kind: DbErrorKind
  message: string
}

function mapSupabaseError(error: PostgrestError): DbError {
  if (error.code === "42501") {
    return { kind: "forbidden", message: error.message }
  }
  if (error.code === "23514" || error.code === "23505" || error.code === "22P02") {
    return { kind: "validation", message: error.message }
  }
  if (error.code === "PGRST116") {
    return { kind: "not_found", message: error.message }
  }
  return { kind: "unknown", message: error.message }
}
