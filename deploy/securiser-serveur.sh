#!/usr/bin/env bash
# =============================================================================
#  GEM Consult — RENFORCEMENT DE LA SÉCURITÉ du serveur OVH (à lancer une fois)
#    curl -fsSL https://raw.githubusercontent.com/gemconsultabm-cpu/gem-consult/main/deploy/securiser-serveur.sh | sudo bash
#
#  Prudent par construction : chaque mesure est testée et annulée si elle échoue ;
#  rien n'est modifié dans la connexion SSH (mot de passe, port), pour ne jamais
#  vous empêcher de vous connecter.
#   1. mises à jour de sécurité automatiques du système (Debian / Ubuntu) ;
#   2. fail2ban : bannit 1 h les adresses qui essaient des mots de passe SSH en série ;
#   3. pare-feu : seuls les services déjà ouverts restent accessibles, tout nouveau port est fermé ;
#   4. nginx : version masquée ;
#   5. conteneur du site : privilèges réduits au strict nécessaire ;
#   6. sauvegarde quotidienne des données du site (14 jours conservés).
# =============================================================================
set -uo pipefail
vert()  { printf '\033[1;32m%s\033[0m\n' "$*"; }
jaune() { printf '\033[1;33m%s\033[0m\n' "$*"; }
info()  { printf '\n\033[1;34m▶ %s\033[0m\n' "$*"; }
[ "$(id -u)" = 0 ] || { echo "À lancer avec sudo."; exit 1; }
BILAN=()
ok()   { vert "  ✓ $*"; BILAN+=("✓ $*"); }
pasok(){ jaune "  ! $*"; BILAN+=("! $*"); }
APT=0; command -v apt-get >/dev/null && APT=1

info "1/6 Mises à jour de sécurité automatiques"
if [ "$APT" = 1 ]; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq >/dev/null 2>&1
  if apt-get install -y -qq unattended-upgrades >/dev/null 2>&1; then
    cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
    ok "Correctifs de sécurité du système installés automatiquement chaque jour (sans redémarrage automatique)"
  else pasok "unattended-upgrades non installé"; fi
else pasok "Système non Debian/Ubuntu : mises à jour automatiques à régler par l'informaticien"; fi

info "2/6 Protection contre les attaques de mots de passe (fail2ban)"
if [ "$APT" = 1 ] && apt-get install -y -qq fail2ban >/dev/null 2>&1; then
  cat > /etc/fail2ban/jail.d/gemabm.local <<'EOF'
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 6
[sshd]
enabled = true
EOF
  # Debian 12 / Ubuntu 24 : journaux dans journald
  if [ ! -f /var/log/auth.log ]; then sed -i '/^\[sshd\]/a backend = systemd' /etc/fail2ban/jail.d/gemabm.local; fi
  systemctl enable --now fail2ban >/dev/null 2>&1; systemctl restart fail2ban >/dev/null 2>&1
  sleep 2
  if fail2ban-client status sshd >/dev/null 2>&1; then ok "fail2ban actif : 6 mots de passe SSH faux en 10 min = adresse bannie 1 h"
  else rm -f /etc/fail2ban/jail.d/gemabm.local; systemctl restart fail2ban >/dev/null 2>&1; pasok "fail2ban n'a pas démarré : configuration retirée"; fi
else pasok "fail2ban non installé"; fi

info "3/6 Pare-feu"
if [ "$APT" = 1 ] && apt-get install -y -qq ufw >/dev/null 2>&1; then
  if ufw status | grep -q "Status: active"; then ok "Pare-feu déjà actif (réglages de l'informaticien conservés)"
  else
    # Ports TCP actuellement ouverts sur Internet (hors 127.0.0.1) : on les garde tous, SSH en premier.
    PORTS=$(ss -Hltn 2>/dev/null | awk '{print $4}' | grep -v -E '^(127\.|\[::1\]|::1)' | sed 's/.*://' | sort -un)
    SSHP=$(sshd -T 2>/dev/null | awk '/^port /{print $2}'); PORTS=$(printf '%s\n%s\n22\n80\n443\n' "$PORTS" "$SSHP" | grep -E '^[0-9]+$' | sort -un)
    ufw --force reset >/dev/null; ufw default deny incoming >/dev/null; ufw default allow outgoing >/dev/null
    UPORTS=$(ss -Hlun 2>/dev/null | awk '{print $4}' | grep -v -E '^(127\.|\[::1\]|::1)' | sed 's/.*://' | grep -E '^[0-9]+$' | sort -un)
    for p in $PORTS; do ufw allow "$p"/tcp >/dev/null; done
    for p in $UPORTS; do ufw allow "$p"/udp >/dev/null; done
    ufw limit "${SSHP:-22}"/tcp >/dev/null
    if ufw --force enable >/dev/null 2>&1; then ok "Pare-feu actif ; ports ouverts : TCP $(echo $PORTS | tr ' ' ',')${UPORTS:+ ; UDP $(echo $UPORTS | tr ' ' ',')} (SSH limité contre les essais en rafale)"
    else ufw --force disable >/dev/null 2>&1; pasok "Pare-feu non activé"; fi
  fi
else pasok "ufw non installé"; fi

info "4/6 nginx"
if command -v nginx >/dev/null && [ -d /etc/nginx/conf.d ]; then
  if grep -rqs "server_tokens off" /etc/nginx/nginx.conf /etc/nginx/conf.d/; then ok "Version de nginx déjà masquée"
  else
    echo "server_tokens off;   # GEM Consult : ne pas afficher la version de nginx" > /etc/nginx/conf.d/gemabm-securite.conf
    if nginx -t >/dev/null 2>&1 && systemctl reload nginx; then ok "Version de nginx masquée"
    else rm -f /etc/nginx/conf.d/gemabm-securite.conf; pasok "Réglage nginx annulé (configuration non compatible)"; fi
  fi
else pasok "nginx non trouvé sur l'hôte (peut-être dans un conteneur)"; fi

info "5/6 Conteneur du site"
SITE_DIR=$(sed -n 's/^SITE_DIR=//p' /etc/gemabm-maj.conf 2>/dev/null | tr -d '"')
COMPOSE=$(sed -n 's/^COMPOSE=//p' /etc/gemabm-maj.conf 2>/dev/null | tr -d '"'); COMPOSE=${COMPOSE:-docker compose}
if [ -n "$SITE_DIR" ] && [ -d "$SITE_DIR" ]; then
  O="$SITE_DIR/docker-compose.override.yml"
  if [ -f "$O" ]; then ok "Réglages Docker de l'informaticien conservés ($O existe déjà)"
  else
    cat > "$O" <<'EOF'
# GEM Consult — durcissement du conteneur du site (ajouté par securiser-serveur.sh)
services:
  web:
    security_opt: ["no-new-privileges:true"]
    cap_drop: ["ALL"]
    pids_limit: 512
EOF
    PORT=$(sed -n 's/^WEB_PORT=//p' "$SITE_DIR/.env" 2>/dev/null | tr -d '"\r'); PORT=${PORT:-3010}
    (cd "$SITE_DIR" && $COMPOSE up -d web >/dev/null 2>&1); okc=0
    for _ in $(seq 1 45); do [ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/")" = 200 ] && { okc=1; break; }; sleep 2; done
    if [ "$okc" = 1 ]; then ok "Conteneur du site sans privilèges inutiles"
    else rm -f "$O"; (cd "$SITE_DIR" && $COMPOSE up -d web >/dev/null 2>&1); pasok "Durcissement du conteneur annulé (le site ne répondait pas)"; fi
  fi
else pasok "Dossier du site inconnu : lancez d'abord installer-mise-a-jour.sh"; fi

info "6/6 Sauvegarde quotidienne des données du site"
if [ -n "$SITE_DIR" ] && [ -d "$SITE_DIR/gem-data" ]; then
  cat > /etc/cron.d/gemabm-sauvegarde <<EOF
# GEM Consult : sauvegarde des données du site chaque nuit à 3 h, 14 jours conservés
0 3 * * * root mkdir -p /root/sauvegardes-gemabm && tar -C "$SITE_DIR" -czf /root/sauvegardes-gemabm/donnees-\$(date +\%Y\%m\%d).tar.gz gem-data .env && find /root/sauvegardes-gemabm -name 'donnees-*.tar.gz' -mtime +14 -delete
EOF
  chmod 644 /etc/cron.d/gemabm-sauvegarde; chmod 700 /root/sauvegardes-gemabm 2>/dev/null || true
  ok "Sauvegarde des données chaque nuit dans /root/sauvegardes-gemabm (14 jours)"
else pasok "Données du site introuvables : sauvegarde non programmée"; fi

echo; vert "════════ BILAN ════════"; printf '%s\n' "${BILAN[@]}"
echo; echo "Recommandé ensuite (avec l'informaticien) : connexion SSH par clé plutôt que par mot de passe,"
echo "et sauvegarde automatique du VPS dans l'espace client OVH (option « Backup automatisé »)."
