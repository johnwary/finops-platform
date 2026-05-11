import * as React from 'react'
import { cn } from '@/lib/utils'

interface NumericInputProps extends Omit<React.ComponentProps<'input'>, 'type' | 'onChange' | 'value'> {
  value?: number
  onChange?: (value: number | undefined) => void
  decimalPlaces?: number
}

function NumericInput({ value, onChange, decimalPlaces = 2, className, onBlur, onFocus, ...props }: NumericInputProps) {
  const [raw, setRaw] = React.useState<string>(() =>
    value != null ? String(value) : ''
  )
  const [focused, setFocused] = React.useState(false)

  React.useEffect(() => {
    if (!focused) {
      setRaw(value != null ? String(value) : '')
    }
  }, [value, focused])

  const displayValue = React.useMemo(() => {
    if (focused) return raw
    const n = parseFloat(raw)
    if (raw === '' || isNaN(n)) return raw
    return new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimalPlaces,
    }).format(n)
  }, [focused, raw, decimalPlaces])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value
    if (next === '' || /^-?\d*\.?\d*$/.test(next)) {
      setRaw(next)
      const n = parseFloat(next)
      onChange?.(next === '' || isNaN(n) ? undefined : n)
    }
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    setFocused(true)
    onFocus?.(e)
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    setFocused(false)
    onBlur?.(e)
  }

  return (
    <input
      inputMode="decimal"
      data-slot="input"
      className={cn(
        'h-7 w-full min-w-0 rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-xs/relaxed dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
        className,
      )}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...props}
    />
  )
}

export { NumericInput }
