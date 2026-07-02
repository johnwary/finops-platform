import { useState } from 'react'
import { format } from 'date-fns'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NumericInput } from '@/components/ui/numeric-input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ReasonDialog } from '@/components/reason-dialog'
import { formatPeso, todayManilaDateString } from '@/lib/format'
import { useCreateFund, useFunds, useWithdrawFund } from '../hooks/useFunds'

const createFundSchema = z.object({
  amount: z
    .preprocess(
      (val) => (typeof val === 'number' && isNaN(val) ? undefined : val),
      z.number({ error: 'Please enter a valid amount' }).positive({ message: 'Amount must be greater than zero' }),
    ),
  dateAdded: z.string().min(1, { message: 'Date required' }),
  remarks: z.string().max(2000).optional(),
})

type CreateFundFormInput = z.infer<typeof createFundSchema>

export function BusinessFundsSection() {
  const funds = useFunds()
  const createFund = useCreateFund()
  const withdrawFund = useWithdrawFund()
  const [withdrawTargetId, setWithdrawTargetId] = useState<string | null>(null)

  const todayLocal = todayManilaDateString()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateFundFormInput>({
    resolver: zodResolver(createFundSchema) as Resolver<CreateFundFormInput>,
    defaultValues: { dateAdded: todayLocal },
  })

  function handleAdd(values: CreateFundFormInput) {
    createFund.mutate(values, { onSuccess: () => reset({ dateAdded: todayLocal }) })
  }

  const rows = funds.data?.data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Capital</CardTitle>
        <CardDescription>
          Owner capital in and out. Entries feed the capital ledger and the dashboard's net capital.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <form
          onSubmit={handleSubmit(handleAdd)}
          className="grid gap-4 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end"
        >
          <Field data-invalid={!!errors.amount}>
            <FieldLabel htmlFor="fund-amount">Amount</FieldLabel>
            <NumericInput
              id="fund-amount"
              placeholder="0.00"
              onChange={(value) => setValue('amount', value as number, { shouldValidate: true })}
              aria-invalid={!!errors.amount}
            />
            <FieldError errors={[errors.amount]} />
          </Field>
          <Field data-invalid={!!errors.dateAdded}>
            <FieldLabel htmlFor="fund-date">Date</FieldLabel>
            <Input id="fund-date" type="date" max={todayLocal} {...register('dateAdded')} />
            <FieldError errors={[errors.dateAdded]} />
          </Field>
          <Field data-invalid={!!errors.remarks}>
            <FieldLabel htmlFor="fund-remarks">Remarks (optional)</FieldLabel>
            <Input id="fund-remarks" placeholder="e.g. Owner top-up" {...register('remarks')} />
            <FieldError errors={[errors.remarks]} />
          </Field>
          <Button type="submit" disabled={createFund.isPending}>
            {createFund.isPending ? <Spinner data-icon="inline-start" /> : null}
            Add Capital
          </Button>
        </form>

        {funds.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No capital entries yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((fund) => (
                <TableRow key={fund.id}>
                  <TableCell>{format(new Date(fund.dateAdded), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="tabular-nums">{formatPeso(fund.amount)}</TableCell>
                  <TableCell className="text-muted-foreground">{fund.remarks ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={fund.status === 'ACTIVE' ? 'default' : 'outline'}>
                      {fund.status === 'ACTIVE' ? 'Active' : 'Withdrawn'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {fund.status === 'ACTIVE' && (
                      <Button variant="ghost" size="sm" onClick={() => setWithdrawTargetId(fund.id)}>
                        Withdraw
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <ReasonDialog
        open={withdrawTargetId !== null}
        onOpenChange={(open) => !open && setWithdrawTargetId(null)}
        title="Withdraw capital?"
        description="This records a capital outflow and marks the entry withdrawn. It cannot be undone."
        confirmLabel="Withdraw"
        isPending={withdrawFund.isPending}
        onConfirm={(reason) =>
          withdrawFund.mutate(
            { id: withdrawTargetId!, remarks: reason },
            { onSuccess: () => setWithdrawTargetId(null) },
          )
        }
      />
    </Card>
  )
}
