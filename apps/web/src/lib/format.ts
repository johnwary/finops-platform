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
