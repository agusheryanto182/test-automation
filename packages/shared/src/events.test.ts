import { describe, expect, it } from 'vitest';
import {
  createOrderInputSchema,
  orderCreatedEventSchema,
  type OrderCreatedEvent,
} from './events.js';

describe('createOrderInputSchema', () => {
  const ok = { customerEmail: 'a@example.com', item: 'book', amount: 100 };

  it('accepts valid input', () => {
    expect(createOrderInputSchema.parse(ok)).toEqual(ok);
  });

  it.each([{ customerEmail: 'nope' }, { item: '' }, { amount: 0 }, { amount: 1.5 }])(
    'rejects %j',
    (override) => {
      expect(createOrderInputSchema.safeParse({ ...ok, ...override }).success).toBe(false);
    },
  );
});

const valid: OrderCreatedEvent = {
  eventId: crypto.randomUUID(),
  type: 'order.created',
  occurredAt: new Date().toISOString(),
  payload: { orderId: 'o1', customerEmail: 'a@example.com', item: 'book', amount: 100 },
};

describe('orderCreatedEventSchema', () => {
  it('accepts a valid event', () => {
    expect(orderCreatedEventSchema.parse(valid)).toEqual(valid);
  });

  it.each([
    ['bad eventId', { ...valid, eventId: 'nope' }],
    ['wrong type', { ...valid, type: 'order.updated' }],
    ['bad date', { ...valid, occurredAt: 'yesterday' }],
    ['bad email', { ...valid, payload: { ...valid.payload, customerEmail: 'x' } }],
    ['string amount', { ...valid, payload: { ...valid.payload, amount: '1' } }],
  ])('rejects %s', (_name, input) => {
    expect(orderCreatedEventSchema.safeParse(input).success).toBe(false);
  });
});
