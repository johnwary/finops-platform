import type { ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface DisabledReasonTooltipProps {
  /** Why the action is unavailable. When absent the child renders untouched. */
  reason?: string
  children: ReactNode
}

/**
 * Explains why a disabled control can't be used.
 *
 * Disabled buttons get `pointer-events-none`, so they never fire the hover the
 * tooltip needs — the wrapper span is what receives it, and it keeps its own
 * pointer events while the button inside stays disabled.
 */
export function DisabledReasonTooltip({ reason, children }: DisabledReasonTooltipProps) {
  if (!reason) return children

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex cursor-not-allowed">
          {children}
        </span>
      </TooltipTrigger>
      {/* Right-aligned action rows put this flush against the viewport edge. */}
      <TooltipContent collisionPadding={8}>{reason}</TooltipContent>
    </Tooltip>
  )
}
