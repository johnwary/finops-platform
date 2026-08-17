export function DemoBanner() {
  if (import.meta.env.VITE_DEMO_MODE !== 'true') {
    return null
  }

  return (
    <div className="flex shrink-0 items-center justify-center bg-amber-500 px-4 py-1.5 text-center text-sm font-medium text-amber-950">
      Demo environment - sample data only, not for production use
    </div>
  )
}
