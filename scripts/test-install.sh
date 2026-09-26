#!/usr/bin/env bash
# Runs install.sh in fresh containers and checks the result. Needs Docker; never runs in CI.
# Usage: scripts/test-install.sh [image ...]   (default: debian:bookworm debian:trixie ubuntu:24.04)
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

IMAGES=("$@")
[ ${#IMAGES[@]} -eq 0 ] && IMAGES=(debian:bookworm debian:trixie ubuntu:24.04)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
REF=$(git rev-parse --abbrev-ref HEAD)
git bundle create "$WORK/gitroast.bundle" "$REF" >/dev/null 2>&1
openssl genrsa 2048 > "$WORK/key.pem" 2>/dev/null
failures=0

check() { # check <description> <command...>
  local desc=$1; shift
  if "$@" >/dev/null 2>&1; then echo "  ok   $desc"; else echo "  FAIL $desc"; failures=$((failures + 1)); fi
}

in_ctr() { docker exec "$CID" bash -c "$1"; }

run_installer() { # run_installer <user> <extra env...>
  local user=$1; shift
  docker exec -i -u "$user" "$@" \
    -e GITROAST_REPO=/src/gitroast.bundle -e GITROAST_REF="$REF" \
    "$CID" bash -s -- --yes < install.sh > "$WORK/out.log" 2>&1
}

for image in "${IMAGES[@]}"; do
  for mode in root sudo-user; do
    echo "== $image as $mode"
    CID=$(docker run -d "$image" sleep 1800)
    docker exec "$CID" mkdir -p /src
    docker cp "$WORK/gitroast.bundle" "$CID:/src/gitroast.bundle" >/dev/null
    docker cp "$WORK/key.pem" "$CID:/src/key.pem" >/dev/null
    user=root
    if [ "$mode" = sudo-user ]; then
      in_ctr 'apt-get update -qq && apt-get install -y -qq sudo >/dev/null && useradd -m admin && echo "admin ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/admin' >/dev/null 2>&1
      user="admin"
    fi

    run_installer "$user" -e GITROAST_APP_ID=12345 -e GITROAST_PRIVATE_KEY_FILE=/src/key.pem
    rc=$?
    check "first install exits 0 (rc=$rc)" test "$rc" -eq 0
    [ "$rc" -ne 0 ] && tail -20 "$WORK/out.log"
    check "node is 22 or newer" in_ctr 'node -e "process.exit(Number(process.versions.node.split(\".\")[0]) >= 22 ? 0 : 1)"'
    check "app is built" in_ctr 'test -f /opt/gitroast/dist/index.js'
    check "service user owns the app" in_ctr 'test "$(stat -c %U /opt/gitroast)" = gitroast'
    check "service user home is outside the app" in_ctr 'test "$(getent passwd gitroast | cut -d: -f6)" = /var/lib/gitroast'
    check ".env is mode 600" in_ctr 'test "$(stat -c %a /opt/gitroast/.env)" = 600'
    check "webhook secret generated" in_ctr 'grep -Eq "^WEBHOOK_SECRET=[0-9a-f]{64}$" /opt/gitroast/.env'
    check "APP_ID written" in_ctr 'grep -q "^APP_ID=12345$" /opt/gitroast/.env'
    check "private key installed, mode 600" in_ctr 'test "$(stat -c %a:%U /opt/gitroast/gitroast.private-key.pem)" = 600:gitroast'
    check "TIMEZONE set" in_ctr 'grep -Eq "^TIMEZONE=.+" /opt/gitroast/.env'
    check "cloudflared installed" in_ctr 'command -v cloudflared'
    check "systemd unit installed" in_ctr 'test -f /etc/systemd/system/gitroast.service'
    check "git tree clean" in_ctr 'out=$(runuser -u gitroast -- git -C /opt/gitroast status --porcelain) && test -z "$out"'
    check "missing systemd reported" grep -q "systemd is not running" "$WORK/out.log"

    in_ctr 'md5sum /opt/gitroast/.env' > "$WORK/env.before"
    run_installer "$user"
    rc=$?
    check "re-run exits 0 (rc=$rc)" test "$rc" -eq 0
    check "re-run takes the update path" grep -q "Updating existing install" "$WORK/out.log"
    check "re-run keeps .env untouched" diff <(in_ctr 'md5sum /opt/gitroast/.env') "$WORK/env.before"
    docker rm -f "$CID" >/dev/null
  done
done

echo
if [ "$failures" -eq 0 ]; then echo "all checks passed"; else echo "$failures check(s) failed"; exit 1; fi
