import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { db, orders, sql } from '@app/db';
import {
  assertTopology,
  buildTopology,
  connectRabbit,
  orderCreatedEventSchema,
  type RabbitConnection,
} from '@app/shared';
import { appRouter } from './router';
import type { Context } from './trpc';

const topology = buildTopology({ prefix: `test-${crypto.randomUUID()}.` });
let rabbit: RabbitConnection;
const createdIds: string[] = [];

const input = { customerEmail: 'a@example.com', item: 'Book', amount: 1250 };
const caller = (ctx: Partial<Context> = {}) =>
  appRouter.createCaller({ db, channel: rabbit.channel, topology, ...ctx });

beforeAll(async () => {
  rabbit = await connectRabbit(process.env.RABBITMQ_URL);
  await assertTopology(rabbit.channel, topology);
});

afterAll(async () => {
  for (const id of createdIds) await db.delete(orders).where(eq(orders.id, id));
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
  await sql.end();
});

describe('order.create', () => {
  it('inserts the order and publishes a matching order.created message', async () => {
    const { order, eventId } = await caller().order.create(input);
    createdIds.push(order.id);

    const [row] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(row).toMatchObject(input);

    const msg = await rabbit.channel.get(topology.notificationsQueue, { noAck: true });
    if (!msg) throw new Error('expected message');
    const event = orderCreatedEventSchema.parse(JSON.parse(msg.content.toString()));
    expect(event.eventId).toBe(eventId);
    expect(event.payload).toEqual({
      orderId: order.id,
      customerEmail: input.customerEmail,
      item: input.item,
      amount: input.amount,
    });
  });

  it('rejects invalid input without inserting or publishing', async () => {
    await expect(caller().order.create({ ...input, customerEmail: 'nope' })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    expect(await rabbit.channel.get(topology.notificationsQueue, { noAck: true })).toBe(false);
  });

  it('throws INTERNAL_SERVER_ERROR but keeps the order when publishing fails', async () => {
    const dead = await connectRabbit(process.env.RABBITMQ_URL);
    await dead.close();
    const email = `keep-${crypto.randomUUID()}@example.com`;

    const err = await caller({ channel: dead.channel })
      .order.create({ ...input, customerEmail: email })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TRPCError);
    expect((err as TRPCError).code).toBe('INTERNAL_SERVER_ERROR');

    const rows = await db.select().from(orders).where(eq(orders.customerEmail, email));
    expect(rows).toHaveLength(1);
    createdIds.push(rows[0]!.id);
  });
});
