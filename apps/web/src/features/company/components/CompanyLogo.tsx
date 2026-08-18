import { useState } from 'react'
import { cn } from '@/lib/utils'

interface CompanyLogoProps {
  name: string | undefined
  logoUrl: string | null | undefined
  className?: string
  // Bump this (e.g. a counter incremented on each save) whenever the user
  // actively changes or resubmits the logo, even to the same URL string.
  // Without it, re-selecting a byte-identical file or re-saving a URL that
  // has since become reachable can't be told apart from "still broken."
  attempt?: number
}

// Shared by the sidebar and the settings preview so both degrade identically:
// an uploaded/linked image when there is one, otherwise the company's first
// letter. A logo that 404s falls back too - a broken-image icon in the sidebar
// looks like a bug, an initial looks deliberate.
export function CompanyLogo({ name, logoUrl, className, attempt = 0 }: CompanyLogoProps) {
  // Track which src/attempt pair failed rather than a bare boolean: replacing
  // a broken logo with a working one - or resubmitting the same URL after a
  // transient failure - must re-attempt the image, not stay stuck on the initial.
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const initial = name?.trim().charAt(0).toUpperCase()
  const key = logoUrl ? `${attempt}:${logoUrl}` : null

  if (logoUrl && key !== failedKey) {
    return (
      <img
        src={logoUrl}
        alt=""
        className={cn('size-8 shrink-0 rounded-md object-cover', className)}
        onError={() => setFailedKey(key)}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground',
        className,
      )}
      aria-hidden="true"
    >
      <span className="text-sm font-bold tracking-tight">{initial || '?'}</span>
    </div>
  )
}
