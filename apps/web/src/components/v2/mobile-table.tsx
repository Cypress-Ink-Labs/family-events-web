import type { ReactNode } from "react"
import { cn } from "@/shared/utils/format"
import { Card, CardContent } from "@/shared/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"

export type MobileTableColumn<T> = {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  value?: (row: T) => string | number | null | undefined
  desktopOnly?: boolean
  className?: string
}

type MobileTableProps<T> = {
  data: readonly T[]
  columns: readonly MobileTableColumn<T>[]
  getId: (row: T) => string
  onRowClick?: (row: T) => void
  empty?: ReactNode
  className?: string
  cardTitle?: (row: T) => ReactNode
  cardSubtitle?: (row: T) => ReactNode
}

/**
 * Renders as a card-list on mobile (<md) and as a real `<table>` on md+.
 * Same data, two presentations: scan-friendly cards and dense table rows.
 */
export function MobileTable<T>({
  data,
  columns,
  getId,
  onRowClick,
  empty,
  className,
  cardTitle,
  cardSubtitle,
}: MobileTableProps<T>) {
  if (data.length === 0 && empty) {
    return <div className={cn("text-sm text-muted-foreground", className)}>{empty}</div>
  }

  const mobileColumns: MobileTableColumn<T>[] = []
  for (const column of columns) {
    if (!column.desktopOnly) {
      mobileColumns.push(column)
    }
  }

  return (
    <div className={className}>
      <ul className="space-y-3 md:hidden">
        {data.map((row) => {
          const id = getId(row)
          const interactive = onRowClick != null
          return (
            <li key={id}>
              <Card
                className={cn(interactive && "cursor-pointer transition-colors hover:bg-accent/30")}
                onClick={interactive ? () => onRowClick!(row) : undefined}
              >
                <CardContent className="space-y-3 p-4">
                  {cardTitle ? (
                    <div className="font-display text-base font-medium leading-tight">
                      {cardTitle(row)}
                    </div>
                  ) : null}
                  {cardSubtitle ? (
                    <div className="text-sm text-muted-foreground">{cardSubtitle(row)}</div>
                  ) : null}
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    {mobileColumns.map((col) => (
                      <div key={col.key} className="min-w-0 space-y-0.5">
                        <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {col.header}
                        </dt>
                        <dd className={cn("truncate text-foreground", col.className)}>
                          {col.cell(row)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            </li>
          )
        })}
      </ul>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => {
              const id = getId(row)
              const interactive = onRowClick != null
              return (
                <TableRow
                  key={id}
                  className={interactive ? "cursor-pointer" : undefined}
                  onClick={interactive ? () => onRowClick!(row) : undefined}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
