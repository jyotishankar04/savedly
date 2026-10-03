#!/usr/bin/env bash
# One-time setup for a fresh Ubuntu 24.04 (ARM64) instance. Run it as the
# default "ubuntu" user:
#
#   curl -fsSL https://raw.githubusercontent.com/jyotishankar04/saveforlatter/main/deploy/aws/bootstrap.sh | bash
#
# It installs Docker, adds swap and prepares /opt/saveforlatter. Safe to run
# again. Runbook: docs/DEPLOY_AWS.md
set -euo pipefail

APP_DIR=/opt/saveforlatter
SWAP_FILE=/swapfile
SWAP_SIZE=2G

echo "==> Installing Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
fi
sudo systemctl enable --now docker
# Lets this user run docker without sudo (takes effect at the next login).
sudo usermod -aG docker "$USER"

echo "==> Adding ${SWAP_SIZE} of swap"
# 2 GB of memory is enough to run the API, but swap keeps a brief spike
# (a large upload, a burst of background jobs) from killing it.
if ! sudo swapon --show | grep -q "${SWAP_FILE}"; then
  sudo fallocate -l "${SWAP_SIZE}" "${SWAP_FILE}"
  sudo chmod 600 "${SWAP_FILE}"
  sudo mkswap "${SWAP_FILE}" >/dev/null
  sudo swapon "${SWAP_FILE}"
  grep -q "${SWAP_FILE}" /etc/fstab || echo "${SWAP_FILE} none swap sw 0 0" | sudo tee -a /etc/fstab >/dev/null
fi

echo "==> Preparing ${APP_DIR}"
sudo install -d -m 750 -o "$USER" -g "$USER" "${APP_DIR}"

echo
echo "Done. Next: copy server/.env.prod to ${APP_DIR}/.env.prod (see docs/DEPLOY_AWS.md)."
