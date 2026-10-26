# Backlog (draft issues)

Draft of the GitHub issues, in build order. Each `##` section becomes one issue. Delete this file once the issues are created.

## 1. chore: set up monorepo and tooling

Set up the pnpm workspaces monorepo described in `docs/ARCHITECTURE.md`.

**Acceptance criteria**
- [ ] `apps/web`, `apps/worker`, `packages/shared`, `packages/db` exist with `package.json` and `tsconfig.json` (strict, shared base config).
- [ ] ESLint + Prettier configured at the root; `pnpm lint` works.
- [ ] Vitest configured; `pnpm test` runs (a placeholder test per package is fine).
- [ ] `pnpm typecheck` runs `tsc --noEmit` in all packages.
- [ ] `docker-compose.yml` with Postgres 16, RabbitMQ 3 (management image), Mailpit; healthchecks included.
- [ ] `.env.example` with all required variables.

## 2. ci: GitHub Actions workflow

Depends on #1.

**Acceptance criteria**
- [ ] Workflow runs on PRs and pushes to `main`.
- [ ] Runs `pnpm lint`, `pnpm typecheck`, `pnpm test`.
- [ ] Postgres, RabbitMQ and Mailpit run as `services:` so integration tests work.
- [ ] pnpm store is cached.

## 3. feat(db): Drizzle schema and migrations

Depends on #1.

**Acceptance criteria**
- [ ] Tables `orders`, `notification_deliveries`, `settings` as in `docs/ARCHITECTURE.md`.
- [ ] Unique constraint on `notification_deliveries (event_id, channel)`.
- [ ] `pnpm db:migrate` applies migrations; the `settings` row is seeded.
- [ ] Exported db client from `packages/db`.
- [ ] Integration test: insert a duplicate `(event_id, channel)` and get a unique violation.

## 4. feat(shared): event schemas and RabbitMQ topology

Depends on #1.

**Acceptance criteria**
- [ ] zod schema + inferred type for the `order.created` event envelope.
- [ ] `topology.ts` exports all exchange/queue names and an `assertTopology(channel)` function that declares everything (including retry queues with TTL and DLX).
- [ ] Connection helper with publisher confirms enabled.
- [ ] Integration test: `assertTopology` runs twice without error; a message published to a retry queue reappears in `notifications` after the TTL (use a short TTL in the test).

## 5. feat(web): create order and publish `order.created`

Depends on #3, #4.

**Acceptance criteria**
- [ ] tRPC + TanStack Query wired up in `apps/web`.
- [ ] `order.create` mutation validates input with zod, inserts the order, then publishes `order.created` (persistent, confirmed).
- [ ] Simple form on `/` to create an order.
- [ ] Integration test: calling the mutation inserts a row and a message lands in `notifications`.

## 6. feat(worker): consume events and send email

Depends on #3, #4.

**Acceptance criteria**
- [ ] Worker connects, asserts topology, consumes `notifications` with `prefetch(10)` and manual ack.
- [ ] Invalid payload → `nack(requeue=false)` (goes to DLQ).
- [ ] Email channel sends via SMTP to Mailpit.
- [ ] Idempotency per `docs/ARCHITECTURE.md`: an already-`sent` delivery is skipped and acked.
- [ ] Graceful shutdown on SIGTERM/SIGINT: stop consuming, finish in-flight messages, close connections.
- [ ] Integration test: publishing an event results in an email in Mailpit (via its API) and a `sent` delivery row; publishing the same event twice sends one email.

## 7. feat(worker): retries with backoff and DLQ

Depends on #6.

**Acceptance criteria**
- [ ] Transient failures go to retry queues 5s → 30s → 2m using the `x-attempt` header.
- [ ] After the 3rd failed attempt the message goes to `notifications.dlq` and the delivery is `failed` with `last_error`.
- [ ] Delivery status is `retrying` while retries are pending.
- [ ] TTLs are configurable via env so tests can use short values.
- [ ] Integration test: a channel that always fails ends up in the DLQ after 3 attempts.

## 8. feat: webhook channel and settings

Depends on #6, #7.

**Acceptance criteria**
- [ ] Webhook channel POSTs the event JSON with a 5s timeout; non-2xx counts as failure.
- [ ] Worker reads `settings` to decide which channels are enabled.
- [ ] Settings page in web: webhook URL + channel toggles (tRPC `settings.get` / `settings.update`).
- [ ] Integration test with a local test HTTP server: 200 → `sent`, 500 → retried.

## 9. feat(web): order list and detail with statuses

Depends on #5, #6.

**Acceptance criteria**
- [ ] `/` lists orders with per-channel delivery status, refreshing every 2s.
- [ ] `/orders/[id]` shows deliveries with attempts and last error.
- [ ] Status badges for `pending`, `retrying`, `sent`, `failed`.

## 10. feat(web): DLQ page and requeue

Depends on #7.

**Acceptance criteria**
- [ ] `/dlq` lists messages in `notifications.dlq` (eventId, type, attempts, last error).
- [ ] "Requeue" republishes the message to `events` with `x-attempt = 1` and acks it from the DLQ.
- [ ] Integration test: a message in the DLQ is requeued and then processed successfully.

## 11. test: end-to-end acceptance check

Depends on all of the above.

**Acceptance criteria**
- [ ] Script or test covering the SPEC acceptance criteria, including restarting the worker mid-processing with no lost or duplicated notifications.
- [ ] README updated with anything that changed.
