#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WRANGLER_CONFIG_FILE="$ROOT_DIR/wrangler.jsonc"
SCHEMA_FILE="$ROOT_DIR/database/conference-voucher.schema.sql"
EXAMPLE_SEED_FILE="$ROOT_DIR/database/conference-voucher.seed.example.sql"
DEFAULT_SEED_FILE="$ROOT_DIR/database/conference-voucher.local.sql"
PERSIST_DIR="$ROOT_DIR/.wrangler/state"
CONFIG_HOME="$ROOT_DIR/.wrangler/config"

DB_NAME=""
SEED_FILE="$DEFAULT_SEED_FILE"
SKIP_SEED=0

print_usage() {
  cat <<EOF
Usage: bash ./scripts/setup-local-cf.sh [options]

Initializes the local Cloudflare D1 database used by \`bun run cf:dev\`.

Options:
  --db-name <name>   Override the D1 database name from wrangler.jsonc
  --seed <path>      Seed SQL file to apply after the schema
  --skip-seed        Apply only the schema
  --help             Show this help message

Examples:
  bash ./scripts/setup-local-cf.sh
  bash ./scripts/setup-local-cf.sh --skip-seed
  bash ./scripts/setup-local-cf.sh --seed ./database/conference-voucher.local.sql
EOF
}

read_database_name_from_config() {
  if [[ ! -f "$WRANGLER_CONFIG_FILE" ]]; then
    return 1
  fi

  sed -n 's/.*"database_name":[[:space:]]*"\([^"]*\)".*/\1/p' "$WRANGLER_CONFIG_FILE" | head -n 1
}

run_d1_execute() {
  local sql_file="$1"

  XDG_CONFIG_HOME="$CONFIG_HOME" bunx wrangler d1 execute "$DB_NAME" \
    --local \
    --persist-to "$PERSIST_DIR" \
    --file="$sql_file"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --db-name)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --db-name." >&2
        exit 1
      fi
      DB_NAME="$2"
      shift 2
      ;;
    --seed)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --seed." >&2
        exit 1
      fi
      SEED_FILE="$2"
      shift 2
      ;;
    --skip-seed)
      SKIP_SEED=1
      shift
      ;;
    --help)
      print_usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      print_usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$DB_NAME" ]]; then
  DB_NAME="$(read_database_name_from_config || true)"
fi

if [[ -z "$DB_NAME" ]]; then
  echo "Could not determine a D1 database name. Set it in wrangler.jsonc or pass --db-name." >&2
  exit 1
fi

if [[ ! -f "$SCHEMA_FILE" ]]; then
  echo "Schema file not found: $SCHEMA_FILE" >&2
  exit 1
fi

mkdir -p "$PERSIST_DIR" "$CONFIG_HOME"

echo "Initializing local D1 database: $DB_NAME"
run_d1_execute "$SCHEMA_FILE"

if [[ "$SKIP_SEED" -eq 1 ]]; then
  echo "Skipped seed step."
  echo "Local D1 state lives in: $PERSIST_DIR"
  exit 0
fi

if [[ ! -f "$SEED_FILE" ]]; then
  cp "$EXAMPLE_SEED_FILE" "$SEED_FILE"
  echo "Created seed template at: $SEED_FILE"
  echo "Edit the addresses and voucher codes, then rerun this script to apply the seed."
  echo "Local D1 state lives in: $PERSIST_DIR"
  exit 0
fi

echo "Applying seed file: $SEED_FILE"
run_d1_execute "$SEED_FILE"

echo "Local Cloudflare D1 setup complete."
echo "Next steps:"
echo "  1. bun run build-cf-pages"
echo "  2. bun run cf:dev"
