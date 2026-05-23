#!/bin/sh
set -e
# Railway volumes are often root-owned; the app runs as `app` and writes to /app/data + /app/out.
if [ "$(id -u)" = "0" ]; then
  mkdir -p /app/data /app/data/cache /app/out/cache /app/.remotion-bundle
  chown -R app:app /app/data /app/out /app/.remotion-bundle 2>/dev/null || true
  exec runuser -u app -- "$@"
fi
exec "$@"
