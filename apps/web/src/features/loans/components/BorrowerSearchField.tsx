import { useState, useEffect, useRef } from 'react'
import type { FieldError as RHFFieldError } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { useDebounce } from '@/hooks/use-debounce'
import { useBorrowers } from '@/features/borrowers/hooks/useBorrowers'
import { formatBorrowerName } from '@/features/borrowers/utils'
import type { BorrowerListItem } from '@/features/borrowers/types'

interface BorrowerSearchFieldProps {
  onChange: (id: string) => void
  error?: RHFFieldError
}

export function BorrowerSearchField({ onChange, error }: BorrowerSearchFieldProps) {
  const [inputValue, setInputValue] = useState('')
  const [open, setOpen] = useState(false)
  const [selectedBorrower, setSelectedBorrower] = useState<BorrowerListItem | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const debouncedSearch = useDebounce(inputValue)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const LIMIT = 8

  const { data, isFetching } = useBorrowers(
    open || debouncedSearch ? { search: debouncedSearch || undefined, limit: LIMIT + 1 } : undefined,
  )

  function handleSelect(borrower: BorrowerListItem) {
    setSelectedBorrower(borrower)
    setInputValue('')
    setOpen(false)
    onChange(borrower.id)
  }

  function handleClear() {
    setSelectedBorrower(null)
    setInputValue('')
    onChange('')
  }

  const allResults = data?.data ?? []
  const borrowers = allResults.slice(0, LIMIT)
  const hasMore = allResults.length > LIMIT

  return (
    <Field data-invalid={!!error} ref={containerRef as React.Ref<HTMLDivElement>}>
      <FieldLabel htmlFor="borrower-search">Borrower</FieldLabel>

      {selectedBorrower ? (
        <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm bg-muted">
          <span className="flex-1 font-medium">{formatBorrowerName(selectedBorrower)}</span>
          <button
            type="button"
            onClick={handleClear}
            className="ml-2 text-muted-foreground hover:text-foreground leading-none"
            aria-label="Clear borrower"
          >
            ×
          </button>
        </div>
      ) : (
        <div className="relative">
          <Input
            id="borrower-search"
            placeholder="Search by name, email, or phone…"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            autoComplete="off"
          />

          {open && (
            <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
              {isFetching && borrowers.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                  <Spinner className="size-3" />
                  Searching…
                </div>
              ) : borrowers.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">No borrowers found.</div>
              ) : (
                <>
                  <ul className="py-1">
                    {borrowers.map((b) => (
                      <li key={b.id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground flex justify-between gap-4"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSelect(b)}
                        >
                          <span>{formatBorrowerName(b)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {hasMore && (
                    <div className="border-t px-3 py-1.5 text-xs text-muted-foreground">
                      Type to narrow results
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      <FieldError errors={[error]} />
    </Field>
  )
}
