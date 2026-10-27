import type { Channel } from 'amqplib';

export const ATTEMPT_HEADER = 'x-attempt';
export const ORDER_CREATED_ROUTING_KEY = 'order.created';
/** Routing key used on the DLX to reach the DLQ. */
export const DEAD_ROUTING_KEY = 'dead';
/** The AMQP default exchange routes by queue name; retry queues use it to return to `notifications`. */
const DEFAULT_EXCHANGE = '';

export const RETRY_TTLS_MS = { '5s': 5_000, '30s': 30_000, '2m': 120_000 } as const;

export interface RetryQueue {
  name: string;
  ttlMs: number;
}

export interface Topology {
  eventsExchange: string;
  notificationsQueue: string;
  dlxExchange: string;
  dlqQueue: string;
  /** Ordered by attempt: index 0 is used after the first failure. */
  retryQueues: RetryQueue[];
}

export interface TopologyOptions {
  /** Prefix for every name; lets tests use an isolated topology on a shared broker. */
  prefix?: string;
  /** Overrides retry TTLs (ms), in the same order as the default retry queues. */
  retryTtlsMs?: [number, number, number];
}

export function buildTopology({ prefix = '', retryTtlsMs }: TopologyOptions = {}): Topology {
  const notificationsQueue = `${prefix}notifications`;
  const [t0, t1, t2] = retryTtlsMs ?? Object.values(RETRY_TTLS_MS);
  return {
    eventsExchange: `${prefix}events`,
    notificationsQueue,
    dlxExchange: `${notificationsQueue}.dlx`,
    dlqQueue: `${notificationsQueue}.dlq`,
    retryQueues: [
      { name: `${notificationsQueue}.retry.5s`, ttlMs: t0 },
      { name: `${notificationsQueue}.retry.30s`, ttlMs: t1 },
      { name: `${notificationsQueue}.retry.2m`, ttlMs: t2 },
    ],
  };
}

export const TOPOLOGY: Topology = buildTopology();
export const EVENTS_EXCHANGE = TOPOLOGY.eventsExchange;
export const NOTIFICATIONS_QUEUE = TOPOLOGY.notificationsQueue;
export const NOTIFICATIONS_DLX = TOPOLOGY.dlxExchange;
export const NOTIFICATIONS_DLQ = TOPOLOGY.dlqQueue;
export const RETRY_QUEUES = TOPOLOGY.retryQueues;

/** Declares all exchanges, queues and bindings. Idempotent. */
export async function assertTopology(
  channel: Channel,
  topology: Topology = TOPOLOGY,
): Promise<void> {
  await channel.assertExchange(topology.eventsExchange, 'topic', { durable: true });
  await channel.assertExchange(topology.dlxExchange, 'direct', { durable: true });

  await channel.assertQueue(topology.dlqQueue, { durable: true });
  await channel.bindQueue(topology.dlqQueue, topology.dlxExchange, DEAD_ROUTING_KEY);

  await channel.assertQueue(topology.notificationsQueue, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': topology.dlxExchange,
      'x-dead-letter-routing-key': DEAD_ROUTING_KEY,
    },
  });
  await channel.bindQueue(
    topology.notificationsQueue,
    topology.eventsExchange,
    ORDER_CREATED_ROUTING_KEY,
  );

  for (const retry of topology.retryQueues) {
    await channel.assertQueue(retry.name, {
      durable: true,
      arguments: {
        'x-message-ttl': retry.ttlMs,
        'x-dead-letter-exchange': DEFAULT_EXCHANGE,
        'x-dead-letter-routing-key': topology.notificationsQueue,
      },
    });
  }
}
