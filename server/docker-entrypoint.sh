#!/bin/sh
set -e

# Self-hosted installs (and anyone who opts in with RUN_MIGRATIONS=true) apply
# pending migrations and seed roles/flags/plans on every start. Both steps are
# idempotent, so upgrading is just pulling a new image and restarting.
if [ "$SELF_HOSTED" = "true" ] || [ "$RUN_MIGRATIONS" = "true" ]; then
  node dist/db/bootstrap.js
fi

exec node dist/server.js
