import type { ReactNode } from "react"
import { Card, CardContent } from "@/shared/components/ui/card"

/**
 * Standardizes the `isLoading ? <Skeleton /> : isError ? <ErrorCard /> : isEmpty ? <Empty /> : <Content />`
 * ternary that was repeated across feature pages.
 *
 * Pass either:
 *  - a `loading` / `error` / `empty` slot — fully custom UI per feature
 *  - or just rely on the defaults (compact error card, no skeleton, no empty)
 *
 * Render-prop style: children stay as JSX so feature code reads naturally.
 */

interface AsyncBoundaryProps {
  isLoading?: boolean
  isError?: boolean
  isEmpty?: boolean
  error?: unknown
  loading?: ReactNode
  errorContent?: ReactNode
  empty?: ReactNode
  /** Friendly text shown in the default error card when no `errorContent` is supplied. */
  errorMessage?: string
  children: ReactNode
}

export function AsyncBoundary({
  isLoading,
  isError,
  isEmpty,
  loading,
  errorContent,
  empty,
  errorMessage = "Something went wrong while loading this section.",
  children,
}: AsyncBoundaryProps) {
  if (isLoading && loading !== undefined) return <>{loading}</>
  if (isError) {
    if (errorContent !== undefined) return <>{errorContent}</>
    return <DefaultErrorCard message={errorMessage} />
  }
  if (isEmpty && empty !== undefined) return <>{empty}</>
  return <>{children}</>
}

function DefaultErrorCard({ message }: { message: string }) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="p-4 text-sm text-destructive">{message}</CardContent>
    </Card>
  )
}
