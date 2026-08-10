#!/usr/bin/env bash
# Ensure git checkout exists at REPO_PATH without disturbing an existing dist/.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/MingQi39/my-digital-garden.git}"
REPO_PATH="${REPO_PATH:-/var/www/my-digital-garden}"

if [ -d "$REPO_PATH/.git" ]; then
  echo "=== repo ready: $REPO_PATH ==="
  exit 0
fi

parent="$(dirname "$REPO_PATH")"
mkdir -p "$parent"
scratch="$(mktemp -d "${parent}/.repo-bootstrap.XXXXXX")"

cleanup() {
  rm -rf "$scratch"
}
trap cleanup EXIT

echo "=== bootstrap repo at $REPO_PATH ==="
git clone --depth 1 --branch main "$REPO_URL" "$scratch"

if [ ! -e "$REPO_PATH" ]; then
  mv "$scratch" "$REPO_PATH"
  echo "=== cloned to $REPO_PATH ==="
  exit 0
fi

echo "=== merging source into existing $REPO_PATH (keeping dist/) ==="
shopt -s dotglob
for item in "$scratch"/*; do
  base="$(basename "$item")"
  if [ "$base" = "dist" ] && [ -d "$REPO_PATH/dist" ]; then
    continue
  fi
  rm -rf "$REPO_PATH/$base"
  mv "$item" "$REPO_PATH/$base"
done
shopt -u dotglob
echo "=== repo merged ==="
