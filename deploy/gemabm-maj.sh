#!/usr/bin/env bash
# GEM Consult — installe la dernière version du site publiée sur GitHub (branche main).
# Lancée toutes les 5 minutes par /etc/cron.d/gemabm-maj ; « gemabm-maj --force » pour forcer.
# Protégés (jamais remplacés ni supprimés) : gem-data/, .env*, docker-compose*.yml du serveur.
# Si la nouvelle version ne répond pas, la version précédente est réinstallée automatiquement.
set -uo pipefail
CONF=/etc/gemabm-maj.conf
[ -f "$CONF" ] || { echo "gemabm-maj : $CONF absent (lancer d'abord installer-mise-a-jour.sh)"; exit 1; }
# shellcheck disable=SC1090
. "$CONF"
COMPOSE="${COMPOSE:-docker compose}"
exec 9>/run/gemabm-maj.lock; flock -n 9 || exit 0          # une seule mise à jour à la fois
journal() { echo "[$(date '+%F %T')] $*"; }

cd "$DEPOT_DIR" || exit 1
git fetch -q origin main || { journal "GitHub injoignable, nouvel essai dans 5 minutes"; exit 0; }
ACTUEL=$(cat "$SITE_DIR/.version-gemabm" 2>/dev/null || echo aucune)
NOUVEAU=$(git rev-parse origin/main)
ECHEC=/var/lib/gemabm-maj.echec                              # version déjà essayée sans succès : pas de nouvel essai en boucle
if [ "${1:-}" != "--force" ]; then
  [ "$ACTUEL" = "$NOUVEAU" ] && exit 0
  [ "$(cat "$ECHEC" 2>/dev/null)" = "$NOUVEAU" ] && exit 0
fi

PORT=$(sed -n 's/^WEB_PORT=//p' "$SITE_DIR/.env" 2>/dev/null | tr -d '"\r'); PORT=${PORT:-3010}

deployer() {   # $1 = version (commit) à installer
  git -C "$DEPOT_DIR" checkout -q --force "$1" || return 1
  rsync -a --delete \
    --exclude='.git/' --exclude='gem-data/' --exclude='.env' --exclude='.env.*' \
    --exclude='docker-compose.yml' --exclude='docker-compose.override.yml' \
    --exclude='node_modules/' --exclude='.next/' --exclude='*.zip' --exclude='.version-gemabm' \
    "$DEPOT_DIR/" "$SITE_DIR/" || return 1
  [ -f "$SITE_DIR/docker-compose.yml" ] || cp "$DEPOT_DIR/docker-compose.yml" "$SITE_DIR/"
  (cd "$SITE_DIR" && $COMPOSE up -d --build 9>&-) || return 1
  for _ in $(seq 1 60); do                                   # attend que le site réponde (2 min max)
    code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/" || true)
    [ "$code" = 200 ] && { echo "$1" > "$SITE_DIR/.version-gemabm"; return 0; }
    sleep 2
  done
  return 1
}

journal "Nouvelle version ${NOUVEAU:0:7} ($(git log -1 --format=%s "$NOUVEAU")) — installation…"
if deployer "$NOUVEAU"; then
  journal "OK : version ${NOUVEAU:0:7} en ligne."; rm -f "$ECHEC"
  docker image prune -f >/dev/null 2>&1 || true
  exit 0
fi
journal "ÉCHEC de la version ${NOUVEAU:0:7}."; echo "$NOUVEAU" > "$ECHEC"
if [ "$ACTUEL" != aucune ] && git cat-file -e "$ACTUEL" 2>/dev/null; then
  journal "Retour à la version précédente ${ACTUEL:0:7}…"
  if deployer "$ACTUEL"; then journal "Version précédente rétablie."; else journal "ATTENTION : rétablissement impossible, intervention nécessaire."; fi
else
  journal "Pas de version précédente connue : restaurer la sauvegarde de /root/sauvegardes-gemabm si le site ne répond plus."
fi
exit 1
