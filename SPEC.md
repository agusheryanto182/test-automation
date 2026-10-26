# SPEC — Notification Service MVP

## Goal

Learn RabbitMQ by building a small event-driven system: a web app emits domain events, a separate worker consumes them and delivers notifications, with retries and a dead-letter queue.

Secondary goal: test an AI-driven workflow (issue → PR → tests → merge) using the Claude Code GitHub Action.

## Users & flow

Single user, no auth (MVP).

1. User creates an order in the web UI (customer email, item, amount).
2. Web saves the order and publishes `order.created` to RabbitMQ.
3. Worker consumes the event and creates notifications for each enabled channel (email, webhook).
4. Worker delivers each notification. On failure it retries with backoff; after max attempts the message goes to the DLQ and the notification is marked `failed`.
5. UI shows orders and the status of their notifications (`pending` → `sent` | `retrying` | `failed`).
6. User can view DLQ messages and re-queue them manually.

## Features (MVP)

### Web (Next.js + tRPC)
- Create order form (validated with zod).
- Order list with notification statuses (auto-refresh every 2s).
- Order detail page: notification attempts, last error.
- DLQ page: list dead-lettered messages, "Requeue" button.
- Settings: webhook URL (stored in DB), toggle email/webhook channels.

### Worker (Node + amqplib)
- Consume `order.created` from queue `notifications`.
- Validate payload with the shared zod schema; invalid payload → straight to DLQ (no retry).
- Channels:
  - **email**: send via SMTP to Mailpit (local fake SMTP, viewable at http://localhost:8025).
  - **webhook**: HTTP POST JSON to configured URL, 5s timeout, non-2xx = failure.
- Retry: max 3 attempts, backoff 5s → 30s → 2m (via TTL retry queues, see ARCHITECTURE.md).
- Idempotent: the same `eventId` + channel is never delivered twice.
- Graceful shutdown on SIGTERM/SIGINT.

### Shared
- Event types and zod schemas shared by web and worker.

## Non-functional

- Full TypeScript, strict mode.
- `docker compose up` starts all infra (Postgres, RabbitMQ, Mailpit).
- Every feature ships with tests; CI must pass before merge.
- Structured JSON logs (pino) including `eventId`.

## Out of scope (MVP)

- Auth / multi-user.
- Transactional outbox (we publish right after the DB commit and accept the small risk of a lost event — document it, maybe do it later).
- Kafka, SMS, push notifications.
- Production deployment.

## Acceptance criteria (MVP done)

- [ ] Creating an order results in an email visible in Mailpit within a few seconds.
- [ ] With a webhook URL that returns 500, the notification is retried 3 times, then shows `failed` and appears on the DLQ page.
- [ ] Requeueing a DLQ message after fixing the webhook URL delivers it and marks it `sent`.
- [ ] Killing and restarting the worker mid-processing loses no messages and sends no duplicates.
- [ ] `pnpm test`, `pnpm lint`, `pnpm typecheck` pass locally and in CI.
