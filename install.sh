#!/bin/sh
# Savedly self-hosted installer.
#
#   curl -fsSL https://raw.githubusercontent.com/jyotishankar04/saveforlatter/main/install.sh | sh
#
# Clones the repository and starts it with Docker Compose. Needs git and
# Docker (with the compose plugin). Re-running it updates an existing install.
set -e

REPO="https://github.com/jyotishankar04/saveforlatter.git"
DIR="${SAVEDLY_DIR:-savedly}"

command -v git >/dev/null 2>&1 || { echo "git is required: https://git-scm.com/downloads" >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker is required: https://docs.docker.com/get-docker/" >&2; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "The Docker Compose plugin is required: https://docs.docker.com/compose/install/" >&2; exit 1; }

if [ -d "$DIR/.git" ]; then
  echo "Updating Savedly in ./$DIR"
  git -C "$DIR" pull --ff-only
else
  echo "Downloading Savedly into ./$DIR"
  git clone --depth 1 "$REPO" "$DIR"
fi

cd "$DIR"
echo "Building and starting (the first run takes a few minutes)..."
docker compose up -d --build

echo
echo "Savedly is starting at ${PUBLIC_URL:-http://localhost:3000}"
echo "Open it and create your admin account."
