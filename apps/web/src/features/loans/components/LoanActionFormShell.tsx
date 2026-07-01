import type { FormEventHandler, ReactNode } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { SheetClose, SheetFooter } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

interface LoanActionFormShellProps {
  children: ReactNode
  onSubmit: FormEventHandler<HTMLFormElement>
  error?: Error | null
  isPending: boolean
  submitLabel: string
  pendingLabel: string
  submitVariant?: 'default' | 'destructive'
  disabled?: boolean
  className?: string
}

export function LoanActionFormShell({
  children,
  onSubmit,
  error,
  isPending,
  submitLabel,
  pendingLabel,
  submitVariant = 'default',
  disabled,
  className,
}: LoanActionFormShellProps) {
  return (
    <form onSubmit={onSubmit} className={cn('flex flex-col gap-6 p-6', className)}>
      <FieldGroup>
        {children}
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}
      </FieldGroup>

      <SheetFooter className="flex-row justify-end">
        <SheetClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </SheetClose>
        <Button type="submit" variant={submitVariant} disabled={disabled ?? isPending}>
          {isPending ? <Spinner data-icon="inline-start" /> : null}
          {isPending ? pendingLabel : submitLabel}
        </Button>
      </SheetFooter>
    </form>
  )
}
