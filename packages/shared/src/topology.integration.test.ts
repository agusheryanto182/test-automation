import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectRabbit, type RabbitConnection } from './connection.js';
import {
  assertTopology,
  ATTEMPT_HEADER,
  buildTopology,
  ORDER_CREATED_ROUTING_KEY,
} from './topology.js';

const url = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
const topology = buildTopology({
  prefix: `test-${crypto.randomUUID()}.`,
  retryTtlsMs: [300, 600, 900],
});

let rabbit: RabbitConnection;

beforeAll(async () => {
  rabbit = await connectRabbit(url);
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

async function getWithin(queue: string, ms: number) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const msg = await rabbit.channel.get(queue, { noAck: true });
    if (msg) return msg;
    await new Promise((r) => setTimeout(r, 50));
  }
  return null;
}

describe('assertTopology', () => {
  it('is idempotent', async () => {
    await assertTopology(rabbit.channel, topology);
    await expect(assertTopology(rabbit.channel, topology)).resolves.toBeUndefined();
  });

  it('routes order.created from events to notifications', async () => {
    rabbit.channel.publish(topology.eventsExchange, ORDER_CREATED_ROUTING_KEY, Buffer.from('hi'), {
      persistent: true,
    });
    await rabbit.channel.waitForConfirms();
    const msg = await getWithin(topology.notificationsQueue, 2000);
    expect(msg?.content.toString()).toBe('hi');
  });

  it('returns a message from a retry queue to notifications after the TTL', async () => {
    const [retry] = topology.retryQueues;
    const published = Date.now();
    rabbit.channel.sendToQueue(retry!.name, Buffer.from('retry-me'), {
      persistent: true,
      headers: { [ATTEMPT_HEADER]: 2 },
    });
    await rabbit.channel.waitForConfirms();

    expect(await rabbit.channel.get(topology.notificationsQueue, { noAck: true })).toBe(false);

    const msg = await getWithin(topology.notificationsQueue, 5000);
    expect(msg?.content.toString()).toBe('retry-me');
    expect(msg?.properties.headers?.[ATTEMPT_HEADER]).toBe(2);
    expect(Date.now() - published).toBeGreaterThanOrEqual(250);
  });

  it('dead-letters a rejected notifications message to the DLQ', async () => {
    rabbit.channel.sendToQueue(topology.notificationsQueue, Buffer.from('bad'));
    await rabbit.channel.waitForConfirms();
    const msg = await rabbit.channel.get(topology.notificationsQueue);
    if (!msg) throw new Error('expected message');
    rabbit.channel.nack(msg, false, false);
    const dead = await getWithin(topology.dlqQueue, 2000);
    expect(dead?.content.toString()).toBe('bad');
  });
});
