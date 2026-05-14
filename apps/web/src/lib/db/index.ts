/**
 * Re-exports Supabase-generated schema types plus short aliases.
 * Regenerated schema lives in `database.types.ts` (`pnpm db:types`); import from here in app code.
 */
import type {
  CompositeTypes,
  Database,
  Enums,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "../database.types"
import { Constants } from "../database.types"
export type {
  CompositeTypes as SharedCompositeTypes,
  Database as SharedDatabase,
  Enums as SharedEnums,
  Json as SharedJson,
  Tables as SharedTables,
  TablesInsert as SharedTablesInsert,
  TablesUpdate as SharedTablesUpdate,
} from "@family-events/contracts/database-types"

export type { CompositeTypes, Database, Enums, Json, Tables, TablesInsert, TablesUpdate }
export { Constants }

export type CityRow = Tables<"cities">
export type PublicEventRow = Tables<"public_events">
export type PlanEventsRow =
  Database["public"]["Functions"]["plan_events_for_user"]["Returns"][number]
