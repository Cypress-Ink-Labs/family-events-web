// @vitest-environment jsdom
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { City } from "@/shared/types"

const authMock = vi.fn()
const appMock = vi.fn()
const preferredCitiesMock = vi.fn()

vi.mock("react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
  NavLink: ({
    children,
  }: {
    children: ReactNode | ((props: { isActive: boolean }) => ReactNode)
  }) => <a>{typeof children === "function" ? children({ isActive: false }) : children}</a>,
  Outlet: () => null,
  useNavigate: () => vi.fn(),
}))

vi.mock("@/features/auth/stores/auth-store", () => ({ useAuth: () => authMock() }))
vi.mock("@/app/stores/app-store", () => ({ useApp: () => appMock() }))
vi.mock("@/features/profile/hooks/use-preferred-cities", () => ({
  usePreferredCities: () => preferredCitiesMock(),
}))
vi.mock("@/shared/hooks/use-breakpoint", () => ({
  useBreakpoint: () => ({ isBelow: () => false }),
}))
vi.mock("@/shared/components/motion", () => ({
  PageTransition: ({ children }: { children: ReactNode }) => <>{children}</>,
}))
vi.mock("@/shared/components/brand-logo", () => ({
  BrandLogo: () => <div data-testid="brand-logo" />,
}))
vi.mock("@/shared/components/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Theme</button>,
}))
vi.mock("@/features/notifications/components/notification-bell", () => ({
  NotificationBell: () => null,
}))
vi.mock("@/shared/components/ui/select", async () => {
  const React = await import("react")
  const SelectContext = React.createContext<(value: string) => void>(() => {})

  return {
    Select: ({
      children,
      onValueChange,
    }: {
      children: ReactNode
      onValueChange?: (value: string) => void
    }) => (
      <SelectContext.Provider value={onValueChange ?? (() => {})}>
        {children}
      </SelectContext.Provider>
    ),
    SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    SelectGroup: ({ children }: { children: ReactNode }) => (
      <div data-testid="preferred-cities">{children}</div>
    ),
    SelectItem: ({ children, value }: { children: ReactNode; value: string }) => {
      const onValueChange = React.useContext(SelectContext)
      return (
        <button type="button" onClick={() => onValueChange(value)}>
          {children}
        </button>
      )
    },
    SelectLabel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    SelectSeparator: () => <hr />,
    SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    SelectValue: () => null,
  }
})

import { AppLayout, orderCitiesForSelect } from "./app-layout"

function city(id: string, name = id): City {
  return { id, name } as City
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("orderCitiesForSelect", () => {
  it("places the primary first, retains preferred order, then appends non-preferred cities", () => {
    const cities = [city("a"), city("b"), city("c"), city("d")]

    const ordered = orderCitiesForSelect(cities, ["c", "a", "b"], "b")

    expect(ordered.map(({ id }) => id)).toEqual(["b", "c", "a", "d"])
  })

  it("returns the existing city order when there are no preferred cities", () => {
    const cities = [city("a"), city("b"), city("c")]

    const ordered = orderCitiesForSelect(cities, [], null)

    expect(ordered).toEqual(cities)
  })
})

describe("AppLayout city selector", () => {
  it("renders active preferred cities in a labeled group and switches cities from either group", () => {
    const cities = [city("city-a", "Austin"), city("city-b", "Boston"), city("city-c", "Chicago")]
    const setSelectedCity = vi.fn()
    authMock.mockReturnValue({
      user: { id: "user-1" },
      profile: null,
      signOut: vi.fn(),
      isAdmin: false,
    })
    appMock.mockReturnValue({ selectedCity: cities[0], setSelectedCity, cities })
    preferredCitiesMock.mockReturnValue({
      preferredCities: [
        { cityId: "city-b", isPrimary: true, city: cities[1] },
        { cityId: "inactive-city", isPrimary: false, city: null },
      ],
      primaryCityId: "city-b",
    })

    render(<AppLayout />)

    expect(screen.getByText("Preferred")).toBeDefined()
    expect(screen.getByTestId("preferred-cities")).toBeDefined()

    fireEvent.click(screen.getByRole("button", { name: "Boston" }))
    fireEvent.click(screen.getByRole("button", { name: "Austin" }))

    expect(setSelectedCity).toHaveBeenNthCalledWith(1, cities[1])
    expect(setSelectedCity).toHaveBeenNthCalledWith(2, cities[0])
  })

  it("renders one ungrouped city list when no active preferences resolve", () => {
    const cities = [city("city-a", "Austin"), city("city-b", "Boston")]
    const setSelectedCity = vi.fn()
    authMock.mockReturnValue({ user: null, profile: null, isAdmin: false })
    appMock.mockReturnValue({ selectedCity: cities[0], setSelectedCity, cities })
    preferredCitiesMock.mockReturnValue({
      preferredCities: [{ cityId: "inactive-city", isPrimary: true, city: null }],
      primaryCityId: "inactive-city",
    })

    render(<AppLayout />)

    expect(screen.queryByText("Preferred")).toBeNull()
    expect(screen.queryByTestId("preferred-cities")).toBeNull()
  })
})
