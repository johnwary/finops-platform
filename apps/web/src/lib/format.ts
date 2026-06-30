export function formatPeso(value: string | number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(Number(value))
}

export function formatPercent(raw: string | number): string {
  return (Number(raw) * 100).toFixed(2) + '%'
}

export function todayManilaDateString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
}

export function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-PH').format(value)
}
