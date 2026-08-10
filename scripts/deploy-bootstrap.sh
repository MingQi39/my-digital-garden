#!/usr/bin/env bash
# One-time server bootstrap for notes.houmq.cn deploy.
# Run on the VPS as the deploy user (same user as DEPLOY_USER secret).
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/MingQi39/my-digital-garden.git}"
REPO_PATH="${REPO_PATH:-/var/www/my-digital-garden}"

if [ -d "$REPO_PATH/.git" ]; then
  echo "Repo already exists at $REPO_PATH"
  exit 0
fi

mkdir -p "$(dirname "$REPO_PATH")"
git clone "$REPO_URL" "$REPO_PATH"
cd "$REPO_PATH"

if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$HOME/.nvm/nvm.sh"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Install Node 22 first. If GitHub raw is slow from this VPS, use apt instead of nvm:"
  echo "  sudo apt-get update && sudo apt-get install -y nodejs npm"
  echo "Or via nvm (needs curl to raw.githubusercontent.com):"
  echo "  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash"
  echo "  nvm install 22"
  exit 1
fi

echo "node: $(node -v)"
npm ci
SITE_BASE_URL="${SITE_BASE_URL:-https://notes.houmq.cn}" npm run build
echo "Bootstrap done. dist: $REPO_PATH/dist"
