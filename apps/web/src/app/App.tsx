import { RouterProvider } from "react-router"
import { AppProviders } from "@/app/app-providers"
import { appRouter } from "@/app/app-router"

export default function App() {
  return (
    <AppProviders>
      <RouterProvider router={appRouter} />
    </AppProviders>
  )
}
