#!/usr/bin/env bash
# Host-side Deploy Worker — polls SCC API for queued provision tasks,
# executes bash provision-site.sh (или polish-site.sh) на ХОСТ-машине.
#
# Почему отдельный worker: SCC-контейнер не имеет docker socket и SSH
# (security — минимальная поверхность). Queue + poll pattern = clean.
#
# Запуск:
#   1. Установить env vars:
#      export SCC_URL="http://localhost:3001"      # или https://cmd.bonaka.app
#      export DEPLOY_WORKER_TOKEN="$(openssl rand -hex 32)"  # тот же что в SCC .env
#      export WORKER_HOST="$(hostname)"
#   2. bash deploy-worker.sh
#
# Production: запускать через systemd service или tmux.
#   See deploy/deploy-worker.service example.
#
# Polling interval 5s (configurable через POLL_INTERVAL_SEC).

set -euo pipefail

SCC_URL="${SCC_URL:-http://localhost:3001}"
POLL_INTERVAL_SEC="${POLL_INTERVAL_SEC:-5}"
WORKER_HOST="${WORKER_HOST:-$(hostname)}"
SCRIPTS_DIR="${SCRIPTS_DIR:-/opt/scc/server/scripts/wp-provision}"

: "${DEPLOY_WORKER_TOKEN:?DEPLOY_WORKER_TOKEN env required (same as SCC .env)}"

log() { echo "[$(date +%H:%M:%S)] worker/$WORKER_HOST: $*"; }

call_api() {
  local method="$1" path="$2" body="${3:-}"
  local url="${SCC_URL}${path}"
  if [[ -n "$body" ]]; then
    curl -sS -X "$method" "$url" \
      -H "x-worker-token: $DEPLOY_WORKER_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$body"
  else
    curl -sS -X "$method" "$url" \
      -H "x-worker-token: $DEPLOY_WORKER_TOKEN"
  fi
}

# Забрать queued task (atomic)
claim_task() {
  call_api GET "/api/deploy/worker/claim?host=${WORKER_HOST}"
}

# Append chunk в task.log
append_log() {
  local task_id="$1" chunk="$2"
  local escaped
  escaped=$(jq -n --arg c "$chunk" '{chunk: $c}')
  call_api POST "/api/deploy/worker/tasks/${task_id}/log" "$escaped" > /dev/null
}

# Пометить task completed
complete_task() {
  local task_id="$1" success="$2" exit_code="$3" error="${4:-}"
  local body
  body=$(jq -n \
    --argjson s "$success" \
    --argjson ec "$exit_code" \
    --arg err "$error" \
    '{success: $s, exit_code: $ec, error: ($err | select(length > 0))}')
  call_api POST "/api/deploy/worker/tasks/${task_id}/complete" "$body" > /dev/null
}

# Execute provision-site.sh в новой shell с config как env vars
run_provision() {
  local task_id="$1" config_json="$2" task_type="$3"

  local script=""
  case "$task_type" in
    provision) script="${SCRIPTS_DIR}/provision-site.sh" ;;
    polish)    script="${SCRIPTS_DIR}/polish-site.sh" ;;
    *)         log "unknown task_type: $task_type"; return 1 ;;
  esac

  if [[ ! -f "$script" ]]; then
    local err="Script not found: $script"
    append_log "$task_id" "$err"
    complete_task "$task_id" "false" "127" "$err"
    return 1
  fi

  # Config JSON → ENV vars через jq. Каждый key как exported var.
  # Безопасность: config_json приходит от UI, но нет shell injection — jq + set +u safe.
  local env_file
  env_file=$(mktemp /tmp/deploy-env.XXXXXX)
  echo "$config_json" | jq -r 'to_entries | .[] | "export " + .key + "=" + (.value | tostring | @sh)' > "$env_file"

  append_log "$task_id" "[worker] Starting $task_type for $config_json\n"
  append_log "$task_id" "[worker] Script: $script\n"
  append_log "$task_id" "[worker] Env: $(wc -l < "$env_file") vars\n\n"

  # Run + stream output. Bash inherits env, then runs script with set -e.
  local exit_code=0
  {
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
    bash "$script" 2>&1
  } | while IFS= read -r line; do
    append_log "$task_id" "$line\n"
  done || exit_code=$?

  rm -f "$env_file"

  if [[ $exit_code -eq 0 ]]; then
    append_log "$task_id" "\n[worker] ✓ Success\n"
    complete_task "$task_id" "true" "0"
  else
    append_log "$task_id" "\n[worker] ✕ Failed with exit=$exit_code\n"
    complete_task "$task_id" "false" "$exit_code" "Script exit $exit_code"
  fi
}

# Main loop
log "Starting deploy-worker (SCC=$SCC_URL, poll=${POLL_INTERVAL_SEC}s, scripts=$SCRIPTS_DIR)"

while true; do
  RESPONSE=$(claim_task 2>&1) || { log "claim failed: $RESPONSE"; sleep "$POLL_INTERVAL_SEC"; continue; }
  TASK=$(echo "$RESPONSE" | jq -r '.task // empty')

  if [[ -z "$TASK" || "$TASK" == "null" ]]; then
    sleep "$POLL_INTERVAL_SEC"
    continue
  fi

  TASK_ID=$(echo "$TASK" | jq -r '.id')
  TASK_TYPE=$(echo "$TASK" | jq -r '.taskType')
  TASK_DOMAIN=$(echo "$TASK" | jq -r '.domain')
  TASK_CONFIG=$(echo "$TASK" | jq -c '.config')

  log "Claimed task $TASK_ID ($TASK_TYPE for $TASK_DOMAIN)"
  run_provision "$TASK_ID" "$TASK_CONFIG" "$TASK_TYPE" || log "run_provision returned non-zero"
  log "Finished task $TASK_ID"
done
