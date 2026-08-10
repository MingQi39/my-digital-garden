#!/usr/bin/env bash
# Install Node.js 22 on Linux when missing. Uses npmmirror first (China-friendly).
set -euo pipefail

NODE_MAJOR="${NODE_MAJOR:-22}"
NODE_VERSION="${NODE_VERSION:-22.17.1}"
ARCH="${NODE_ARCH:-linux-x64}"
PREFIX="${NODE_PREFIX:-$HOME/.local}"

if command -v node >/dev/null 2>&1; then
  echo "node: $(node -v)"
  exit 0
fi

if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$HOME/.nvm/nvm.sh"
  if command -v node >/dev/null 2>&1; then
    echo "node: $(node -v)"
    exit 0
  fi
fi

TARBALL="node-v${NODE_VERSION}-${ARCH}.tar.xz"
URLS=(
  "https://npmmirror.com/mirrors/node/v${NODE_VERSION}/${TARBALL}"
  "https://nodejs.org/dist/v${NODE_VERSION}/${TARBALL}"
)

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

for url in "${URLS[@]}"; do
  echo "=== download node from $url ==="
  if curl -fsSL --connect-timeout 30 --max-time 900 "$url" -o "$tmpdir/$TARBALL"; then
    mkdir -p "$PREFIX"
    tar -xJf "$tmpdir/$TARBALL" -C "$PREFIX" --strip-components=1
    export PATH="$PREFIX/bin:$PATH"
    if ! grep -qs '\.local/bin' "$HOME/.bashrc" 2>/dev/null; then
      echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
    fi
    echo "node: $(node -v)"
    exit 0
  fi
  echo "download failed, trying next mirror..."
done

echo "ERROR: could not install Node ${NODE_MAJOR}" >&2
exit 1
