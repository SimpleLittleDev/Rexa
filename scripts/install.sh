#!/usr/bin/env bash
# Rexa one-line installer for Linux, macOS, and Termux.
#
#   curl -fsSL https://raw.githubusercontent.com/SimpleLittleDev/Rexa/main/scripts/install.sh | bash
#
# Override defaults with env vars:
#   REXA_REPO=https://github.com/SimpleLittleDev/Rexa.git
#   REXA_BRANCH=main
#   REXA_HOME=$HOME/.rexa

set -euo pipefail

REPO="${REXA_REPO:-https://github.com/SimpleLittleDev/Rexa.git}"
BRANCH="${REXA_BRANCH:-main}"
HOME_DIR="${REXA_HOME:-$HOME/.rexa}"

bold() { printf "\033[1m%s\033[0m\n" "$*"; }
info() { printf "  \033[36m›\033[0m %s\n" "$*"; }
ok()   { printf "  \033[32m✓\033[0m %s\n" "$*"; }
err()  { printf "  \033[31m✗\033[0m %s\n" "$*" >&2; }

require() {
  command -v "$1" >/dev/null 2>&1 || { err "Butuh '$1' di PATH"; exit 1; }
}

bold "Rexa installer"
require git
require node
require npm

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  err "Node.js >= 20 required (you have $(node -v))"
  exit 1
fi

if [ -d "$HOME_DIR/.git" ]; then
  info "Updating $HOME_DIR"
  git -C "$HOME_DIR" fetch --quiet origin "$BRANCH"
  git -C "$HOME_DIR" reset --hard "origin/$BRANCH"
else
  info "Cloning $REPO -> $HOME_DIR"
  git clone --branch "$BRANCH" --depth 1 "$REPO" "$HOME_DIR"
fi
ok "Source ready"

info "Installing dependencies"
(cd "$HOME_DIR" && npm install --silent)
ok "Dependencies installed"

info "Building TypeScript"
(cd "$HOME_DIR" && npm run build --silent)
ok "Build complete"

info "Linking 'rexa' command globally"
(cd "$HOME_DIR" && npm link --silent) || {
  err "npm link failed (need sudo on some systems)."
  err "Retry with: cd $HOME_DIR && sudo npm link"
  exit 1
}
ok "rexa is now on your PATH"

cat <<EOF

$(bold "Next steps")
  rexa setup     # interactive wizard
  rexa doctor    # verify environment
  rexa chat      # CLI chat

Rexa home: $HOME_DIR
Override anytime: export REXA_HOME=/some/other/path
EOF
