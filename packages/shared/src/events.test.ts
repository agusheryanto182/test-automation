import { describe, expect, it } from 'vitest';
import { orderCreatedEventSchema, type OrderCreatedEvent } from './events.js';

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
