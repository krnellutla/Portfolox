#!/bin/sh
# Runs the API (as the unprivileged node user) and nginx in one container.
set -eu

: "${PORT:=10000}"
: "${STORAGE_ORIGIN:=https://*.supabase.co}"
export PORT STORAGE_ORIGIN

envsubst '${PORT} ${STORAGE_ORIGIN}' \
  < /etc/nginx/portfolix.conf.template > /etc/nginx/http.d/default.conf
nginx -t

# The API listens on 3001 regardless of the public PORT nginx uses.
su-exec node env PORT=3001 node /app/apps/api/dist/index.js &
API_PID=$!
nginx -g 'daemon off;' &
NGINX_PID=$!

# If either process exits, stop the container so the platform restarts it.
while kill -0 "$API_PID" 2>/dev/null && kill -0 "$NGINX_PID" 2>/dev/null; do
  sleep 2
done
echo "a process exited; shutting down" >&2
kill "$API_PID" "$NGINX_PID" 2>/dev/null || true
exit 1
