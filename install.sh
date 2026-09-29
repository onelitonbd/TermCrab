#!/usr/bin/env bash
# TermCrab installer - works on Termux and any Linux/macOS with Node >= 20.10.
# Usage: curl -fsSL https://raw.githubusercontent.com/onelitonbd/claw/arena/01a0ec99-claw/install.sh | bash
set -euo pipefail

REPO="${TCRAB_REPO:-https://github.com/onelitonbd/claw.git}"
BRANCH="${TCRAB_BRANCH:-arena/01a0ec99-claw}"
DEST="${TCRAB_DEST:-$HOME/.local/share/termcrab}"

say() { printf '\033[36m[termcrab]\033[0m %s\n' "$*"; }
fail() { printf '\033[31m[termcrab] ERROR:\033[0m %s\n' "$*" >&2; exit 1; }

# --- Node -------------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  if [ -n "${PREFIX:-}" ] && [ -x "$PREFIX/bin/pkg" ]; then
    say "installing Node.js via Termux pkg..."
    pkg update -y && pkg install -y nodejs-lts
  else
    fail "Node.js >= 20.10 not found. Install it first (https://nodejs.org or: pkg install nodejs-lts)"
  fi
fi
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[ "$NODE_MAJOR" -ge 20 ] || fail "Node $(node -v) is too old (need >= 20.10)"
say "node $(node -v) ok"

# --- git --------------------------------------------------------------
command -v git >/dev/null 2>&1 || {
  if [ -n "${PREFIX:-}" ]; then pkg install -y git; else fail "git not found"; fi
}

# --- clone ------------------------------------------------------------
if [ -d "$DEST/.git" ]; then
  say "updating existing checkout at $DEST"
  git -C "$DEST" fetch --quiet origin "$BRANCH"
  git -C "$DEST" checkout --quiet "$BRANCH"
  git -C "$DEST" pull --quiet --ff-only origin "$BRANCH" || true
else
  say "cloning $REPO ($BRANCH) -> $DEST"
  mkdir -p "$(dirname "$DEST")"
  git clone --quiet --branch "$BRANCH" "$REPO" "$DEST"
fi

# --- build ------------------------------------------------------------
cd "$DEST"
say "installing dev dependencies + build..."
npm install --no-fund --no-audit

# --- shim -------------------------------------------------------------
BIN_DIR="$HOME/.local/bin"
mkdir -p "$BIN_DIR"
cat > "$BIN_DIR/termcrab" <<EOF
#!/usr/bin/env bash
exec node "$DEST/dist/src/bin/termcrab.js" "\$@"
EOF
chmod +x "$BIN_DIR/termcrab"
case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *) say "add to your shell:  export PATH=\"\$PATH:$BIN_DIR\"" ;;
esac

# --- post -------------------------------------------------------------
if [ ! -f "${TCRAB_HOME:-$HOME/.termcrab}/config.json" ]; then
  say "no config yet - run onboarding:"
  echo
  echo "   termcrab onboard"
  echo
else
  say "existing config found - 'termcrab doctor' to verify"
fi
say "done 🦀"
