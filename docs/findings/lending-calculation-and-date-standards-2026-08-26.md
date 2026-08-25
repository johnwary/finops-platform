# Lending Calculation and Date Standards

Researched: 2026-08-26

Scope: independent guidance for the loan-schedule and backdated-disbursement risks identified in the audit. This is not jurisdiction-specific legal advice. The product's governing contract, local lending rules, and accounting policy remain controlling.

## Recommendation

1. Treat money as integer minor units at the point an installment is made contractual. Calculate internally at high precision, round each collectible payment to cents, and make the final payment the remaining non-negative balance. Do not solve rounding by creating a negative principal or payment amount.
2. Make each loan product state its accrual convention: payment frequency, day-count basis, first-payment rule, and business-day rule. Generate the schedule from actual contractual due dates, including an explicitly supported odd first or final period. Do not infer a weekly or biweekly installment count from a monthly term.
3. Preserve two dates for a disbursement: the contractual/effective date and the immutable posting or settlement timestamp. Cash and capital reports must use the cash-movement date selected by accounting policy; loan-cohort reporting can use the contractual disbursement date. A retroactive effective date must not silently move already-posted cash reporting.

## Evidence

### Rounding and final installments

The CFPB's official Regulation Z commentary states that, because payments cannot be collected in fractional cents, exact amortization using equal payments can be difficult and the final payment may be adjusted for earlier cent rounding. It also treats a final payment different only because of fractional-cent rounding as a regular payment, not a balloon payment. This supports a positive final reconciliation payment, not a negative one. [CFPB, 12 CFR 1026.17 commentary](https://www.consumerfinance.gov/rules-policy/regulations/1026/interp-17/) and [CFPB, 12 CFR 1026.37 commentary](https://www.consumerfinance.gov/rules-policy/regulations/1026/interp-37/).

For APR calculations, Regulation Z Appendix J says calculations should carry all available decimals and expressly supports irregular final payments. [CFPB, Appendix J](https://www.consumerfinance.gov/rules-policy/regulations/1026/j/). Freddie Mac similarly requires interest-calculation factors to retain at least six decimal places before rounding, then applies the remainder to principal. [Freddie Mac Servicing Guide, 8103.3](https://guide.freddiemac.com/ci/okcsFattach/get/1002095_2).

### Frequency, periods, and day count

Appendix J defines a period as the interval between advances or payments. It recognizes days, weeks, months, and multiples of weeks or months; uses the most frequent common period as the unit period; measures days as 24-hour intervals; and specifies 365 day periods or 52 weekly periods per year for those respective unit periods. It also prescribes how irregular fractions are handled. [CFPB, Appendix J](https://www.consumerfinance.gov/rules-policy/regulations/1026/j/).

The CFPB requires a closed-end repayment schedule to disclose the number, amount, and timing of payments. For a frequency-based schedule, the payment frequency plus the beginning calendar date and payment count define the due dates. [CFPB, 12 CFR 1026.18(g)](https://www.consumerfinance.gov/rules-policy/regulations/1026/2023-05-15/18/). Its disclosure commentary explicitly recognizes bi-weekly schedules. [CFPB, 12 CFR 1026.37 commentary](https://www.consumerfinance.gov/rules-policy/regulations/1026/interp-37/).

### Effective, posting, and cash dates

IAS 7 defines cash as cash on hand and demand deposits, requires reporting cash flows during the period, and identifies advances and repayments for financial institutions as cash-flow activity. [IFRS, IAS 7](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2022/issued/part-a/ias-7-statement-of-cash-flows.pdf?bypass=on). IFRIC's cash-transfer analysis concludes cash is recognised when it is deposited in the bank account, unless another financial asset is received earlier. [IFRS Interpretations Committee, September 2021](https://www.ifrs.org/news-and-events/updates/ifric/2021/ifric-update-september-2021/).

For customer payments, Regulation Z requires credit as of receipt, while allowing a later system posting if the delay creates no charge. This distinguishes the economic credit date from operational posting. [CFPB, 12 CFR 1026.10](https://www.consumerfinance.gov/rules-policy/regulations/1026/10/).

## Smallest safe product decisions

For the current schedule defect, allocate principal cents across installments so their sum exactly equals the principal and none is negative. Keep any broader interest-method change separate until the business chooses a convention.

For weekly, biweekly, and daily products, choose and document one convention per product before changing calculations. A reasonable default is actual contractual due dates plus Actual/365 accrual, but it must agree with the signed terms and local regulatory requirements.

For backdated disbursements, keep `disbursedAt` as the contractual date and add or use an immutable cash-posting or settlement date for cash reports. If historical corrections are needed, record an adjustment rather than rewriting the original cash event.
