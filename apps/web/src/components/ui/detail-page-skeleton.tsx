import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton, SkeletonText } from '@/components/ui/skeleton'

interface DetailPageSkeletonProps {
  /** Number of placeholder cards below the header. */
  cardCount?: number
}

/**
 * Loading state for the detail pages, which all share the same shape:
 * an eyebrow / title / status header, then a stack of cards.
 */
export function DetailPageSkeleton({ cardCount = 2 }: DetailPageSkeletonProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <SkeletonText width="6rem" />
          </p>
          <h1 className="text-2xl font-semibold">
            <SkeletonText width="14rem" />
          </h1>
          {/* Matches the status Badge (h-5, rounded-full) the loaded header shows. */}
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-7 w-20" />
        </div>
      </div>

      {Array.from({ length: cardCount }).map((_, cardIndex) => (
        <Card key={cardIndex}>
          <CardHeader>
            <SkeletonText width="9rem" />
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((__, fieldIndex) => (
              <div key={fieldIndex} className="flex flex-col gap-1.5">
                <SkeletonText className="text-xs" width="4.5rem" />
                <SkeletonText className="text-sm" width="7rem" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
