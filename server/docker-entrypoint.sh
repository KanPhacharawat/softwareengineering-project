#!/bin/sh
# Starts the server only. Migrations + seed run as a separate job (compose `migrate`, Cloud Run job).
# exec: node becomes PID 1 and gets SIGTERM.
set -e
exec "$@"
