import { describe, expect, it } from 'vitest';
import { validateOrderForm } from './order-form-validation';

const valid = { customerEmail: 'a@example.com', item: 'Book', amount: '1200' };

describe('validateOrderForm', () => {
  it('accepts valid values and converts amount to a number', () => {
    expect(validateOrderForm(valid)).toEqual({
      success: true,
      data: { customerEmail: 'a@example.com', item: 'Book', amount: 1200 },
    });
  });

  it('trims whitespace', () => {
    const result = validateOrderForm({ ...valid, item: '  Book  ' });
    expect(result.success && result.data.item).toBe('Book');
  });

  it('rejects an invalid email', () => {
    const result = validateOrderForm({ ...valid, customerEmail: 'nope' });
    expect(!result.success && result.errors.customerEmail).toBeTruthy();
  });

  it('rejects an empty item', () => {
    const result = validateOrderForm({ ...valid, item: '  ' });
    expect(!result.success && result.errors.item).toBeTruthy();
  });

  it.each(['', 'abc', '0', '-5', '1.5'])('rejects amount %j', (amount) => {
    const result = validateOrderForm({ ...valid, amount });
    expect(!result.success && result.errors.amount).toBeTruthy();
  });

  it('reports every invalid field at once', () => {
    const result = validateOrderForm({ customerEmail: '', item: '', amount: '' });
    expect(!result.success && Object.keys(result.errors).sort()).toEqual([
      'amount',
      'customerEmail',
      'item',
    ]);
  });
});
