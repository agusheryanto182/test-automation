import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerEmail: text('customer_email').notNull(),
  item: text('item').notNull(),
  amount: integer('amount').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const notificationDeliveries = pgTable(
  'notification_deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').notNull(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id),
    channel: text('channel', { enum: ['email', 'webhook'] }).notNull(),
    status: text('status', { enum: ['pending', 'retrying', 'sent', 'failed'] })
      .notNull()
      .default('pending'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('notification_deliveries_event_id_channel_key').on(t.eventId, t.channel),
    index('notification_deliveries_order_id_idx').on(t.orderId),
  ],
);

export const settings = pgTable('settings', {
  id: integer('id').primaryKey().default(1),
  webhookUrl: text('webhook_url'),
  emailEnabled: boolean('email_enabled').notNull().default(true),
  webhookEnabled: boolean('webhook_enabled').notNull().default(false),
});
