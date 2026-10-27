import type { ConfirmChannel } from 'amqplib';
import {
  orderCreatedEventSchema,
  ORDER_CREATED_ROUTING_KEY,
  TOPOLOGY,
  type OrderCreatedEvent,
  type Topology,
} from '@app/shared';

/**
 * Validates and publishes an `order.created` event to the events exchange.
 * Resolves once the broker confirms the message; rejects on validation error,
 * a nack from the broker, or a channel failure.
 */
export async function publishOrderCreated(
  channel: ConfirmChannel,
  event: OrderCreatedEvent,
  topology: Pick<Topology, 'eventsExchange'> = TOPOLOGY,
): Promise<void> {
  const valid = orderCreatedEventSchema.parse(event);
  const body = Buffer.from(JSON.stringify(valid));

  await new Promise<void>((resolve, reject) => {
    channel.publish(
      topology.eventsExchange,
      ORDER_CREATED_ROUTING_KEY,
      body,
      { persistent: true, contentType: 'application/json', messageId: valid.eventId },
      (err) => (err ? reject(err) : resolve()),
    );
  });
}
