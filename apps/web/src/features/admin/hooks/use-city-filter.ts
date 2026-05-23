import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import type { CityFilterValue } from "@/lib/events/group-by-city"

const PARAM = "city"

export function useCityFilter() {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get(PARAM)
  const value: CityFilterValue = raw && raw.length > 0 ? raw : "all"

  const setValue = useCallback(
    (next: CityFilterValue) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current)
          if (next === "all") {
            params.delete(PARAM)
          } else {
            params.set(PARAM, next)
          }
          return params
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  return useMemo(() => ({ value, setValue }), [value, setValue])
}
