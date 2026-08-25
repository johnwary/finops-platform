# Reporting lifecycle

Source: `apps/api/src/features/reports/` and `apps/api/src/jobs/autoDefault.job.ts`.

Reports are read models available to admins and managers. They do not mutate financial data.

| Report | Inputs | Source records |
| --- | --- | --- |
| Summary | period | Loans, unreversed loan payments, unreversed capital entries, borrowers |
| Overdue | cursor, limit | Outstanding loans with an `OVERDUE` installment |
| Portfolio at risk | none | Outstanding principal on loans with an overdue installment |

Collections are grouped by `LoanPayment.paidAt`; capital movement is grouped by `CapitalEntry.recordedAt`. Reversed payments and capital entries are excluded. Historical collections retain payments after a loan soft delete; portfolio rollups exclude deleted loans.

The daily Manila-time job marks past-due scheduled installments overdue, then evaluates the earliest currently overdue installment under a loan row lock before defaulting. Provision basis is the locked loan's current principal balance.

Use `reports.service.test.ts` for aggregation filters and output totals, and `autoDefault.job.test.ts` for overdue and concurrent-transition safety.
