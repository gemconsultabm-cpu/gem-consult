#!/usr/bin/env bash
# =============================================================================
#  GEM Consult — installation de la MISE À JOUR AUTOMATIQUE du site gemabm.com
#  À lancer UNE SEULE FOIS sur le serveur OVH :
#    curl -fsSL https://raw.githubusercontent.com/gemconsultabm-cpu/gem-consult/main/deploy/installer-mise-a-jour.sh | sudo bash
#
#  Ce que fait ce script :
#   1. retrouve le dossier du site déjà en place (Docker) ;
#   2. en fait une sauvegarde complète (données comprises) ;
#   3. installe la commande « gemabm-maj » qui, toutes les 5 minutes, regarde
#      s'il existe une nouvelle version sur GitHub et l'installe ;
#   4. installe immédiatement la dernière version.
#  Jamais touchés : gem-data/ (clé API, veille, mots de passe), .env,
#  docker-compose.yml du serveur, configuration nginx et certificats.
#  En cas d'échec d'une mise à jour, l'ancienne version est remise en place.
# =============================================================================
set -euo pipefail

DEPOT_URL="${GEMABM_DEPOT:-https://github.com/gemconsultabm-cpu/gem-consult.git}"
DEPOT_DIR=/opt/gemabm-depot
CONF=/etc/gemabm-maj.conf
SAUV=/root/sauvegardes-gemabm
TTY=/dev/tty

vert()  { printf '\033[1;32m%s\033[0m\n' "$*"; }
rouge() { printf '\033[1;31m%s\033[0m\n' "$*"; }
info()  { printf '\n\033[1;34m▶ %s\033[0m\n' "$*"; }

[ "$(id -u)" = 0 ] || { rouge "Ce script doit être lancé avec sudo (ou en root)."; exit 1; }

info "1/5 Vérification des outils"
command -v docker >/dev/null || { rouge "Docker est introuvable sur ce serveur : arrêt, rien n'a été modifié."; exit 1; }
if docker compose version >/dev/null 2>&1; then COMPOSE="docker compose"
elif command -v docker-compose >/dev/null; then COMPOSE="docker-compose"
else rouge "« docker compose » est introuvable : arrêt, rien n'a été modifié."; exit 1; fi
manque=""; for o in git rsync curl flock; do command -v "$o" >/dev/null || manque="$manque $o"; done
if [ -n "$manque" ]; then
  echo "Installation de :$manque"
  if command -v apt-get >/dev/null; then apt-get update -qq && apt-get install -y -qq git rsync curl util-linux >/dev/null
  elif command -v dnf >/dev/null; then dnf install -y -q git rsync curl util-linux
  else rouge "Impossible d'installer$manque automatiquement."; exit 1; fi
fi
vert "Outils présents ($COMPOSE)."

info "2/5 Recherche du dossier du site"
est_site() { [ -f "$1/docker-compose.yml" ] && [ -f "$1/package.json" ] && grep -q '"gemabm-site"' "$1/package.json"; }
SITE_DIR="${GEMABM_SITE_DIR:-}"
if [ -z "$SITE_DIR" ] && [ -f "$CONF" ]; then SITE_DIR=$(sed -n 's/^SITE_DIR=//p' "$CONF" | tr -d '"'); fi
if [ -z "$SITE_DIR" ]; then
  cands=$( { docker compose ls -a --format json 2>/dev/null | grep -o '"ConfigFiles":"[^"]*"' | sed 's/.*:"//;s/"$//' | tr ',' '\n' | xargs -r -n1 dirname;
             find /root /home /opt /srv /var/www -maxdepth 4 -name package.json -not -path '*/node_modules/*' 2>/dev/null | xargs -r -n1 dirname; } | sort -u )
  trouves=(); for d in $cands; do est_site "$d" && trouves+=("$d"); done
  if [ "${#trouves[@]}" = 1 ]; then SITE_DIR="${trouves[0]}"
  else
    [ "${#trouves[@]}" -gt 1 ] && { echo "Plusieurs dossiers possibles :"; printf '  %s\n' "${trouves[@]}"; }
    printf 'Chemin du dossier du site (celui qui contient docker-compose.yml) : ' > $TTY
    read -r SITE_DIR < $TTY
  fi
fi
SITE_DIR="${SITE_DIR%/}"
est_site "$SITE_DIR" || { rouge "« $SITE_DIR » ne contient pas le site GEM Consult : arrêt, rien n'a été modifié."; exit 1; }
vert "Site trouvé : $SITE_DIR"

info "3/5 Sauvegarde complète avant toute modification"
mkdir -p "$SAUV"; chmod 700 "$SAUV"
F="$SAUV/site-$(date +%Y%m%d-%H%M%S).tar.gz"
tar -C "$(dirname "$SITE_DIR")" --exclude='node_modules' --exclude='.next' -czf "$F" "$(basename "$SITE_DIR")"
vert "Sauvegarde : $F"

info "4/5 Installation de la mise à jour automatique"
if [ -d "$DEPOT_DIR/.git" ]; then git -C "$DEPOT_DIR" remote set-url origin "$DEPOT_URL"; git -C "$DEPOT_DIR" fetch -q origin main
else rm -rf "$DEPOT_DIR"; git clone -q --branch main "$DEPOT_URL" "$DEPOT_DIR"; fi
[ -f "$DEPOT_DIR/deploy/gemabm-maj.sh" ] || { rouge "Le dépôt GitHub ne contient pas deploy/gemabm-maj.sh : arrêt."; exit 1; }
install -m 755 "$DEPOT_DIR/deploy/gemabm-maj.sh" /usr/local/bin/gemabm-maj
cat > "$CONF" <<EOF
SITE_DIR="$SITE_DIR"
DEPOT_DIR="$DEPOT_DIR"
COMPOSE="$COMPOSE"
EOF
cat > /etc/cron.d/gemabm-maj <<'EOF'
# GEM Consult : vérifie toutes les 5 minutes s'il existe une nouvelle version du site sur GitHub
*/5 * * * * root /usr/local/bin/gemabm-maj >> /var/log/gemabm-maj.log 2>&1
EOF
chmod 644 /etc/cron.d/gemabm-maj
touch /var/log/gemabm-maj.log
vert "Commande « gemabm-maj » et vérification toutes les 5 minutes installées."

info "5/5 Installation de la dernière version (quelques minutes, ne fermez pas la fenêtre)"
if /usr/local/bin/gemabm-maj --force 2>&1 | tee -a /var/log/gemabm-maj.log; then
  echo; vert "TERMINÉ. Le site est à jour et se mettra désormais à jour tout seul."
  echo "Journal : /var/log/gemabm-maj.log — Sauvegarde : $F"
else
  echo; rouge "La nouvelle version n'a pas démarré. Remise en place de l'ancienne version (sauvegarde)…"
  rm -f /etc/cron.d/gemabm-maj                       # pas de nouvel essai automatique tant que ce n'est pas réglé
  T=$(mktemp -d); tar -C "$T" -xzf "$F"
  rsync -a --delete --exclude='gem-data/' --exclude='.env' --exclude='node_modules/' --exclude='.next/' \
    "$T/$(basename "$SITE_DIR")/" "$SITE_DIR/"; rm -rf "$T" "$SITE_DIR/.version-gemabm"
  (cd "$SITE_DIR" && $COMPOSE up -d --build) && vert "Ancienne version rétablie : le site fonctionne comme avant."
  echo "Envoyez le contenu de /var/log/gemabm-maj.log à Claude ou à votre informaticien."
  exit 1
fi
