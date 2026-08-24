# API context

**Capital entry**: An immutable ledger record of money entering or leaving the business. A reversal excludes the original entry; it does not create a compensating entry.

**Payment allocation**: The immutable record of how a loan payment applied penalties, interest, and principal to an installment. A reversed payment's allocation remains for audit history but is excluded from active calculations.

**Outstanding balance**: The principal still owed on a loan. It excludes scheduled interest, penalties, and fees.

**Overdue installment**: An unpaid installment whose due date has passed and whose status is `OVERDUE`.
