# dev-bot config for this repo, sourced (bash) by dev-bot's workflows after
# checkout. See https://github.com/agusheryanto182/dev-bot#configure-a-repo.

# shellcheck disable=SC2034 # read by the workflows
node_version=22

# Host ports for docker-compose.yml, unique per run, plus what the app reads.
ci_env() {
  echo "PG_PORT=$CI_PORT"
  echo "RABBITMQ_PORT=$((CI_PORT + 1))"
  echo "RABBITMQ_UI_PORT=$((CI_PORT + 2))"
  echo "SMTP_PORT=$((CI_PORT + 3))"
  echo "MAILPIT_UI_PORT=$((CI_PORT + 4))"
  echo "DATABASE_URL=postgres://app:app@localhost:$CI_PORT/app"
  echo "RABBITMQ_URL=amqp://guest:guest@localhost:$((CI_PORT + 1))"
  echo "SMTP_HOST=localhost"
  echo "SMTP_FROM=notifications@example.com"
  echo "LOG_LEVEL=info"
}

setup() {
  docker compose up -d --wait
}

check() {
  pnpm lint && pnpm typecheck && pnpm test
}

teardown() {
  docker compose down -v --remove-orphans
}
