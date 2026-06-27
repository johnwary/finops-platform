import { expect, test } from '@playwright/test';

const today = '2026-06-27';

async function selectByLabel(page: import('@playwright/test').Page, label: string, option: string) {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

async function fillById(page: import('@playwright/test').Page, id: string, value: string) {
  await page.locator(`#${id}`).fill(value);
}

test('core lending flow records a receipted payment', async ({ page }) => {
  const consoleProblems: string[] = [];
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      consoleProblems.push(message.text());
    }
  });
  page.on('pageerror', (error) => consoleProblems.push(error.message));
  page.on('response', (response) => {
    if (response.url().includes('/api/') && response.status() >= 400) {
      consoleProblems.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });

  const stamp = Date.now().toString().slice(-6);
  const lastName = `E2EFlow${stamp}`;
  const firstName = 'Lina';

  await page.goto('/login');
  await page.getByLabel(/email/i).fill('admin@example.com');
  await page.getByLabel(/password/i).fill('changeme123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  await page.goto('/dashboard/borrowers');
  await page.getByRole('button', { name: 'New Borrower' }).click();
  await fillById(page, 'lastName', lastName);
  await fillById(page, 'firstName', firstName);
  await fillById(page, 'email', `e2e.${stamp}@example.test`);
  await fillById(page, 'phone', `0917${stamp.padStart(7, '0').slice(0, 7)}`);
  await fillById(page, 'dateOfBirth', '1990-01-15');
  await selectByLabel(page, 'Gender', 'Female');
  await selectByLabel(page, 'ID type', 'National ID');
  await fillById(page, 'idNumber', `E2E-${stamp}`);
  await fillById(page, 'address', '123 E2E Street, Manila');
  await fillById(page, 'occupation', 'Store owner');
  await selectByLabel(page, 'Income source', 'Business');
  await fillById(page, 'monthlyIncome', '55000');
  await page.getByRole('button', { name: 'Create Borrower' }).click();
  await expect(page.getByRole('heading', { name: 'New Borrower' })).toBeHidden();

  await page.goto('/dashboard/loans');
  await page.getByRole('button', { name: 'New Loan' }).click();
  await page.locator('#borrower-search').fill(lastName);
  await page.getByRole('button', { name: `${lastName}, ${firstName}`, exact: true }).click();
  await selectByLabel(page, 'Loan Type', 'Business');
  await fillById(page, 'amount', '12000');
  await fillById(page, 'interestRate', '3');
  await fillById(page, 'termMonths', '6');
  await fillById(page, 'applicationDate', today);
  await fillById(page, 'loanFee', '250');
  await fillById(page, 'penaltyRate', '1');
  await fillById(page, 'purpose', 'Inventory purchase');
  await page.getByRole('button', { name: 'Create Loan' }).click();
  await expect(page.getByRole('heading', { name: 'New Loan' })).toBeHidden();

  await page.getByPlaceholder('Search borrower…').fill(lastName);
  await expect(page.getByText(`${lastName}, ${firstName}`)).toBeVisible();
  await page.getByRole('row').filter({ hasText: lastName }).first().getByRole('link', { name: 'View' }).click();
  await expect(page.getByRole('heading', { name: `${lastName}, ${firstName}` })).toBeVisible();
  await expect(page.getByText('Pending', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Approve' }).click();
  await fillById(page, 'approvedAt', today);
  await page.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Approve Loan' })).toBeHidden();
  await expect(page.getByText('Approved', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Disburse' }).click();
  await selectByLabel(page, 'Disbursement Method', 'GCash');
  await fillById(page, 'disbursedAt', today);
  await page.getByRole('button', { name: 'Disburse', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Disburse Loan' })).toBeHidden();
  await expect(page.getByText('Active', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Record Payment' }).click();
  await fillById(page, 'paymentAmount', '2200');
  await selectByLabel(page, 'Payment Method', 'Cash');
  await fillById(page, 'paidAt', today);
  await fillById(page, 'reference', `E2E-${stamp}`);
  await page.getByRole('button', { name: 'Record Payment' }).click();
  await expect(page.getByRole('heading', { name: 'Record Payment' })).toBeHidden();
  await page.getByRole('tab', { name: /Payments/ }).click();
  await expect(page.getByText(/^RCPT-\d{8}-[0-9A-F]{8}$/)).toBeVisible();

  expect(consoleProblems).toEqual([]);
});
