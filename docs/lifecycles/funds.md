# Business funds lifecycle

Source: `apps/api/src/features/funds/`.

Business funds represent owner capital, not borrower or depositor money. All fund endpoints are admin-only.

| Operation | State and ledger effect |
| --- | --- |
| Add fund | Creates an active `BusinessFund`, `CapitalEntry` `INFLOW/BUSINESS_CAPITAL`, and audit log. |
| Withdraw fund | Transitions the fund to `WITHDRAWN`, creates `OUTFLOW/BUSINESS_CAPITAL`, and audits the action. |
| List | Reads funds by status with cursor pagination. |

Fund creation and withdrawal write the record, capital ledger entry, and audit event in one transaction. The capital ledger is the downstream source for Net Capital reporting. Do not add a second ledger entry for a correction without a documented accounting policy.

Use `funds.service.test.ts` for role-independent service behavior and capital-entry consistency.
