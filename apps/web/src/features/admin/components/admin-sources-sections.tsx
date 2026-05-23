/**
 * Back-compat barrel for the admin-sources screen. Each component now lives
 * in its own file under `./admin-sources/`. Import directly from those paths
 * in new code; this barrel only exists to keep the page + test imports stable.
 */

export { AdminSourcesHeader } from "@/features/admin/components/admin-sources/sources-header"
export { AdminSourcesList } from "@/features/admin/components/admin-sources/sources-list"
export type { SourceDraft } from "@/features/admin/components/admin-sources/add-source-dialog"
