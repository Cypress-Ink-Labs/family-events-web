import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./app/App.tsx"
import { initSentry } from "@/infrastructure/observability/sentry"
import { updateStore } from "@/shared/lib/app-version/update-store"
import { isDynamicImportError } from "@/shared/lib/app-version/version-check"

void initSentry()

window.addEventListener("vite:preloadError", (event) => {
  // Vite emits this when a `<link rel="modulepreload">` or dynamic import fails.
  // preventDefault() suppresses the default reload-on-failure so we control UX.
  event.preventDefault()
  updateStore.getState().markUpdateAvailable("chunk-error")
})

window.addEventListener("unhandledrejection", (event) => {
  if (isDynamicImportError(event.reason)) {
    updateStore.getState().markUpdateAvailable("chunk-error")
  }
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
