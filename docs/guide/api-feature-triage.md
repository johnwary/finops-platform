# API Feature Triage

Before writing any code, triage the feature. The goal is to find out how much already exists and where to start. Building on top of existing data and logic is always cheaper than building new.

Work top-down: understand the feature in plain language first, then investigate the codebase in the order below.

---

## The Triage Order

```txt
1. Understand the feature in plain language
2. Check the Prisma schema
3. Check the router
4. Check the service
5. Decide: extend or build new
```

Data is king. If the model does not exist, nothing else matters — you build from the schema up. If the model exists but the route does not, you start at the router. If both exist, you may only need a service change.

---

## Step 1. Understand the Feature in Plain Language

Before opening any file, answer these questions:

```txt
- What data does this feature need?
- What actions does it perform? (read, create, update, transition)
- Who can use it? (which roles)
- Does it touch one record or many?
- Does it change status or trigger a side effect?
```

Write this out in one or two sentences. Example:

> "Deposits — a borrower can place a deposit. It starts as pending, gets activated, earns periodic payouts, then closes at maturity. Admins and managers manage it. Payouts are recorded as immutable financial records."

This tells you:
- There is a `Deposit` model with a status field
- There is a `DepositPayout` child model (immutable)
- There are state transitions: activate, payout, close
- CRUD + transitions needed, not just CRUD

If you cannot answer these questions, the feature is not ready to build. Clarify the requirements first.

---

## Step 2. Check the Prisma Schema

Open:

```txt
apps/api/prisma/schema.prisma
```

Look for:

- Does the model exist?
- Does it have the fields you need?
- Are related models present (child records, join tables)?
- Are the right indexes there for how you'll query?

### Outcomes

| What you find | What it means |
|---|---|
| Model exists with all needed fields | Skip to Step 3 |
| Model exists but missing fields | Add fields, write a new migration |
| Model exists but wrong types | Add fields with correct types, migrate |
| Model does not exist | Build from scratch — model first |

If you need to add or change the schema:

```bash
pnpm --filter api prisma:migrate    # apply changes
pnpm --filter api prisma:generate   # regenerate client
```

Do not proceed to the router or service until the model is correct. Everything above depends on this.

---

## Step 3. Check the Router

Open the feature router if it exists:

```txt
apps/api/src/features/[name]/[name].router.ts
```

If there is no feature folder yet, the feature does not exist on the API — go to Step 5.

If the folder exists, look at what routes are already registered:

```txt
- What endpoints exist?
- Do any of them already return the data you need?
- Is there a route that almost fits but returns too little?
```

### Outcomes

| What you find | What it means |
|---|---|
| Route exists, returns what you need | No API work needed — go straight to frontend |
| Route exists, returns partial data | Extend the service query (add includes/selects) |
| Route exists for a different method | You may need a new route (e.g. need POST, only GET exists) |
| No route exists | Add the route — but check the service first (Step 4) |

---

## Step 4. Check the Service

Open the feature service:

```txt
apps/api/src/features/[name]/[name].service.ts
```

Even if a route does not exist, the service function you need may already be written. Services sometimes get built ahead of their routes.

Look for:

- Is there a function that queries the data you need?
- Is there a function that performs the action you need?
- Is there logic you can reuse or extend?

### Outcomes

| What you find | What it means |
|---|---|
| Service function exists and does what you need | Add a route + controller that calls it |
| Service function exists but returns too little | Extend the query inside the function |
| Service function partially exists | Extend it — add the missing logic |
| No relevant service function | Write a new one |

---

## Step 5. Decide — Extend or Build New

After triage, you land in one of these situations:

### A. Data exists, route exists — no API work needed

The backend already supports this feature. Move to the frontend.

### B. Data exists, route missing

Write the route and controller. The service may already exist. This is the fastest API path.

```txt
New files: none (or controller if one doesn't exist)
Changed files: [name].router.ts, optionally [name].controller.ts
```

### C. Data exists, service logic missing

Write the service function first, then the controller and route.

```txt
New files: none
Changed files: [name].service.ts, [name].controller.ts, [name].router.ts
```

### D. Model exists, feature is entirely new

Write schemas, service, controller, and router. Follow the full api-feature-guide.md sequence starting from Step 2 (skip the Prisma model step).

### E. Model does not exist

Build from scratch. Follow api-feature-guide.md from Step 1.

```txt
New files: all of them
Changed files: schema.prisma, index.ts
```

---

## Triage Checklist

Run through this before writing any code:

```txt
[ ] Described the feature in plain language
[ ] Identified what data it needs and what actions it performs
[ ] Opened schema.prisma — model exists? fields exist? indexes correct?
[ ] Opened [name].router.ts — route exists? method correct? returns enough?
[ ] Opened [name].service.ts — function exists? logic reusable?
[ ] Decided: extend existing or build new
[ ] Know exactly which files need to change
```

If you cannot check a box, answer it before writing code. Unknown inputs produce wasted work.

---

## Example: Deposits Feature

**Plain language:** A borrower places a deposit. Starts pending, gets activated, earns payouts, closes at maturity. Admins and managers manage it. Payouts are immutable.

**Schema check:**
- No `Deposit` model found.
- No `DepositPayout` model found.
- Decision: build from scratch.

**Result:** Full build. Follow api-feature-guide.md Step 1 through Step 8, including state transitions (activate, payout, close).

---

## Example: Adding Search to an Existing Endpoint

**Plain language:** The loans list needs to be searchable by borrower name.

**Schema check:**
- `Loan` model exists. `Borrower` relation exists.
- No schema changes needed.

**Router check:**
- `GET /api/v1/loans` exists.
- Query params handled via `listLoansSchema`.
- `search` param not in schema yet.

**Service check:**
- `listLoans` function exists.
- No name search logic present.

**Result:** Extend only.
- Add `search` to `listLoansSchema`
- Add name search `where` clause to `listLoans` service function
- No new files needed
