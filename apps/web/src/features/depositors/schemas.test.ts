import { describe, expect, it } from 'vitest'
import { createDepositorSchema } from './schemas'

const valid = {
  name: 'Jane Cruz',
  email: 'jane@example.com',
  phone: '09171234567',
  address: '123 Rizal St, Manila',
}

describe('createDepositorSchema', () => {
  it('accepts a valid depositor', () => {
    expect(createDepositorSchema.safeParse(valid).success).toBe(true)
  })
  it('rejects an invalid PH phone', () => {
    expect(createDepositorSchema.safeParse({ ...valid, phone: '12345' }).success).toBe(false)
  })
  it('rejects an invalid email', () => {
    expect(createDepositorSchema.safeParse({ ...valid, email: 'nope' }).success).toBe(false)
  })
})
