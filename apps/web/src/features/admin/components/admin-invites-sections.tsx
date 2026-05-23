/**
 * Back-compat barrel for the admin-invites sections. Each component now
 * lives in its own file under `./admin-invites/`. Import directly from
 * those paths in new code.
 */

export { AdminInvitesHeader } from "@/features/admin/components/admin-invites/admin-invites-header"
export { AdminInvitesCreatedReveal } from "@/features/admin/components/admin-invites/admin-invites-created-reveal"
export {
  AdminInvitesEmptyState,
  AdminInvitesList,
  AdminInviteRequestsEmptyState,
} from "@/features/admin/components/admin-invites/admin-invites-list"
export { AdminInviteRequestsList } from "@/features/admin/components/admin-invites/admin-invite-requests-list"
export { AdminInvitesFooter } from "@/features/admin/components/admin-invites/admin-invites-footer"
