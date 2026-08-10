#!/usr/bin/env bash
# One-time server bootstrap for notes.houmq.cn deploy.
# Run on the VPS as the deploy user (same user as DEPLOY_USER secret).
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/MingQi39/my-digital-garden.git}"
REPO_PATH="${REPO_PATH:-/var/www/my-digital-garden}"
SITE_BASE_URL="${SITE_BASE_URL:-https://notes.houmq.cn}"

ensure_node() {
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1090
    . "$NVM_DIR/nvm.sh"
  fi
  if command -v node >/dev/null 2>&1; then
    echo "node: $(node -v)"
    return 0
  fi

  echo "=== install nvm + node 22 (cn mirror) ==="
  export NVM_NODEJS_ORG_MIRROR="${NVM_NODEJS_ORG_MIRROR:-https://npmmirror.com/mirrors/node}"
  if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    mkdir -p "$NVM_DIR"
    if ! git clone --depth 1 https://gitee.com/mirrors/nvm.git "$NVM_DIR" 2>/dev/null; then
      curl -fsSL --connect-timeout 60 --max-time 300 --retry 3 \
        https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    fi
    # shellcheck disable=SC1090
    . "$NVM_DIR/nvm.sh"
  fi
  nvm install 22
  nvm alias default 22
  nvm use 22
  echo "node: $(node -v)"
}

ensure_repo() {
  if [ -d "$REPO_PATH/.git" ]; then
    echo "Repo already exists at $REPO_PATH"
    return 0
  fi
  echo "=== clone repo ==="
  mkdir -p "$(dirname "$REPO_PATH")"
  if [ -e "$REPO_PATH" ]; then
    backup="${REPO_PATH}.bak.$(date +%s)"
    echo "moving existing path to $backup"
    mv "$REPO_PATH" "$backup"
  fi
  git clone --depth 1 --branch main "$REPO_URL" "$REPO_PATH"
}

ensure_node
ensure_repo
cd "$REPO_PATH"

npm config set registry https://registry.npmmirror.com
npm ci
SITE_BASE_URL="$SITE_BASE_URL" npm run build
echo "Bootstrap done. dist: $REPO_PATH/dist"
