# Frontend Feature Triage

Before writing any frontend code, triage the feature. The goal is to find out how much already exists and where to start building.

The frontend chain runs in one direction — each layer depends on the one below it:

```txt
API contract (backend)
  -> types.ts         what does the response look like in TypeScript?
  -> schemas.ts       what does the user submit via a form?
  -> hooks/           how does the browser talk to the API?
  -> components/      what does the user see and interact with?
  -> router.tsx       how does the user get there?
  -> nav-config.ts    is it in the sidebar?
```

You cannot write a hook without types. You cannot write a form without a schema. You cannot wire a route without a page component. Work bottom-up, one layer at a time, and make each layer compile before moving up.

---

## The Triage Order

```txt
1. Understand the feature in plain language
2. Read the API contract
3. Check types.ts
4. Check schemas.ts
5. Check hooks/
6. Check components/
7. Check router.tsx and nav-config.ts
8. Decide: extend or build new
```

The API contract is king on the frontend — the same way the Prisma model is king on the backend. Everything you build derives from what the API returns and accepts.

---

## Step 1. Understand the Feature in Plain Language

Before opening any file, answer these questions:

```txt
- What does the user need to do? (view a list, fill a form, trigger an action)
- What data does the screen need to display?
- What actions can the user take? (create, update, delete, trigger a transition)
- Who can use it? (which roles see or interact with it)
- Does it have status-driven UI? (different actions available depending on record state)
```

Example:

> "Deposits — managers and admins can see a list of deposits, open a deposit detail, activate a pending deposit, record a payout, and close an active deposit. Each action is a separate form in a sheet. The action buttons shown depend on the deposit's current status."

This tells you:
- List page + detail page needed
- Status-driven action buttons (conditional rendering based on `deposit.status`)
- Multiple transition forms: activate, payout, close
- RBAC: admin and manager only
- Multiple hooks: `useDeposits`, `useDeposit`, `useActivateDeposit`, `useRecordDepositPayout`, `useCloseDeposit`

If you cannot answer these questions, the feature is not ready to build.

---

## Step 2. Read the API Contract

Open the backend feature files before writing a single frontend line:

```txt
apps/api/src/features/[name]/[name].router.ts
apps/api/src/features/[name]/[name].schema.ts
```

The router tells you:
- Every available endpoint and HTTP method
- Which roles are required per route
- What the request body, query params, and URL params look like

The schema tells you:
- Every field the API accepts
- Which fields are required vs optional
- Types, formats, and validation rules (enums, regex, min/max)

Map out every endpoint the feature needs before writing types or hooks:

```txt
GET    /api/v1/deposits           -> list hook, list page
GET    /api/v1/deposits/:id       -> detail hook, detail page
POST   /api/v1/deposits           -> create mutation, create form
POST   /api/v1/deposits/:id/activate  -> transition mutation, activate form
POST   /api/v1/deposits/:id/payout    -> transition mutation, payout form
POST   /api/v1/deposits/:id/close     -> transition mutation, close form
```

If an endpoint does not exist yet, stop. The API must exist before the frontend can consume it. Run API triage first (see `api-feature-triage.md`).

---

## Step 3. Check types.ts

Open:

```txt
apps/web/src/features/[name]/types.ts
```

Types represent what the API **returns**. They are the TypeScript contract for response shapes.

Look for:
- Is there a type for the list item shape? (often a slimmer version of the full record)
- Is there a type for the full detail shape?
- Are all enums defined?
- Do the types match what the API actually returns today?

Example from borrowers:

```ts
// List item — lean, only what the table needs
export interface BorrowerListItem {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  _count: { loans: number }
}

// Full detail — all fields, used on detail page
export interface BorrowerDetail extends Borrower {
  loans: BorrowerLoanSummary[]
}
```

### Outcomes

| What you find | What it means |
|---|---|
| Types exist and match API response | Skip to Step 4 |
| Types exist but are missing fields | Add the missing fields |
| Types exist but wrong shape | Correct them against the API response |
| No types file | Create `types.ts` — this is your first task |

**Important:** Prisma `Decimal` fields come back as strings over JSON. Type them as `string`, not `number`. Dates come back as ISO strings — type them as `string`.

---

## Step 4. Check schemas.ts

Open:

```txt
apps/web/src/features/[name]/schemas.ts
```

Schemas represent what the user **submits** via forms. They feed React Hook Form via `zodResolver`.

Look for:
- Is there a schema for the create form?
- Is there a schema for each transition form (if the feature has state transitions)?
- Are frontend-specific transformations handled? (empty string → undefined, string date → keep as string)

Frontend schemas are **not** identical to backend schemas. Differences are intentional:

```txt
Backend: dateOfBirth: z.coerce.date()   — backend coerces string to Date object
Frontend: dateOfBirth: z.string().min(1) — frontend keeps it as string (HTML date input)

Backend: monthlyIncome: z.number().positive().optional()
Frontend: same, but may need empty string handling before submit

Backend: occupation: z.string().max(255).optional()
Frontend: occupation: z.string().trim().max(255).transform(val => val === '' ? undefined : val).optional()
          — empty string from input must be converted to undefined before sending
```

Each form gets its own schema. Transition forms are separate schemas:

```ts
export const activateDepositSchema = z.object({
  activatedAt: z.string().min(1, { message: 'Activation date required' }),
})

export const depositPayoutSchema = z.object({
  amount: z.number().positive({ message: 'Must be positive' }),
  payoutDate: z.string().min(1, { message: 'Payout date required' }),
  notes: z.string().trim().max(1000).transform(val => val === '' ? undefined : val).optional(),
})

export type ActivateDepositInput = z.infer<typeof activateDepositSchema>
export type DepositPayoutInput = z.infer<typeof depositPayoutSchema>
```

### Outcomes

| What you find | What it means |
|---|---|
| Schemas exist for all forms needed | Skip to Step 5 |
| Schemas exist but missing transition schemas | Add schemas for the missing transitions |
| No schemas file | Create `schemas.ts` |

---

## Step 5. Check hooks/

Open:

```txt
apps/web/src/features/[name]/hooks/
```

Hooks are the integration layer — they own all API communication. Components never call `fetch` directly.

There are two kinds:

**Query hooks** — read data, use `useQuery`:

```ts
// useBorrowers.ts
export function useBorrowers(params?: UseBorrowersParams) {
  return useQuery({
    queryKey: ['borrowers', { ...params }],
    queryFn: () => apiFetchList<BorrowerListItem>(`/api/v1/borrowers${qs}`),
    staleTime: 3 * 60 * 1000,
  })
}
```

**Mutation hooks** — write data or trigger transitions, use `useMutation`:

```ts
// useApproveLoan.ts
export function useApproveLoan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & ApproveLoanInput) =>
      apiFetch<Loan>(`/api/v1/loans/${id}/approve`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (_, { id }) => {
      toast.success('Loan approved.')
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['loans', id] })
    },
  })
}
```

Look for:
- Is there a hook for every endpoint the feature needs?
- Do query hooks use stable `queryKey` arrays?
- Do mutation hooks invalidate the right query keys after success?
- Do mutation hooks show a Sonner toast on success?

### Query Key Convention

```txt
['deposits']                       // all deposit lists
['deposits', { search, cursor }]   // filtered list
['deposits', id]                   // one deposit detail
```

Mutation `onSuccess` must invalidate both the list and detail keys so stale data refreshes immediately after a write.

### API Client Functions

Use the shared functions from `@/lib/api`:

```txt
apiFetch<T>()       — single resource (GET one, POST, PATCH) → returns T
apiFetchList<T>()   — paginated list (GET many) → returns { data: T[], meta: ListMeta }
apiFetchVoid()      — no response body (DELETE) → returns void
```

### Outcomes

| What you find | What it means |
|---|---|
| All needed hooks exist | Skip to Step 6 |
| Query hooks exist, mutation hooks missing | Add mutation hooks |
| Hooks exist but missing invalidation | Fix `onSuccess` to invalidate correct keys |
| No hooks folder | Create hooks — one file per hook |

---

## Step 6. Check components/

Open:

```txt
apps/web/src/features/[name]/components/
```

This is where the UI lives. Check what already exists before building.

### What to look for

**List page** — does a list page exist? Does it handle loading, empty, and error states?

**Detail page** — does a detail page exist? Does it show the full record and available actions?

**Table component** — does a table component exist? Does it render the list data?

**Forms** — does a create form exist? Does a form exist for each transition?

**Status badge** — if the feature has a status field, does a badge component exist?

### State Inventory

When looking at existing components, identify what state they manage:

**Server state** — lives in React Query hooks. Never in `useState` or Zustand.

```ts
const { data, isLoading, error } = useBorrowers({ search })
```

**UI state** — lives in `useState` inside the component that owns it.

```ts
const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false)
const [selectedBorrowerId, setSelectedBorrowerId] = useState<string | null>(null)
```

**Form state** — lives in React Hook Form. Never in `useState` per field.

```ts
const { register, handleSubmit, formState: { errors } } = useForm<CreateBorrowerInput>({
  resolver: zodResolver(createBorrowerSchema),
})
```

**Global UI state** — sidebar open/close, theme. Lives in Zustand. Never server data.

### Status-Driven UI

If the feature has a status field, components render different actions based on current status. This is not complex logic — it is just conditional rendering:

```tsx
// Show activate button only if status is PENDING
{deposit.status === 'PENDING' && canManage && (
  <Button onClick={() => setActivateOpen(true)}>Activate</Button>
)}

// Show payout button only if status is ACTIVE
{deposit.status === 'ACTIVE' && canManage && (
  <Button onClick={() => setPayoutOpen(true)}>Record Payout</Button>
)}
```

Role gates wrap the action elements. The backend enforces roles — the frontend just hides or shows buttons:

```tsx
<RequireRole role={['admin', 'manager']}>
  <Button onClick={handleDelete}>Delete</Button>
</RequireRole>
```

### Outcomes

| What you find | What it means |
|---|---|
| List + detail pages exist, all states handled | Skip to Step 7 |
| List page exists, no detail page | Build detail page |
| Components exist but missing forms for transitions | Add transition forms |
| No components folder | Build from scratch — start with list page |

---

## Step 7. Check router.tsx and nav-config.ts

Open:

```txt
apps/web/src/router.tsx
apps/web/src/components/layout/nav-config.ts
```

**router.tsx** — check if routes exist for the feature's pages.

The router nests all authenticated pages under `ProtectedRoute` → `AppShell`:

```tsx
// Existing pattern — replicate this
{
  path: 'deposits',
  element: <DepositsListPage />,
},
{
  path: 'deposits/:id',
  element: <DepositDetailPage />,
},
```

Admin-only pages get wrapped in `RequireRole`:

```tsx
{
  path: 'settings',
  element: (
    <RequireRole role="admin">
      <SettingsPage />
    </RequireRole>
  ),
},
```

**nav-config.ts** — check if a sidebar entry exists for the feature. Only add nav items when the page is ready to use. Do not add nav entries for in-progress screens.

### Outcomes

| What you find | What it means |
|---|---|
| Routes and nav entry exist | Feature is fully wired — verify it works |
| Routes exist, no nav entry | Add nav entry if page is ready |
| No routes | Add routes — import the page component first |

---

## Step 8. Decide — Extend or Build New

After triage, you land in one of these states:

### A. Everything exists — just verify

All layers present. Open the app, test the feature. Fix what's broken or incomplete.

### B. Hooks and types exist, components missing

The API integration is done. Build the UI layer only.

```txt
New files: components/[Feature]ListPage.tsx, components/[Feature]DetailPage.tsx, etc.
Changed files: router.tsx, nav-config.ts
```

### C. Types exist, hooks and components missing

Start at hooks. Build hooks first, then components.

```txt
New files: hooks/use[Feature].ts, hooks/use[Action].ts, components/...
Changed files: router.tsx, nav-config.ts
```

### D. Nothing exists for this feature

Build from scratch in layer order: types → schemas → hooks → components → router → nav.

```txt
New files: types.ts, schemas.ts, hooks/*, components/*
Changed files: router.tsx, nav-config.ts
```

### E. Feature partially exists but is missing transition support

CRUD works but status transitions have no UI. Add transition schemas, mutation hooks, and form components. Wire them into the detail page behind status guards.

```txt
New files: hooks/use[Transition].ts (one per transition), components/[Transition]Form.tsx
Changed files: schemas.ts, components/[Feature]DetailPage.tsx
```

---

## Triage Checklist

Run through this before writing any code:

```txt
[ ] Described the feature in plain language — what the user does, what they see
[ ] Identified roles — who can view, who can act
[ ] Identified status-driven UI — what changes based on record state
[ ] Read backend router — listed every endpoint needed
[ ] Read backend schema — know every field the API accepts and returns
[ ] Checked types.ts — types exist and match current API responses
[ ] Checked schemas.ts — schemas exist for every form and transition
[ ] Checked hooks/ — hooks exist for every query and mutation needed
[ ] Checked components/ — list, detail, forms, status badge accounted for
[ ] Checked router.tsx — routes wired for list and detail pages
[ ] Checked nav-config.ts — nav entry exists if page is ready
[ ] Decided: extend existing or build new
[ ] Know exactly which files need to change
```

---

## Example: Deposits Feature — Full Build

**Plain language:** Admins and managers manage deposits. List page, detail page, create form, plus three transitions: activate, payout, close. Actions shown depend on deposit status.

**API contract check:**
- `GET /api/v1/deposits` — list hook needed
- `GET /api/v1/deposits/:id` — detail hook needed
- `POST /api/v1/deposits` — create mutation + form needed
- `POST /api/v1/deposits/:id/activate` — transition mutation + form needed
- `POST /api/v1/deposits/:id/payout` — transition mutation + form needed
- `POST /api/v1/deposits/:id/close` — transition mutation + form needed

**types.ts:** No file exists. Create with `DepositListItem`, `Deposit`, `DepositStatus` enum.

**schemas.ts:** No file exists. Create with `createDepositSchema`, `activateDepositSchema`, `depositPayoutSchema`, `closeDepositSchema`.

**hooks/:** No folder exists. Create:
- `useDeposits.ts` — query
- `useDeposit.ts` — query
- `useCreateDeposit.ts` — mutation
- `useActivateDeposit.ts` — mutation
- `useRecordDepositPayout.ts` — mutation
- `useCloseDeposit.ts` — mutation

**components/:** No folder exists. Create:
- `DepositsListPage.tsx`
- `DepositDetailPage.tsx`
- `DepositTable.tsx`
- `DepositStatusBadge.tsx`
- `CreateDepositForm.tsx`
- `ActivateDepositForm.tsx`
- `RecordDepositPayoutForm.tsx`
- `CloseDepositForm.tsx`

**router.tsx:** Add `deposits` and `deposits/:id` routes under the dashboard children.

**nav-config.ts:** Add deposits nav entry once the list page is ready.

**Result:** Full build. Follow `frontend-feature-guide.md` layer by layer.

---

## Example: Adding a Field to an Existing Form

**Plain language:** The create borrower form needs a `referredBy` field. The API already accepts it.

**API contract check:** Backend schema already has `referredBy: z.string().optional()`. Route unchanged.

**types.ts:** `Borrower` type needs `referredBy: string | null` added.

**schemas.ts:** `createBorrowerSchema` needs `referredBy` field added.

**hooks/:** `useCreateBorrower` unchanged — it posts the form body as-is.

**components/:** `BorrowerFormFields.tsx` needs the new input field added.

**router.tsx / nav-config.ts:** No changes.

**Result:** Extend only. 3 files change: `types.ts`, `schemas.ts`, `BorrowerFormFields.tsx`.
