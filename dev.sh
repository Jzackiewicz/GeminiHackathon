#!/usr/bin/env bash
set -e

trap 'kill 0' EXIT

cd "$(dirname "$0")"

# Backend
(cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000 --timeout-graceful-shutdown 1) &

# Frontend
(cd frontend && npm run dev) &

wait
