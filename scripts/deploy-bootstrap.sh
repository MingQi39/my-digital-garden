#!/usr/bin/env bash
# One-time server bootstrap for notes.houmq.cn deploy.
# Run on the VPS as the deploy user (same user as DEPLOY_USER secret).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

REPO_URL="${REPO_URL:-https://github.com/MingQi39/my-digital-garden.git}"
REPO_PATH="${REPO_PATH:-/var/www/my-digital-garden}"

export PATH="$HOME/.local/bin:$PATH"

bash "$ROOT/scripts/ensure-server-repo.sh"
bash "$ROOT/scripts/ensure-node.sh"

cd "$REPO_PATH"
npm ci
SITE_BASE_URL="${SITE_BASE_URL:-https://notes.houmq.cn}" npm run build
echo "Bootstrap done. dist: $REPO_PATH/dist"
