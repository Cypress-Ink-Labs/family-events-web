export type DbErrorKind = "forbidden" | "validation" | "not_found" | "unknown"

export interface DbError {
  kind: DbErrorKind
  message: string
}
