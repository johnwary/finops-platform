# Borrower Status — Deferred Feature

## What

Add an explicit `status` field to the `Borrower` model using a `BorrowerStatus` enum.

```prisma
enum BorrowerStatus {
  PENDING     // profile created, KYC under review
  ACTIVE      // KYC cleared, has or had active loans
  BLACKLISTED // flagged — blocks new loan creation
  EXITED      // all accounts closed, relationship ended
}

model Borrower {
  // ...existing fields...
  status      BorrowerStatus @default(PENDING)
  blacklistReason String?
}
```

## Why Deferred

YAGNI — no current client requirement. Status is currently implied by loan activity.

## When to Implement

When a client needs any of:
- Block blacklisted borrowers from applying (currently no schema-level guard)
- Show borrower status on list/detail UI without computing from loans
- KYC approval workflow with explicit approval tracking
- Exited/churned borrower reporting

## Reference

Industry standard: Mambu client lifecycle (`PENDING → ACTIVE → BLACKLISTED → EXITED`).
See [Mambu Client Life Cycle](https://docs.mambu.com/docs/client-life-cycle/).
