# Architecture

## Overview

```
┌──────────────┐  publish order.created   ┌──────────────────────┐
│  apps/web    │ ───────────────────────▶ │ exchange: events     │
│ Next.js+tRPC │                          │ (topic)              │
└──────┬───────┘                          └─────────┬────────────┘
       │ read/write                                 │ routing key order.created
       ▼                                            ▼
┌──────────────┐                          ┌──────────────────────┐
│  Postgres    │ ◀─── status updates ──── │ queue: notifications │
└──────────────┘                          └─────────┬────────────┘
       ▲                                            │ consume
       │                                            ▼
       │                                  ┌──────────────────────┐
       └───────────────────────────────── │ apps/worker          │ ──▶ Mailpit (SMTP)
                                          │ Node + amqplib       │ ──▶ Webhook URL
                                          └──────────────────────┘
```

Three processes: `web`, `worker`, plus infra containers (Postgres, RabbitMQ, Mailpit). The web app never consumes from RabbitMQ; the worker never serves HTTP to users.

## Monorepo layout

```
apps/
  web/        Next.js (App Router) + tRPC, publishes events
  worker/     long-running consumer
packages/
  shared/     event types, zod schemas, RabbitMQ topology constants
  db/         Drizzle schema, migrations, db client
docker-compose.yml
```

## RabbitMQ topology

All names live in `packages/shared/src/topology.ts`. Both apps assert the topology on startup (idempotent).

| Name                                      | Type                    | Notes                                                             |
| ----------------------------------------- | ----------------------- | ----------------------------------------------------------------- |
| `events`                                  | topic exchange, durable | all domain events                                                 |
| `notifications`                           | queue, durable          | bound to `events` with `order.created`; DLX = `notifications.dlx` |
| `notifications.retry.5s` / `.30s` / `.2m` | queues, durable         | `x-message-ttl` set; DLX routes back to `notifications`           |
| `notifications.dlx`                       | direct exchange         | dead-letter target                                                |
| `notifications.dlq`                       | queue, durable          | final resting place for failed messages                           |

### Message format

```ts
{
  eventId: string; // uuid, idempotency key
  type: 'order.created';
  occurredAt: string; // ISO 8601
  payload: {
    orderId: string;
    customerEmail: string;
    item: string;
    amount: number;
  }
}
```

Messages are published `persistent: true` with publisher confirms. Header `x-attempt` tracks the attempt number.

### Retry flow

1. Worker consumes with `prefetch(10)` and manual ack.
2. Success → `ack`.
3. Transient failure (network, 5xx, timeout) and `x-attempt < 3` → publish a copy to the next retry queue with `x-attempt + 1`, then `ack` the original. When the TTL expires the message is dead-lettered back to `notifications`.
4. Failure at the last attempt, or invalid payload → `nack(requeue=false)` → `notifications.dlx` → `notifications.dlq`.
5. Requeue from the UI: web reads from `notifications.dlq`, republishes to `events` with `x-attempt = 1`, and acks the DLQ message.

## Idempotency

Table `notification_deliveries` has a unique constraint on `(event_id, channel)`. The worker inserts the row before delivery; if it already exists with status `sent`, it skips delivery and acks. This makes redelivery after a crash safe.

## Data model (Drizzle)

- `orders`: id, customer_email, item, amount, created_at
- `notification_deliveries`: id, event_id, order_id, channel (`email` | `webhook`), status (`pending` | `retrying` | `sent` | `failed`), attempts, last_error, updated_at
- `settings`: single row with webhook_url, email_enabled, webhook_enabled

## Known trade-offs

- **No outbox**: if the web process crashes between the DB commit and the publish, the event is lost. Acceptable for MVP; the fix is a transactional outbox plus a relay.
- **Polling UI**: the UI refreshes every 2s instead of a push channel. Upgrade path: a tRPC SSE subscription.
