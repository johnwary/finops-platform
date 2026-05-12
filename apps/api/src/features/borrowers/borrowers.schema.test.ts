import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBorrowerSchema, updateBorrowerSchema } from './borrowers.schema.js';

const validBorrowerInput = {
  firstName: 'Maria',
  lastName: 'Santos',
  email: 'maria@example.com',
  phone: '+639171234567',
  address: 'Makati City',
  dateOfBirth: '1990-01-01',
  gender: 'FEMALE',
  idType: 'NATIONAL_ID',
  idNumber: 'PH-12345',
  incomeSource: 'EMPLOYMENT',
};

describe('borrowers.schema', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts a borrower who is exactly 18 years old', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-12T12:00:00.000Z'));

    const result = createBorrowerSchema.safeParse({
      ...validBorrowerInput,
      dateOfBirth: '2008-05-12',
    });

    expect(result.success).toBe(true);
  });

  it('rejects a borrower younger than 18 years old on create and update', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-12T12:00:00.000Z'));

    const createResult = createBorrowerSchema.safeParse({
      ...validBorrowerInput,
      dateOfBirth: '2008-05-13',
    });
    const updateResult = updateBorrowerSchema.safeParse({
      dateOfBirth: '2008-05-13',
    });

    expect(createResult.success).toBe(false);
    expect(updateResult.success).toBe(false);
    if (!createResult.success) {
      expect(createResult.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['dateOfBirth'],
            message: 'Borrower must be at least 18 years old',
          }),
        ]),
      );
    }
  });
});
