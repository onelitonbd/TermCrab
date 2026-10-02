#!/usr/bin/env bash
# TermCrab installer - works on Termux and any Linux/macOS with Node >= 20.10.
# Usage: curl -fsSL https://raw.githubusercontent.com/onelitonbd/claw/main/install.sh | bash
# Pin a version: TCRAB_BRANCH=v0.34.0 curl -fsSL <url> | bash
set -euo pipefail

REPO="${TCRAB_REPO:-https://github.com/onelitonbd/claw.git}"
BRANCH="${TCRAB_BRANCH:-main}"
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

# --- clone / upgrade --------------------------------------------------
MODE="install"
if [ -d "$DEST/.git" ]; then
  MODE="upgrade"
  say "upgrading existing install at $DEST"
  say "target ref: $BRANCH  (override with TCRAB_BRANCH=<branch|tag>)"
  git -C "$DEST" fetch --quiet --tags origin
  # Resolve $BRANCH to a commit SHA: prefer a tag, then a remote branch.
  TARGET_SHA=""
  if git -C "$DEST" rev-parse -q --verify "refs/tags/$BRANCH^{commit}" >/dev/null 2>&1; then
    TARGET_SHA=$(git -C "$DEST" rev-parse "refs/tags/$BRANCH^{commit}")
  elif git -C "$DEST" rev-parse -q --verify "origin/$BRANCH^{commit}" >/dev/null 2>&1; then
    TARGET_SHA=$(git -C "$DEST" rev-parse "origin/$BRANCH^{commit}")
  else
    fail "branch/tag '$BRANCH' not found in $REPO"
  fi
  CURRENT_SHA=$(git -C "$DEST" rev-parse HEAD 2>/dev/null || echo "")
  DIRTY=0
  if ! git -C "$DEST" diff --quiet 2>/dev/null; then DIRTY=1; fi
  if [ -n "$(git -C "$DEST" ls-files --others --exclude-standard 2>/dev/null)" ]; then DIRTY=1; fi
  if [ "$CURRENT_SHA" != "$TARGET_SHA" ] || [ "$DIRTY" = "1" ]; then
    if [ "$DIRTY" = "1" ]; then
      say "working tree has local changes - resetting to $BRANCH (user config in ~/.termcrab is preserved)"
    else
      say "updating to $BRANCH..."
    fi
    # Discard any local modifications and untracked files (build artifacts,
    # leftover files from failed merges, etc.), then set the tree to the
    # target commit. Safe because user data lives in ~/.termcrab, not the
    # install dir.
    git -C "$DEST" reset --hard --quiet "$TARGET_SHA"
    git -C "$DEST" clean -fd --quiet
  fi
  # Make sure we are sitting on the requested branch (if it exists as a local
  # branch head) rather than a detached HEAD from a tag fetch.
  if git -C "$DEST" show-ref --verify --quiet "refs/heads/$BRANCH"; then
    git -C "$DEST" checkout --quiet "$BRANCH"
    git -C "$DEST" reset --hard --quiet "$TARGET_SHA"
  else
    # Tag-based install: stay on detached HEAD at the tag.
    git -C "$DEST" checkout --quiet "$TARGET_SHA"
  fi
else
  say "installing: cloning $REPO ($BRANCH) -> $DEST"
  say "target ref: $BRANCH  (override with TCRAB_BRANCH=<branch|tag>)"
  mkdir -p "$(dirname "$DEST")"
  # Try to clone by branch first, then by tag.
  if ! git clone --quiet --branch "$BRANCH" "$REPO" "$DEST" 2>/dev/null; then
    # Branch clone failed; try tag.
    git clone --quiet "$REPO" "$DEST"
    git -C "$DEST" fetch --quiet --tags origin
    if git -C "$DEST" rev-parse -q --verify "refs/tags/$BRANCH^{commit}" >/dev/null 2>&1; then
      git -C "$DEST" checkout --quiet "$BRANCH"
    else
      fail "could not find branch or tag '$BRANCH' in $REPO"
    fi
  fi
fi

# --- build ------------------------------------------------------------
cd "$DEST"
say "installing dev dependencies + build..."
npm install --no-fund --no-audit

# --- shim -------------------------------------------------------------
write_shim() {
  # Clear whatever is at the target first: a stale file OR a broken symlink
  # from an older install would make the write below fail and kill the whole
  # installer (seen in the wild: "line 52: .../termcrab: No such file").
  rm -f "$1/termcrab" 2>/dev/null || true
  cat > "$1/termcrab" <<'SHIM'
#!/usr/bin/env bash
# Self-locating shim: finds the install relative to this script's location.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
for CANDIDATE in \
  "$SCRIPT_DIR/../lib/node_modules/termcrab" \
  "$SCRIPT_DIR/../share/termcrab" \
  "$HOME/.local/share/termcrab" \
  "$HOME/.termcrab"; do
  if [ -f "$CANDIDATE/dist/src/bin/termcrab.js" ]; then
    exec node "$CANDIDATE/dist/src/bin/termcrab.js" "$@"
  fi
done
echo "termcrab: install not found - reinstall with: curl -fsSL https://raw.githubusercontent.com/onelitonbd/claw/main/install.sh | bash" >&2
exit 1
SHIM
  chmod +x "$1/termcrab"
}
BIN_DIR="$HOME/.local/bin"
mkdir -p "$BIN_DIR"
BIN_OK=0
PREFIX_OK=0
write_shim "$BIN_DIR" && BIN_OK=1 || say "warning: could not write $BIN_DIR/termcrab"
# On Termux, $PREFIX/bin is already on PATH - drop a shim there too (no PATH edits needed).
if [ -n "${PREFIX:-}" ] && [ -d "$PREFIX/bin" ] && [ -w "$PREFIX/bin" ]; then
  if write_shim "$PREFIX/bin" 2>/dev/null; then
    PREFIX_OK=1
    say "termcrab command installed (PREFIX/bin)"
  else
    say "warning: could not write $PREFIX/bin/termcrab - using $BIN_DIR instead"
  fi
else
  case ":$PATH:" in
    *":$BIN_DIR:"*) say "termcrab command installed ($BIN_DIR)" ;;
    *) say "termcrab command installed ($BIN_DIR) - add to PATH:  export PATH=\"\$PATH:$BIN_DIR\"" ;;
  esac
fi
if [ "$BIN_OK" != 1 ] && [ "$PREFIX_OK" != 1 ]; then
  fail "could not install the 'termcrab' command anywhere"
fi
# Prove the command actually runs before claiming success.
ACTIVE="$BIN_DIR/termcrab"
[ "$PREFIX_OK" = 1 ] && ACTIVE="$PREFIX/bin/termcrab"
if ! "$ACTIVE" config path >/dev/null 2>&1; then
  fail "the termcrab command was written but did not run (is node on your PATH?)"
fi
# If an OLDER copy would win on PATH, say so now instead of confusing later.
RESOLVED="$(command -v termcrab 2>/dev/null || true)"
if [ -n "$RESOLVED" ] && [ "$RESOLVED" != "$BIN_DIR/termcrab" ] && [ "$RESOLVED" != "$PREFIX/bin/termcrab" ]; then
  say "note: 'termcrab' on your PATH points to an OLDER copy at $RESOLVED"
  say "      remove that old copy (or its folder) so this install is the one that runs"
fi

# --- post -------------------------------------------------------------
if [ ! -f "${TCRAB_HOME:-$HOME/.termcrab}/config.json" ]; then
  say "no config yet - run onboarding:"
  echo
  echo "   termcrab onboard"
  echo
else
  say "existing config found - 'termcrab doctor' to verify"
fi
VER=$(node -p "require('$DEST/package.json').version" 2>/dev/null || echo '?')
echo
if [ "$MODE" = "upgrade" ]; then
  say "upgraded 🦀 (v$VER) at $DEST"
else
  say "installed 🦀 (v$VER) at $DEST"
fi
echo "   next:  termcrab onboard    (setup wizard)"
echo "          termcrab status     (see everything in plain words)"
