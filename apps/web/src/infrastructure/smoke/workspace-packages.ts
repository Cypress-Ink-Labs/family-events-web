// Smoke import bridge — ensures @family-events/contracts and @family-events/shared
// are reachable from the web workspace at the source level.
// This file is validated by tests/guards/packages-consumers.test.mjs.
export { eventContractSchema } from "@family-events/contracts"
export { validateExternalUrl } from "@family-events/shared"
