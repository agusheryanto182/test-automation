import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createDb } from './client.js';
import { runMigrations } from './migrate.js';
import { notificationDeliveries, orders, settings } from './schema.js';

const url = process.env.DATABASE_URL ?? 'postgres://app:app@localhost:5432/app';
const { db, sql } = createDb(url);

beforeAll(async () => {
  await runMigrations(db);
});

afterAll(async () => {
  await sql.end();
});

describe('db schema', () => {
  it('seeds the settings row', async () => {
    const rows = await db.select().from(settings);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 1, emailEnabled: true, webhookEnabled: false });
  });

  it('rejects a duplicate (event_id, channel)', async () => {
    const [order] = await db
      .insert(orders)
      .values({ customerEmail: 'a@example.com', item: 'book', amount: 100 })
      .returning();
    const eventId = crypto.randomUUID();
    const row = { eventId, orderId: order!.id, channel: 'email' as const };

    try {
      await db.insert(notificationDeliveries).values(row);

      await expect(db.insert(notificationDeliveries).values(row)).rejects.toMatchObject({
        // drizzle wraps the driver error; the Postgres error is on `cause`
        cause: {
          code: '23505',
          constraint_name: 'notification_deliveries_event_id_channel_key',
        },
      });

      // Same event on another channel is allowed.
      await db.insert(notificationDeliveries).values({ ...row, channel: 'webhook' });
    } finally {
      await db.delete(notificationDeliveries).where(eq(notificationDeliveries.eventId, eventId));
      await db.delete(orders).where(eq(orders.id, order!.id));
    }
  });
});
