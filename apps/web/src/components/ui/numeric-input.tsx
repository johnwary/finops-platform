import * as React from 'react'
import { cn } from '@/lib/utils'

interface NumericInputProps extends Omit<React.ComponentProps<'input'>, 'type' | 'onChange' | 'value'> {
  value?: number
  onChange?: (value: number | undefined) => void
  decimalPlaces?: number
}

function formatWithCommas(raw: string, decimalPlaces: number): string {
  if (raw === '' || raw === '-') return raw
  const [intPart, decPart] = raw.split('.')
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  if (decPart !== undefined) {
    return `${formattedInt}.${decPart.slice(0, decimalPlaces)}`
  }
  return formattedInt
}

function stripCommas(str: string): string {
  return str.replace(/,/g, '')
}

function NumericInput({ value, onChange, decimalPlaces = 2, className, onBlur, onFocus, ...props }: NumericInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const valueString = value != null ? String(value) : ''

  const [inputState, setInputState] = React.useState(() => ({
    valueString,
    raw: valueString,
  }))

  if (inputState.valueString !== valueString) {
    setInputState({
      valueString,
      raw: valueString,
    })
  }

  const raw = inputState.valueString === valueString ? inputState.raw : valueString
  const displayValue = formatWithCommas(raw, decimalPlaces)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target
    const cursorPos = input.selectionStart ?? 0
    const prevDisplay = input.value
    const stripped = stripCommas(e.target.value)

    if (stripped !== '' && !/^-?\d*\.?\d*$/.test(stripped)) return

    setInputState((current) => ({ ...current, raw: stripped }))
    const n = parseFloat(stripped)
    onChange?.(stripped === '' || isNaN(n) ? undefined : n)

    // Restore cursor accounting for added/removed commas
    requestAnimationFrame(() => {
      if (!inputRef.current) return
      const newDisplay = formatWithCommas(stripped, decimalPlaces)
      const commasBefore = (prevDisplay.slice(0, cursorPos).match(/,/g) ?? []).length
      const newCommasBefore = (newDisplay.slice(0, cursorPos).match(/,/g) ?? []).length
      const adjusted = cursorPos + (newCommasBefore - commasBefore)
      inputRef.current.setSelectionRange(adjusted, adjusted)
    })
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    onBlur?.(e)
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    onFocus?.(e)
  }

  return (
    <input
      ref={inputRef}
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
