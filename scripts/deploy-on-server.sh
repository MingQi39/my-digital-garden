#!/usr/bin/env bash
# Build and/or publish notes on the VPS. Used by GitHub Actions deploy workflow.
set -euo pipefail

BUILD_REPO="${BUILD_REPO:-my-digital-garden}"
SITE_BASE_URL="${SITE_BASE_URL:-https://notes.houmq.cn}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/my-digital-garden/dist}"
BUILD_DIR="${BUILD_DIR:-$HOME/$BUILD_REPO}"
LOG_FILE="${LOG_FILE:-/tmp/my-digital-garden-build.log}"
ARCHIVE_MIRRORS=(
  "https://ghfast.top/https://github.com/MingQi39/my-digital-garden/archive/refs/heads/main.tar.gz"
  "https://mirror.ghproxy.com/https://github.com/MingQi39/my-digital-garden/archive/refs/heads/main.tar.gz"
)

log() {
  echo "[$(date -u +%H:%M:%S)] $*"
}

ensure_node() {
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1090
    . "$NVM_DIR/nvm.sh"
  fi
  if command -v node >/dev/null 2>&1; then
    log "node: $(node -v)"
    return 0
  fi
  log "ERROR: node not found (run scripts/deploy-bootstrap.sh on VPS once)"
  exit 1
}

bootstrap_source() {
  local staging="${BUILD_DIR}.staging.$$"
  mkdir -p "$staging"
  trap 'rm -rf "$staging"' EXIT

  for url in "${ARCHIVE_MIRRORS[@]}"; do
    log "download source: $url"
    if curl -fsSL --connect-timeout 30 --retry 2 --retry-delay 5 --max-time 2400 \
      "$url" | tar -xzf - -C "$staging" --strip-components=1; then
      if [ -f "$staging/package.json" ]; then
        if [ -d "$BUILD_DIR/node_modules" ]; then
          log "reuse existing node_modules"
          rm -rf "$staging/node_modules"
          mv "$BUILD_DIR/node_modules" "$staging/node_modules"
        fi
        if [ -f "$BUILD_DIR/.npm-ci-hash" ]; then
          cp "$BUILD_DIR/.npm-ci-hash" "$staging/.npm-ci-hash"
        fi
        rm -rf "$BUILD_DIR"
        mv "$staging" "$BUILD_DIR"
        trap - EXIT
        log "source ready at $BUILD_DIR"
        return 0
      fi
    fi
    log "download failed for $url"
    rm -rf "$staging"/*
  done
  log "ERROR: cannot download source archive"
  exit 1
}

ensure_source() {
  if [ -f "$BUILD_DIR/package.json" ]; then
    log "use source at $BUILD_DIR"
    return 0
  fi
  bootstrap_source
}

npm_install() {
  cd "$BUILD_DIR"
  npm config set registry https://registry.npmmirror.com
  LOCK_HASH="$(md5sum package-lock.json | awk '{print $1}')"
  if [ -f .npm-ci-hash ] && [ "$(cat .npm-ci-hash)" = "$LOCK_HASH" ] && [ -d node_modules ]; then
    log "package-lock unchanged, skip npm ci"
    return 0
  fi
  log "npm ci"
  npm ci
  echo "$LOCK_HASH" > .npm-ci-hash
}

build_site() {
  cd "$BUILD_DIR"
  log "npm run build (full log: $LOG_FILE)"
  : > "$LOG_FILE"
  if ! SITE_BASE_URL="$SITE_BASE_URL" npm run build >>"$LOG_FILE" 2>&1; then
    log "ERROR: npm run build failed"
    tail -n 80 "$LOG_FILE" || true
    exit 1
  fi
  tail -n 30 "$LOG_FILE" || true
  if [ ! -f dist/index.html ]; then
    log "ERROR: dist/index.html missing after build"
    exit 1
  fi
  log "dist ready: $(du -sh dist | awk '{print $1}')"
}

publish_dist() {
  cd "$BUILD_DIR"
  if [ ! -f dist/index.html ]; then
    log "ERROR: dist/index.html missing, run build first"
    exit 1
  fi
  mkdir -p "$DEPLOY_PATH"
  if rsync -a --delete dist/ "$DEPLOY_PATH/"; then
    log "dist published to $DEPLOY_PATH"
  elif command -v sudo >/dev/null 2>&1 && sudo rsync -a --delete dist/ "$DEPLOY_PATH/"; then
    log "dist published via sudo rsync to $DEPLOY_PATH"
  else
    log "ERROR: cannot write to $DEPLOY_PATH"
    exit 1
  fi
  du -sh "$DEPLOY_PATH"
  if [ ! -f "$DEPLOY_PATH/index.html" ]; then
    log "ERROR: $DEPLOY_PATH/index.html missing after publish"
    exit 1
  fi
  log "deploy complete"
}

usage() {
  echo "usage: $0 [all|build|publish]" >&2
  exit 2
}

cmd="${1:-all}"
case "$cmd" in
  build)
    ensure_node
    ensure_source
    npm_install
    build_site
    ;;
  publish)
    publish_dist
    ;;
  all)
    ensure_node
    ensure_source
    npm_install
    build_site
    publish_dist
    ;;
  *)
    usage
    ;;
esac
