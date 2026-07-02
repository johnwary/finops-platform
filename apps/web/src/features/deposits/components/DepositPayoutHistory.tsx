import { useState } from 'react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ReasonDialog } from '@/components/reason-dialog'
import { RequireRole } from '@/features/auth/components/RequireRole'
import { formatPeso } from '@/lib/format'
import { useReversePayout } from '../hooks/useReversePayout'
import type { DepositPayout, DepositStatus } from '../types'
import { PAYMENT_METHOD_LABELS } from '../utils'

interface DepositPayoutHistoryProps {
  depositId: string
  depositStatus: DepositStatus
  payouts: DepositPayout[]
}

export function DepositPayoutHistory({ depositId, depositStatus, payouts }: DepositPayoutHistoryProps) {
  const reversePayout = useReversePayout(depositId)
  const [reverseTargetId, setReverseTargetId] = useState<string | null>(null)

  if (!payouts.length) {
    return <p className="text-sm text-muted-foreground">No payouts recorded yet.</p>
  }

  // Reversal is LIFO-only (matches API) and only while the deposit is ACTIVE.
  const latestReversibleId =
    depositStatus === 'ACTIVE' ? payouts.find((p) => !p.reversedAt)?.id : undefined

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Paid At</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Principal</TableHead>
            <TableHead>Return</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {payouts.map((payout) => (
            <TableRow key={payout.id} className={payout.reversedAt ? 'opacity-60' : ''}>
              <TableCell>{format(new Date(payout.paidAt), 'MMM d, yyyy')}</TableCell>
              <TableCell className="tabular-nums">{formatPeso(payout.amount)}</TableCell>
              <TableCell className="tabular-nums">{formatPeso(payout.principalPortion)}</TableCell>
              <TableCell className="tabular-nums">{formatPeso(payout.returnPortion)}</TableCell>
              <TableCell>{PAYMENT_METHOD_LABELS[payout.method]}</TableCell>
              <TableCell className="text-muted-foreground">{payout.notes ?? '—'}</TableCell>
              <TableCell>
                {payout.reversedAt ? (
                  <Badge variant="outline" title={payout.reversalReason ?? undefined}>
                    Reversed
                  </Badge>
                ) : (
                  payout.id === latestReversibleId && (
                    <RequireRole role="admin" fallback="hide">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setReverseTargetId(payout.id)}
                      >
                        Reverse
                      </Button>
                    </RequireRole>
                  )
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ReasonDialog
        open={reverseTargetId !== null}
        onOpenChange={(open) => !open && setReverseTargetId(null)}
        title="Reverse this payout?"
        description="This unwinds the payout from the deposit totals and removes it from the capital ledger. The record stays visible as reversed."
        confirmLabel="Reverse Payout"
        isPending={reversePayout.isPending}
        onConfirm={(reason) =>
          reversePayout.mutate(
            { payoutId: reverseTargetId!, reason },
            { onSuccess: () => setReverseTargetId(null) },
          )
        }
      />
    </>
  )
}
