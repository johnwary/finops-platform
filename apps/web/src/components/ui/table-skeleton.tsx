import { Skeleton, SkeletonText } from '@/components/ui/skeleton'
import { TableBody, TableCell, TableRow } from '@/components/ui/table'

const DEFAULT_ROW_COUNT = 5

// Varied widths keep placeholder rows from reading as a solid grey grid.
// Cycled by column index so every row lines up like real tabular content.
// Absolute units, not percentages: table cells are `whitespace-nowrap` in an
// auto-layout table, so a percentage would resolve against a column sized by
// its header text and collapse to nothing in narrow columns.
const CELL_WIDTHS = ['7rem', '4rem', '5.5rem', '3.5rem', '6rem', '4.5rem', '5rem', '3rem']

interface TableSkeletonBodyProps {
  columnCount: number
  rowCount?: number
  /** Set false when the last column is not a right-aligned action button. */
  hasActionColumn?: boolean
}

/** Placeholder rows for a loading table. Render in place of `<TableBody>`. */
export function TableSkeletonBody({
  columnCount,
  rowCount = DEFAULT_ROW_COUNT,
  hasActionColumn = true,
}: TableSkeletonBodyProps) {
  return (
    <TableBody>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columnCount }).map((__, colIndex) => {
            const isActionCell = hasActionColumn && colIndex === columnCount - 1

            return (
              <TableCell key={colIndex} className={isActionCell ? 'text-right' : undefined}>
                {isActionCell ? (
                  // Matches the `size="sm"` action button these tables render.
                  <Skeleton className="ml-auto h-6 w-14" />
                ) : (
                  <SkeletonText width={CELL_WIDTHS[colIndex % CELL_WIDTHS.length]} />
                )}
              </TableCell>
            )
          })}
        </TableRow>
      ))}
    </TableBody>
  )
}
