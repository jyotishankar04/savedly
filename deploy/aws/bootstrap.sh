#!/usr/bin/env bash
# One-time setup for a fresh Ubuntu 24.04 (ARM64) instance. Run it as the
# default "ubuntu" user:
#
#   curl -fsSL https://raw.githubusercontent.com/jyotishankar04/saveforlatter/main/deploy/aws/bootstrap.sh | bash
#
# It installs Docker, adds swap, creates the "deploy" user that GitHub Actions
# signs in as, and prepares /opt/saveforlatter. Safe to run again.
# Runbook: docs/DEPLOY_AWS.md
set -euo pipefail

APP_DIR=/opt/saveforlatter
DEPLOY_USER=deploy
SWAP_FILE=/swapfile
SWAP_SIZE=2G

echo "==> Installing Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
fi
sudo systemctl enable --now docker

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

echo "==> Creating the ${DEPLOY_USER} user"
if ! id "${DEPLOY_USER}" >/dev/null 2>&1; then
  sudo adduser --disabled-password --gecos "" "${DEPLOY_USER}"
fi
sudo usermod -aG docker "${DEPLOY_USER}"
sudo install -d -m 700 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh"
sudo touch "/home/${DEPLOY_USER}/.ssh/authorized_keys"
sudo chown "${DEPLOY_USER}:${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh/authorized_keys"
sudo chmod 600 "/home/${DEPLOY_USER}/.ssh/authorized_keys"

echo "==> Preparing ${APP_DIR}"
sudo install -d -m 750 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "${APP_DIR}" "${APP_DIR}/certs"

echo "==> Turning off SSH password login"
echo "PasswordAuthentication no" | sudo tee /etc/ssh/sshd_config.d/60-no-passwords.conf >/dev/null
sudo systemctl reload ssh

cat <<DONE

Done. Still to do by hand (see docs/DEPLOY_AWS.md):
  1. Add the deploy public key to /home/${DEPLOY_USER}/.ssh/authorized_keys
  2. Put the Cloudflare origin certificate in ${APP_DIR}/certs (origin.pem, origin.key)
  3. Copy server/.env.prod to ${APP_DIR}/.env.prod (mode 600)
DONE
