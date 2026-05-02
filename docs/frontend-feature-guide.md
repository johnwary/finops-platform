# Frontend Feature Guide

This guide describes how to add a frontend feature or module from an available backend API contract. It uses borrowers as the example, but the same sequence applies to loans, deposits, reports, settings, or any new domain feature.

## Mental Model

Frontend work should be built as a vertical slice:

```txt
backend endpoint contract
-> frontend types
-> frontend schemas
-> API hooks
-> UI components
-> page
-> route/nav
-> verification
```

Start from what the API accepts and returns. Do not start by designing components in isolation. The screen is only useful when it correctly reflects the backend contract and the user workflow.

## Manual Coding Workflow

When you want to code manually, avoid opening every file at once. Work in small passes and make each layer compile before moving upward.

Recommended order:

```txt
1. types.ts
2. schemas.ts
3. one read hook
4. one simple page that renders real data
5. route
6. table/list component
7. create form
8. create mutation hook
9. edit/delete/detail flows
10. polish states and role gates
```

This keeps the work grounded. You should be able to answer one question at every step:

```txt
types.ts       What does the API return?
schemas.ts     What does the user submit?
hooks          How does the browser talk to the API?
page           What workflow is this screen responsible for?
components     What repeated UI or dense section can be isolated?
utils          What logic must stay consistent in multiple places?
route/nav      How does the user reach this workflow?
```

For a new module like borrowers, do not start with the full CRUD UI. Start with the smallest useful read path:

```txt
GET /api/v1/borrowers
-> useBorrowers()
-> BorrowersListPage
-> route /dashboard/borrowers
```

Once the list renders, add create. Once create works, add detail. Once detail works, add update/delete. This is slower than generating a full feature at once, but it makes the system easier to understand and debug.

## Manual Coding Rules Of Thumb

- Type the first version plainly. Refactor only after it works.
- Keep API calls out of components. Components should call hooks.
- Keep form validation in `schemas.ts`, not scattered across JSX.
- Keep API response types in `types.ts`, not inline in hooks.
- Prefer boring names: `Borrower`, `CreateBorrowerInput`, `useBorrowers`, `BorrowerForm`.
- Do not create `utils.ts` just because the folder usually has one.
- Do not create a detail page until you know what the detail endpoint returns.
- Do not add role-gated buttons until the basic action works.
- Do not add pagination UI until the first list fetch works.
- Run typecheck often; it catches wrong assumptions earlier than the browser.

## 1. Read The Backend Contract

Before writing frontend code, inspect the backend feature files:

```txt
apps/api/src/features/borrowers/borrowers.router.ts
apps/api/src/features/borrowers/borrowers.schema.ts
apps/api/src/features/borrowers/borrowers.controller.ts
apps/api/src/features/borrowers/borrowers.service.ts
```

For borrowers, the backend routes are:

```txt
GET    /api/v1/borrowers
GET    /api/v1/borrowers/:id
POST   /api/v1/borrowers
PATCH  /api/v1/borrowers/:id
DELETE /api/v1/borrowers/:id
```

The router tells you:

- URL paths
- HTTP methods
- required roles
- request body schemas
- query schemas
- params schemas

The backend Zod schema tells you the request shape. For example, borrower creation needs fields like `name`, `email`, `phone`, `address`, `dateOfBirth`, `gender`, `idType`, and `incomeSource`.

## 2. Create The Feature Folder

Frontend domain code should live under one feature folder:

```txt
apps/web/src/features/borrowers/
├── BorrowerDetailPage.tsx
├── BorrowersListPage.tsx
├── components/
│   ├── BorrowerForm.tsx
│   ├── BorrowerTable.tsx
│   └── BorrowerStatusBadge.tsx
├── hooks/
│   ├── useBorrower.ts
│   ├── useBorrowers.ts
│   ├── useCreateBorrower.ts
│   ├── useUpdateBorrower.ts
│   └── useDeleteBorrower.ts
├── schemas.ts
├── types.ts
└── utils.ts
```

Only create files you need now. For example, if there is no borrower status, do not create `BorrowerStatusBadge.tsx`.

## 3. Define Frontend Types

Create `features/borrowers/types.ts` for API response shapes and domain enums.

Use this layer for TypeScript contracts used by hooks, pages, and components:

```ts
export type Gender = 'MALE' | 'FEMALE'

export type IdType = 'NATIONAL_ID' | 'PASSPORT' | 'DRIVER_LICENSE'

export type IncomeSource = 'EMPLOYMENT' | 'BUSINESS' | 'PENSION' | 'OTHER'

export interface Borrower {
  id: string
  name: string
  email: string
  phone: string
  address: string
  dateOfBirth: string
  gender: Gender
  idType: IdType
  idNumber: string
  occupation: string | null
  incomeSource: IncomeSource
  monthlyIncome: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}
```

Use the backend response as the source of truth. If Prisma decimals or dates come back as strings, type them as strings in the frontend.

## 4. Define Frontend Schemas

Create `features/borrowers/schemas.ts` for form validation.

This usually mirrors the backend Zod schema, but it does not always match perfectly. The frontend schema validates what the form collects. The backend schema validates what the API accepts.

Examples of valid differences:

- frontend date input is a `string`; backend coerces to `Date`
- frontend percent input may be `0-100`; backend may expect `0-1`
- frontend optional number fields may need empty-string handling before submit
- frontend can show friendlier validation messages

Use React Hook Form with `zodResolver`. Do not manage form fields with one `useState` per input.

## 5. Add API Hooks

Hooks are the main frontend integration layer. They live in `features/borrowers/hooks/`.

Use one hook per query or mutation:

```txt
useBorrowers        -> GET /api/v1/borrowers
useBorrower         -> GET /api/v1/borrowers/:id
useCreateBorrower   -> POST /api/v1/borrowers
useUpdateBorrower   -> PATCH /api/v1/borrowers/:id
useDeleteBorrower   -> DELETE /api/v1/borrowers/:id
```

Use the shared API client:

```ts
import { apiFetch, apiFetchList, apiFetchVoid } from '@/lib/api'
```

Use React Query for all server state:

```ts
return useQuery({
  queryKey: ['borrowers', params],
  queryFn: () => apiFetchList<Borrower>(`/api/v1/borrowers${qs ? `?${qs}` : ''}`),
  staleTime: 3 * 60 * 1000,
})
```

For mutations, invalidate affected queries:

```ts
queryClient.invalidateQueries({ queryKey: ['borrowers'] })
queryClient.invalidateQueries({ queryKey: ['borrowers', id] })
```

Use stable query keys:

```txt
['borrowers']              all borrower lists
['borrowers', params]      filtered borrower list
['borrowers', id]          one borrower detail
```

## 6. Build Components Around Workflows

Components should support a clear user workflow:

- list records
- search/filter records
- create a record
- view details
- update a record
- delete or archive a record

Common split:

```txt
BorrowersListPage.tsx
  -> owns page state like search, selected filters, sheet open/close

BorrowerTable.tsx
  -> renders list data, empty state, loading state, row actions

BorrowerForm.tsx
  -> owns React Hook Form, validation display, submit button state

BorrowerDetailPage.tsx
  -> fetches one record, renders details and actions
```

Keep components focused. If a page gets too large, extract repeated or dense sections into components.

## 7. Use Utils Only When They Earn Their Place

Do not create helpers first. Extract them when logic is reused, noisy, or important for consistency.

Use `features/borrowers/utils.ts` for borrower-specific display/domain helpers:

```ts
export const GENDER_LABELS = {
  MALE: 'Male',
  FEMALE: 'Female',
} as const

export const ID_TYPE_LABELS = {
  NATIONAL_ID: 'National ID',
  PASSPORT: 'Passport',
  DRIVER_LICENSE: "Driver's License",
} as const
```

Good candidates for feature utils:

- enum-to-label maps
- currency formatting
- percentage formatting
- date formatting
- status-to-badge variants
- query parameter builders used by multiple hooks/components

Keep one-off logic inside the component.

## 8. Wire The Route

Add routes in:

```txt
apps/web/src/router.tsx
```

Example:

```tsx
{
  path: 'borrowers',
  element: <BorrowersListPage />,
},
{
  path: 'borrowers/:id',
  element: <BorrowerDetailPage />,
},
```

Use existing route protection:

- `ProtectedRoute` protects authenticated app pages
- `RequireRole` gates UI actions by role

Frontend role gates are only UX. The backend still enforces real permissions.

## 9. Add Navigation

If the feature needs sidebar access, update:

```txt
apps/web/src/components/layout/nav-config.ts
```

Add the page where users naturally expect it. Do not add nav items for unfinished screens.

## 10. Handle Loading, Empty, Error, And Success States

Every list/detail page should handle:

- loading state
- error state
- empty state
- successful loaded state

Every mutation should handle:

- pending button state
- disabled submit state
- success toast
- visible API error
- query invalidation

Use Sonner for action feedback. Use inline form errors for validation feedback.

## 11. Match The Existing UI System

Use existing shared components from:

```txt
apps/web/src/components/ui/
```

Prefer existing primitives before adding new UI dependencies. This app uses shadcn-style components, Tailwind, React Hook Form, Zod, React Query, and Sonner.

Use `@/` absolute imports. Avoid deep relative imports like `../../../`.

## 12. Verify The Feature

For frontend-only work, run:

```txt
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web build
```

For full integration work, run the app:

```txt
pnpm dev
```

Then manually verify:

- route loads
- list request fires
- create/update/delete actions call the expected endpoint
- roles hide actions correctly
- API errors display clearly
- successful mutations refresh stale data
- mobile layout is usable

## Feature Checklist

Use this checklist when starting any new frontend module:

- Read backend router, schema, controller, and service.
- List every endpoint the UI needs.
- Identify roles required for each action.
- Create `features/[name]/types.ts`.
- Create `features/[name]/schemas.ts` for forms.
- Create React Query hooks for each query/mutation.
- Build forms with React Hook Form and Zod.
- Build list/detail pages around real workflows.
- Extract feature utils only when reused or clarifying.
- Add routes in `router.tsx`.
- Add sidebar nav only when the page is ready.
- Add loading, error, empty, and success states.
- Invalidate React Query keys after mutations.
- Run typecheck, lint, and build.
