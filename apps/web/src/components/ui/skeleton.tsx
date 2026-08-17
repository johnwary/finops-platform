import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-md bg-foreground/10 dark:bg-foreground/15",
        className,
      )}
      {...props}
    />
  )
}

/**
 * Skeleton sized to a line of text. Uses the line-box of the type scale it
 * stands in for, so swapping in real text causes no layout shift.
 */
function SkeletonText({
  className,
  width,
  ...props
}: React.ComponentProps<"div"> & { width?: string }) {
  return (
    <span
      data-slot="skeleton-text"
      aria-hidden="true"
      className={cn("inline-flex items-center", className)}
      style={{ width: width ?? "100%" }}
      {...props}
    >
      <span
        className="h-[0.7em] w-full animate-pulse rounded bg-foreground/10 dark:bg-foreground/15"
      />
    </span>
  )
}

export { Skeleton, SkeletonText }
