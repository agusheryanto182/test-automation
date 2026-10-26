# CLAUDE.md

Notification service MVP for learning RabbitMQ. Read `SPEC.md` for what to build and `docs/ARCHITECTURE.md` for how. If an issue conflicts with them, follow the issue and update the docs in the same PR.

## Stack

- pnpm workspaces monorepo, Node 22+, TypeScript strict
- `apps/web`: Next.js (App Router) + tRPC + TanStack Query
- `apps/worker`: amqplib, pino, run with tsx
- `packages/shared`: zod schemas, event types, RabbitMQ topology constants
- `packages/db`: Drizzle ORM + Postgres
- Tests: Vitest. Infra: Docker Compose (Postgres, RabbitMQ, Mailpit)

## Commands

```bash
docker compose up -d        # infra
pnpm install
pnpm db:migrate
pnpm dev                    # web + worker
pnpm test                   # all tests (needs infra running)
pnpm lint
pnpm typecheck
```

## Rules

- Every change ships with tests. Worker logic gets unit tests; anything touching RabbitMQ or Postgres gets an integration test against the real containers (no mocking the broker).
- Never bypass zod validation for messages or tRPC inputs.
- RabbitMQ names come from `packages/shared/src/topology.ts` only. No string literals elsewhere.
- Worker: manual ack only. Never `nack(requeue=true)`, because it causes hot loops. Use the retry queues.
- Do not edit existing migrations; add a new one.
- Log with pino and include `eventId` whenever one is available. No `console.log`.
- Keep PRs small: one issue per PR. PRs target `develop`, never `main`.
- Branches: the GitHub Action creates `claude/issue-<number>-*` (a PR to `develop` is opened and auto-merged once CI passes). Humans use `feat/<issue-number>-<slug>` or `fix/<issue-number>-<slug>`.
- Before pushing, run `pnpm lint && pnpm typecheck && pnpm test`. CI runs the same commands and must pass. Run `pnpm format` to fix Prettier issues.
- You cannot edit `.github/workflows/`. If a change there is needed, say so in your comment.
- Conventional commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`).

## Definition of done

- Acceptance criteria in the issue are met.
- `pnpm lint && pnpm typecheck && pnpm test` pass.
- PR description links the issue (`Closes #N`) and explains how it was tested.
