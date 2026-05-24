#!/bin/sh
set -e
# Railway volumes are often root-owned; the app runs as `app` and writes to /app/data + /app/out.
if [ "$(id -u)" = "0" ]; then
  mkdir -p /app/data /app/data/cache /app/.remotion-bundle

  # When WRAPPED_CACHE_DIR is set (Railway: /app/data/cache), make /app/out/cache
  # a symlink to it. That way archive entries written with either relative
  # form ("out/cache/X.mp4" from local imports OR "data/cache/X.mp4" from
  # native Railway renders) both resolve to the same physical file.
  if [ -n "$WRAPPED_CACHE_DIR" ] && [ "$WRAPPED_CACHE_DIR" != "/app/out/cache" ]; then
    mkdir -p "$WRAPPED_CACHE_DIR"
    if [ -e /app/out/cache ] && [ ! -L /app/out/cache ]; then
      rm -rf /app/out/cache
    fi
    ln -sfn "$WRAPPED_CACHE_DIR" /app/out/cache
  else
    mkdir -p /app/out/cache
  fi

  chown -R app:app /app/data /app/out /app/.remotion-bundle 2>/dev/null || true
  exec runuser -u app -- "$@"
fi
exec "$@"
