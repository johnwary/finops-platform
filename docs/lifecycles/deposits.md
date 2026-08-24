# Deposits and payout lifecycle

Source: `apps/api/src/features/deposits/`.

## State model

`ACTIVE -> WITHDRAWN` or `ACTIVE -> CLOSED`. An active deposit can record payouts and reverse the latest payout. Closed and withdrawn deposits are not active for further payouts.

## Operations and invariants

| Operation | Roles | Required behavior |
| --- | --- | --- |
| Create deposit | admin, manager | Creates an active deposit, capital `INFLOW/DEPOSIT`, and audit log. |
| Record payout | admin, manager | Locks deposit; principal plus return must equal amount; cumulative principal cannot exceed deposit amount; creates capital `OUTFLOW/DEPOSIT_PAYOUT`. |
| Reverse payout | admin | LIFO-only; marks payout and its capital entry reversed, restores cumulative totals, and records reason and actor. |
| Withdraw or close | admin, manager | Locks active deposit, transitions state, and returns only principal not already returned through payouts. |
| Delete | admin | Soft-delete only when no longer active. |

`MATURITY_ONLY` payouts cannot be recorded before the deposit end date. Deposit payouts and capital entries are immutable financial records and use reversal, never deletion.

## Accounting boundary

`Deposit.principalReturned` tracks principal returned through payouts. Terminal withdrawal or closure creates a capital outflow for the remaining principal and deliberately does not overwrite that payout-only total. `totalPayoutPaid` tracks recorded payouts; terminal principal return is represented by the capital entry.

Every multi-record operation runs in one transaction and locks the deposit row to serialize payouts, reversal, close, and withdrawal. Reports use unreversed capital entries.

## Tests to update

Use `deposits.service.test.ts` for payout splits, principal caps, maturity gate, reversal, and terminal-principal behavior.
