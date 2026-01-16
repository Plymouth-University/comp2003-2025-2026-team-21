#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

BACKEND_DIR="$ROOT/SourceCode/backend"
FRONTEND_DIR="$ROOT/SourceCode/frontend"

if [ -f "$BACKEND_DIR/.env.example" ] && [ ! -f "$BACKEND_DIR/.env" ]; then
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
fi

if [ -f "$FRONTEND_DIR/.env.example" ] && [ ! -f "$FRONTEND_DIR/.env" ]; then
  cp "$FRONTEND_DIR/.env.example" "$FRONTEND_DIR/.env"
fi

CODESPACE_NAME="${CODESPACE_NAME:-}"
DOMAIN="${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}"

if [ -n "$CODESPACE_NAME" ] && [ -n "$DOMAIN" ]; then
  API_URL="https://${CODESPACE_NAME}-3001.${DOMAIN}"

  if [ -f "$FRONTEND_DIR/.env" ]; then
    if grep -q "^EXPO_PUBLIC_API_URL=" "$FRONTEND_DIR/.env"; then
      sed -i "s|^EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=${API_URL}|" "$FRONTEND_DIR/.env" || true
    else
      echo "EXPO_PUBLIC_API_URL=${API_URL}" >> "$FRONTEND_DIR/.env"
    fi
  fi
fi

if [ -n "${DATABASE_URL:-}" ] && [ -f "$BACKEND_DIR/.env" ]; then
  if grep -q "^DATABASE_URL=" "$BACKEND_DIR/.env"; then
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL}|" "$BACKEND_DIR/.env" || true
  else
    echo "DATABASE_URL=${DATABASE_URL}" >> "$BACKEND_DIR/.env"
  fi
fi

if [ -n "${JWT_SECRET:-}" ] && [ -f "$BACKEND_DIR/.env" ]; then
  if grep -q "^JWT_SECRET=" "$BACKEND_DIR/.env"; then
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" "$BACKEND_DIR/.env" || true
  else
    echo "JWT_SECRET=${JWT_SECRET}" >> "$BACKEND_DIR/.env"
  fi
fi