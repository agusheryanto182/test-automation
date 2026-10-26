# Notification Service

A small event-driven system for learning RabbitMQ: a Next.js app publishes order events, and a worker delivers email and webhook notifications with retries and a dead-letter queue.

See [SPEC.md](SPEC.md) for features and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design.

## Requirements

- Node 22+
- pnpm 9+
- Docker + Docker Compose

## Getting started

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:migrate
pnpm dev
```

| Service             | URL                                    |
| ------------------- | -------------------------------------- |
| Web app             | http://localhost:3000                  |
| RabbitMQ management | http://localhost:15672 (guest / guest) |
| Mailpit (inbox)     | http://localhost:8025                  |

## Scripts

| Command           | Description                           |
| ----------------- | ------------------------------------- |
| `pnpm dev`        | Run web and worker in watch mode      |
| `pnpm test`       | Run all tests (infra must be running) |
| `pnpm lint`       | Lint all packages                     |
| `pnpm typecheck`  | Type-check all packages               |
| `pnpm db:migrate` | Apply database migrations             |

## Project status

MVP in progress. Built with the help of the Claude Code GitHub Action.
