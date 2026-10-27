import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  assertTopology,
  buildTopology,
  connectRabbit,
  type OrderCreatedEvent,
  type RabbitConnection,
} from '@app/shared';
import { publishOrderCreated } from './publisher';

const topology = buildTopology({ prefix: `test-${crypto.randomUUID()}.` });
let rabbit: RabbitConnection;

const makeEvent = (): OrderCreatedEvent => ({
  eventId: crypto.randomUUID(),
  type: 'order.created',
  occurredAt: new Date().toISOString(),
  payload: { orderId: 'o-1', customerEmail: 'a@example.com', item: 'Book', amount: 12.5 },
});

beforeAll(async () => {
  rabbit = await connectRabbit(process.env.RABBITMQ_URL);
  await assertTopology(rabbit.channel, topology);
});

afterAll(async () => {
  const { channel } = rabbit;
  for (const q of [
    topology.notificationsQueue,
    topology.dlqQueue,
    ...topology.retryQueues.map((r) => r.name),
  ]) {
    await channel.deleteQueue(q);
  }
  await channel.deleteExchange(topology.eventsExchange);
  await channel.deleteExchange(topology.dlxExchange);
  await rabbit.close();
});

describe('publishOrderCreated', () => {
  it('lands a persistent message with the same payload in notifications', async () => {
    const event = makeEvent();
    await publishOrderCreated(rabbit.channel, event, topology);

    const msg = await rabbit.channel.get(topology.notificationsQueue, { noAck: true });
    if (!msg) throw new Error('expected message');
    expect(msg.properties.deliveryMode).toBe(2);
    expect(JSON.parse(msg.content.toString())).toEqual(event);
  });

  it('rejects invalid events without publishing', async () => {
    const bad = { ...makeEvent(), eventId: 'nope' };
    await expect(publishOrderCreated(rabbit.channel, bad, topology)).rejects.toThrow();
    expect(await rabbit.channel.get(topology.notificationsQueue, { noAck: true })).toBe(false);
  });

  it('rejects when the publish is not confirmed', async () => {
    const other = await connectRabbit(process.env.RABBITMQ_URL);
    await other.close();
    await expect(publishOrderCreated(other.channel, makeEvent(), topology)).rejects.toThrow();
  });
});
