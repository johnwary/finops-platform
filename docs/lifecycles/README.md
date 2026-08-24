# Module lifecycles

These guides describe the implemented behavior, not desired future behavior. Update the relevant guide in the same change as any new state transition, financial write, reversal rule, or report dependency.

| Module | Guide | Primary records | Financial effect |
| --- | --- | --- | --- |
| Borrowers | [borrowers.md](borrowers.md) | `Borrower` | None |
| Loans and payments | [loans.md](loans.md) | `Loan`, `LoanInstallment`, `LoanPayment` | Disbursement, fee, collection |
| Depositors | [depositors.md](depositors.md) | `Depositor` | None |
| Deposits and payouts | [deposits.md](deposits.md) | `Deposit`, `DepositPayout` | Capital in, return out |
| Business funds | [funds.md](funds.md) | `BusinessFund` | Owner capital in, out |
| Reports | [reports.md](reports.md) | Read models | No writes |
| Platform administration | [platform.md](platform.md) | Invitations, company profile, activity | No financial writes |

## Documentation contract

Each guide names its public API, state changes, authorization, persistence side effects, concurrency boundary, and tests. The source of truth for request shape remains the feature Zod schema; the source of truth for storage remains Prisma.

Financial corrections use the exclusion model: preserve the original record, mark it reversed with actor and reason, and exclude it from active totals. Never hard-delete a financial record or its allocation history.
