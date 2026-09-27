#!/usr/bin/env bash
# GitRoast installer and updater for Debian, Raspberry Pi OS and Ubuntu.
#
#   curl -fsSL https://raw.githubusercontent.com/Ntrondle/GitRoast/main/install.sh | bash
#
# Options (after `bash -s --`):
#   --with-von    also install the local Von model (needs about 4 GB of memory)
#   --no-tunnel   skip Cloudflare Tunnel
#   --yes         never prompt; take answers from the environment only
#   --help        show this help
#
# Every prompt can be answered ahead of time with an environment variable:
#   GITROAST_APP_ID, GITROAST_PRIVATE_KEY_FILE, GITROAST_JEV_KEY,
#   GITROAST_TUNNEL_HOSTNAME, GITROAST_WITH_VON=1
# Running the script again updates an existing install and never overwrites .env values.
set -euo pipefail

REPO=${GITROAST_REPO:-https://github.com/Ntrondle/GitRoast.git}
REF=${GITROAST_REF:-main}
APP_DIR=/opt/gitroast
SVC_USER=gitroast
SVC_HOME=/var/lib/gitroast
KEY_FILE=$APP_DIR/gitroast.private-key.pem
VON_DIR=/opt/von
NODE_MAJOR=22
MIN_VON_MB=3500
TUNNEL_NAME=gitroast

WITH_VON=${GITROAST_WITH_VON:-0}
SETUP_TUNNEL=1
ASSUME_YES=0
INTERACTIVE=0
HAS_SYSTEMD=0
SUDO=()
APT_UPDATED=0
NOTES=()

if [ -t 1 ]; then BOLD=$'\033[1m' BLUE=$'\033[1;34m' YELLOW=$'\033[1;33m' RED=$'\033[1;31m' RESET=$'\033[0m'
else BOLD='' BLUE='' YELLOW='' RED='' RESET=''; fi
info() { printf '%s==>%s %s\n' "$BLUE" "$RESET" "$*"; }
warn() { printf '%swarning:%s %s\n' "$YELLOW" "$RESET" "$*" >&2; }
die() { printf '%serror:%s %s\n' "$RED" "$RESET" "$*" >&2; exit 1; }
note() { NOTES+=("$*"); }

usage() {
  cat <<'EOF'
GitRoast installer and updater for Debian, Raspberry Pi OS and Ubuntu.

  curl -fsSL https://raw.githubusercontent.com/Ntrondle/GitRoast/main/install.sh | bash
  curl -fsSL https://raw.githubusercontent.com/Ntrondle/GitRoast/main/install.sh | bash -s -- --with-von

Options:
  --with-von    also install the local Von model (needs about 4 GB of memory)
  --no-tunnel   skip Cloudflare Tunnel
  --yes         never prompt; take answers from the environment only
  --help        show this help

Answers can be given ahead of time as environment variables:
  GITROAST_APP_ID, GITROAST_PRIVATE_KEY_FILE, GITROAST_JEV_KEY,
  GITROAST_TUNNEL_HOSTNAME, GITROAST_WITH_VON=1
Running the installer again updates GitRoast and keeps existing settings.
EOF
}

# ---------- privileges ----------

as_root() { if [ ${#SUDO[@]} -eq 0 ]; then "$@"; else "${SUDO[@]}" "$@"; fi; }
as_svc() { as_root runuser -u "$SVC_USER" -- env HOME="$SVC_HOME" "$@"; }

detect_privileges() {
  if [ "$(id -u)" -eq 0 ]; then return; fi
  command -v sudo >/dev/null 2>&1 || die "sudo is not installed. Log in as root (su -) and run the same command again."
  SUDO=(sudo)
  as_root true || die "sudo did not work for $(id -un)."
}

# ---------- prompts ----------

detect_tty() {
  if [ "$ASSUME_YES" -eq 0 ] && (exec </dev/tty) 2>/dev/null; then INTERACTIVE=1; fi
}

ask() { # ask <question> [default]; prints the answer
  local answer=""
  printf '%s%s%s ' "$BOLD" "$1" "$RESET" >/dev/tty
  IFS= read -r answer </dev/tty || true
  printf '%s' "${answer:-${2:-}}"
}

# ---------- system checks ----------

detect_system() {
  [ -r /etc/os-release ] || die "cannot read /etc/os-release; only Debian, Raspberry Pi OS and Ubuntu are supported."
  # shellcheck disable=SC1091
  . /etc/os-release
  case " ${ID:-} ${ID_LIKE:-} " in
    *" debian "* | *" ubuntu "* | *" raspbian "*) ;;
    *) die "unsupported system '${PRETTY_NAME:-unknown}'. This installer supports Debian, Raspberry Pi OS and Ubuntu." ;;
  esac
  case "$(uname -m)" in
    x86_64 | aarch64 | armv7l) ;;
    armv6l) die "this board has an ARMv6 CPU (Pi 1 or Pi Zero). Node.js $NODE_MAJOR needs ARMv7 or newer." ;;
    *) die "unsupported CPU architecture $(uname -m)." ;;
  esac
  [ -d /run/systemd/system ] && HAS_SYSTEMD=1
  info "Detected ${PRETTY_NAME:-$ID} on $(uname -m)$([ "$HAS_SYSTEMD" -eq 1 ] || echo ', without systemd')"
}

# ---------- packages ----------

apt_install() {
  local missing=() pkg
  for pkg in "$@"; do dpkg -s "$pkg" >/dev/null 2>&1 || missing+=("$pkg"); done
  [ ${#missing[@]} -eq 0 ] && return
  if [ "$APT_UPDATED" -eq 0 ]; then as_root env DEBIAN_FRONTEND=noninteractive apt-get update -qq; APT_UPDATED=1; fi
  info "Installing ${missing[*]}"
  as_root env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends "${missing[@]}" >/dev/null
}

node_major() { command -v node >/dev/null 2>&1 && node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0; }

install_node() {
  if [ "$(node_major)" -ge "$NODE_MAJOR" ]; then info "Node.js $(node -v) is already installed"; return; fi
  info "Installing Node.js $NODE_MAJOR from NodeSource"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | as_root bash - >/dev/null
  APT_UPDATED=1
  as_root env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs >/dev/null
  [ "$(node_major)" -ge "$NODE_MAJOR" ] || die "Node.js $NODE_MAJOR did not install correctly (found $(node -v 2>/dev/null || echo none))."
}

install_cloudflared() {
  if command -v cloudflared >/dev/null 2>&1; then return; fi
  info "Installing cloudflared from Cloudflare's repository"
  as_root mkdir -p --mode=0755 /usr/share/keyrings
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | as_root tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
  echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' |
    as_root tee /etc/apt/sources.list.d/cloudflared.list >/dev/null
  as_root env DEBIAN_FRONTEND=noninteractive apt-get update -qq
  as_root env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq cloudflared >/dev/null
}

# ---------- app ----------

create_user() {
  id -u "$SVC_USER" >/dev/null 2>&1 && return
  info "Creating service user $SVC_USER"
  as_root useradd --system --create-home --home-dir "$SVC_HOME" --shell /usr/sbin/nologin "$SVC_USER"
}

fetch_code() {
  if [ -d "$APP_DIR/.git" ]; then
    info "Updating existing install in $APP_DIR"
    as_svc git -C "$APP_DIR" fetch -q origin "$REF"
    as_svc git -C "$APP_DIR" merge -q --ff-only FETCH_HEAD ||
      die "$APP_DIR has local changes that block the update. Resolve them with git, then run the installer again."
  elif [ -e "$APP_DIR" ] && [ -n "$(as_root ls -A "$APP_DIR")" ]; then
    die "$APP_DIR exists but is not a GitRoast checkout. Move it away and run the installer again."
  else
    info "Downloading GitRoast into $APP_DIR"
    as_root mkdir -p "$APP_DIR"
    as_root chown "$SVC_USER:" "$APP_DIR"
    as_svc git clone -q --branch "$REF" "$REPO" "$APP_DIR"
  fi
}

build_app() {
  info "Installing dependencies and building (this can take a few minutes on a Pi)"
  as_svc bash -c "cd '$APP_DIR' && npm ci --no-audit --no-fund --loglevel=error >/dev/null && npm run --silent build >/dev/null"
}

# ---------- .env ----------

ENV_FILE=$APP_DIR/.env

get_env() { as_root awk -v k="$1" -F= '$1 == k { sub(/^[^=]*=/, ""); print; exit }' "$ENV_FILE"; }

set_env() { # set_env <key> <value>; value is passed through the environment so awk never interprets it
  local tmp
  tmp=$(mktemp)
  as_root env K="$1" V="$2" awk '
    BEGIN { k = ENVIRON["K"]; v = ENVIRON["V"] }
    index($0, k "=") == 1 { print k "=" v; done = 1; next }
    { print }
    END { if (!done) print k "=" v }' "$ENV_FILE" >"$tmp"
  as_root install -m 600 -o "$SVC_USER" -g "$SVC_USER" "$tmp" "$ENV_FILE"
  rm -f "$tmp"
}

detect_timezone() {
  local tz=""
  if command -v timedatectl >/dev/null 2>&1; then tz=$(timedatectl show -p Timezone --value 2>/dev/null || true); fi
  [ -z "$tz" ] && [ -r /etc/timezone ] && tz=$(head -n1 /etc/timezone)
  [ -z "$tz" ] && [ -L /etc/localtime ] && tz=$(readlink /etc/localtime | sed 's#.*/zoneinfo/##')
  printf '%s' "${tz:-UTC}"
}

FRESH_ENV=0
prepare_env() {
  if as_root test -f "$ENV_FILE"; then return; fi
  FRESH_ENV=1
  as_root install -m 600 -o "$SVC_USER" -g "$SVC_USER" "$APP_DIR/.env.example" "$ENV_FILE"
  set_env WEBHOOK_SECRET "$(openssl rand -hex 32)"
  set_env TIMEZONE "$(detect_timezone)"
  info "Created $ENV_FILE with a new webhook secret and time zone $(get_env TIMEZONE)"
}

install_private_key() { # install_private_key <source file>
  grep -q -- "-----BEGIN .*PRIVATE KEY-----" "$1" 2>/dev/null || { warn "$1 is not a PEM private key"; return 1; }
  as_root install -m 600 -o "$SVC_USER" -g "$SVC_USER" "$1" "$KEY_FILE"
  set_env PRIVATE_KEY_PATH "$KEY_FILE"
  info "Installed the GitHub App private key"
}

prompt_private_key() {
  local path tmp line
  path=$(ask "Path to the app's .pem private key on this machine (Enter to paste it instead):")
  if [ -n "$path" ]; then install_private_key "${path/#\~/$HOME}" || true; return; fi
  printf 'Paste the key, from -----BEGIN to -----END, then press Enter:\n' >/dev/tty
  tmp=$(mktemp)
  while IFS= read -r line </dev/tty; do
    printf '%s\n' "$line" >>"$tmp"
    case "$line" in -----END*) break ;; esac
  done
  install_private_key "$tmp" || true
  rm -f "$tmp"
}

webhook_url() {
  local host=""
  if as_root test -f /etc/cloudflared/config.yml; then
    host=$(as_root awk '/hostname:/ { print $NF; exit }' /etc/cloudflared/config.yml)
  fi
  host=${host:-${TUNNEL_HOSTNAME:-}}
  if [ -n "$host" ]; then printf 'https://%s/api/github/webhooks' "$host"; else printf 'https://<your public hostname>/api/github/webhooks'; fi
}

print_github_app_steps() {
  cat <<EOF

${BOLD}Create the GitHub App${RESET} at https://github.com/settings/apps/new
  Homepage URL:    any full https:// URL (required by GitHub, not used)
  Webhook URL:     $(webhook_url)
  Webhook secret:  $(get_env WEBHOOK_SECRET)
  Permissions:     Metadata read-only, Pull requests read & write, Issues read & write
  Events:          Pull request
Then generate a private key and install the app on your repositories.

EOF
}

configure_app() {
  local app_id jev
  [ -n "${GITROAST_APP_ID:-}" ] && set_env APP_ID "$GITROAST_APP_ID"
  if [ -n "${GITROAST_PRIVATE_KEY_FILE:-}" ]; then install_private_key "$GITROAST_PRIVATE_KEY_FILE" || die "could not install $GITROAST_PRIVATE_KEY_FILE"; fi
  [ -n "${GITROAST_JEV_KEY:-}" ] && set_env TYPESAFE_API_KEY "$GITROAST_JEV_KEY"

  if [ -z "$(get_env APP_ID)" ] || ! as_root test -f "$KEY_FILE"; then
    print_github_app_steps
    if [ "$INTERACTIVE" -eq 1 ]; then
      if [ -z "$(get_env APP_ID)" ]; then
        app_id=$(ask "GitHub App ID (Enter to skip for now):")
        [ -n "$app_id" ] && set_env APP_ID "$app_id"
      fi
      as_root test -f "$KEY_FILE" || prompt_private_key
    fi
  fi

  if [ "$FRESH_ENV" -eq 1 ] && [ "$INTERACTIVE" -eq 1 ] && [ -z "$(get_env TYPESAFE_API_KEY)" ]; then
    jev=$(ask "Jev API key from TypeSafe AI (optional, Enter to skip):")
    [ -n "$jev" ] && set_env TYPESAFE_API_KEY "$jev"
  fi
}

app_configured() {
  [ -n "$(get_env APP_ID)" ] && [ -n "$(get_env WEBHOOK_SECRET)" ] && as_root test -f "$KEY_FILE"
}

# ---------- tunnel ----------

TUNNEL_HOSTNAME=${GITROAST_TUNNEL_HOSTNAME:-}
setup_tunnel() {
  [ "$SETUP_TUNNEL" -eq 1 ] || return 0
  install_cloudflared
  if as_root test -f /etc/cloudflared/config.yml; then info "Cloudflare Tunnel is already configured"; return; fi
  if [ "$HAS_SYSTEMD" -eq 0 ]; then note "Cloudflare Tunnel was installed but not configured, because systemd is not running."; return; fi
  if [ -z "$TUNNEL_HOSTNAME" ] && [ "$INTERACTIVE" -eq 1 ]; then
    TUNNEL_HOSTNAME=$(ask "Public hostname for the tunnel, e.g. gitroast.example.com (Enter to skip):")
  fi
  if [ -z "$TUNNEL_HOSTNAME" ]; then note "Cloudflare Tunnel is not configured. Run the installer again with a hostname, or see the README."; return; fi

  local id port
  port=$(get_env PORT); port=${port:-3000}
  if ! as_root test -f /root/.cloudflared/cert.pem; then
    info "Log in to Cloudflare: open the URL below and pick the domain for $TUNNEL_HOSTNAME"
    as_root cloudflared tunnel login </dev/tty
  fi
  id=$(as_root cloudflared tunnel list 2>/dev/null | awk -v n="$TUNNEL_NAME" '$2 == n { print $1; exit }')
  if [ -z "$id" ]; then
    id=$(as_root cloudflared tunnel create "$TUNNEL_NAME" 2>&1 | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -n1)
  fi
  [ -n "$id" ] || die "could not create the Cloudflare tunnel."
  as_root cloudflared tunnel route dns "$id" "$TUNNEL_HOSTNAME" >/dev/null 2>&1 ||
    warn "could not create the DNS record for $TUNNEL_HOSTNAME; it may already exist."
  as_root mkdir -p /etc/cloudflared
  printf 'tunnel: %s\ncredentials-file: /root/.cloudflared/%s.json\ningress:\n  - hostname: %s\n    service: http://localhost:%s\n  - service: http_status:404\n' \
    "$id" "$id" "$TUNNEL_HOSTNAME" "$port" | as_root tee /etc/cloudflared/config.yml >/dev/null
  as_root cloudflared service install >/dev/null 2>&1 || as_root systemctl restart cloudflared
  info "Cloudflare Tunnel is serving https://$TUNNEL_HOSTNAME"
}

# ---------- Von ----------

setup_von() {
  [ "$WITH_VON" = 1 ] || return 0
  local mem_mb
  mem_mb=$(awk '/^MemTotal:/ { print int($2 / 1024) }' /proc/meminfo)
  if [ "$mem_mb" -lt "$MIN_VON_MB" ]; then
    note "Von was skipped: it needs about 4 GB of memory and this machine has ${mem_mb} MB."
    return
  fi
  apt_install python3 python3-venv
  as_root mkdir -p "$VON_DIR"
  as_root chown "$SVC_USER:" "$VON_DIR"
  [ -x "$VON_DIR/.venv/bin/pip" ] || as_svc python3 -m venv "$VON_DIR/.venv"
  info "Installing Von (downloads about 2 GB of model weights on first start)"
  if ! as_svc "$VON_DIR/.venv/bin/pip" install -q --upgrade von-sdk; then
    note "Von could not be installed with pip; GitRoast will run without it."
    return
  fi
  [ -z "$(get_env VON_BASE_URL)" ] && set_env VON_BASE_URL http://127.0.0.1:8000
  as_root install -m 644 "$APP_DIR/deploy/von.service" /etc/systemd/system/von.service
  if [ "$HAS_SYSTEMD" -eq 1 ]; then
    as_root systemctl daemon-reload
    as_root systemctl enable -q --now von
  fi
}

# ---------- service ----------

install_service() {
  local node_bin
  node_bin=$(command -v node)
  sed "s#^ExecStart=/usr/bin/node #ExecStart=$node_bin #" "$APP_DIR/deploy/gitroast.service" |
    as_root tee /etc/systemd/system/gitroast.service >/dev/null
  if [ "$HAS_SYSTEMD" -eq 0 ]; then
    note "systemd is not running here, so GitRoast was not started. Start it with: cd $APP_DIR && sudo -u $SVC_USER node node_modules/probot/bin/probot.js run ./dist/index.js"
    warn "systemd is not running; skipping service start"
    return
  fi
  as_root systemctl daemon-reload
  if ! app_configured; then
    note "GitRoast is installed but not started: set APP_ID and the private key, then run: sudo systemctl enable --now gitroast"
    return
  fi
  as_root systemctl enable -q gitroast
  as_root systemctl restart gitroast
  wait_for_bot
}

wait_for_bot() {
  local port code
  port=$(get_env PORT); port=${port:-3000}
  for _ in $(seq 1 30); do
    code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "http://localhost:$port/api/github/webhooks" -H 'content-type: application/json' -d '{}' || true)
    if [ "$code" = 400 ]; then info "GitRoast is running and rejecting unsigned webhooks, as it should"; return; fi
    sleep 1
  done
  note "GitRoast did not answer on port $port within 30 seconds. Check: journalctl -u gitroast -n 50"
}

# ---------- main ----------

main() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --with-von) WITH_VON=1 ;;
      --no-tunnel) SETUP_TUNNEL=0 ;;
      --yes | -y) ASSUME_YES=1 ;;
      --help | -h) usage; exit 0 ;;
      *) die "unknown option $1 (see --help)" ;;
    esac
    shift
  done

  detect_system
  detect_privileges
  detect_tty
  apt_install ca-certificates curl git openssl
  install_node
  create_user
  fetch_code
  build_app
  prepare_env
  setup_tunnel
  configure_app
  setup_von
  install_service

  printf '\n%sDone.%s GitRoast lives in %s; settings are in %s.\n' "$BOLD" "$RESET" "$APP_DIR" "$ENV_FILE"
  local n
  for n in "${NOTES[@]+"${NOTES[@]}"}"; do printf '  - %s\n' "$n"; done
}

# Everything runs inside main, reading nothing from stdin, so `curl ... | bash` can't feed the
# rest of this script to a command by accident. Prompts read /dev/tty directly.
main "$@" </dev/null
