import { z } from 'zod';

export const orderCreatedPayloadSchema = z.object({
  orderId: z.string().min(1),
  customerEmail: z.email(),
  item: z.string().min(1),
  amount: z.number(),
});

export const orderCreatedEventSchema = z.object({
  eventId: z.uuid(),
  type: z.literal('order.created'),
  occurredAt: z.iso.datetime(),
  payload: orderCreatedPayloadSchema,
});

export type OrderCreatedPayload = z.infer<typeof orderCreatedPayloadSchema>;
export type OrderCreatedEvent = z.infer<typeof orderCreatedEventSchema>;
