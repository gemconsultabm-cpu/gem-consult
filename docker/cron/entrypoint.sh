#!/bin/sh
set -e
[ -n "$CRON_SECRET" ] || { echo "CRON_SECRET manquant (fichier .env)"; exit 1; }
sed "s/__SECRET__/$CRON_SECRET/g" /etc/gem/crontab.template > /etc/crontabs/root
echo "[GEM] Planificateur démarré ($(date)) :"; grep -v '^#' /etc/gem/crontab.template | sed 's/-H "x-cron-key: __SECRET__" //'
# Premier remplissage de l'actualité dès le démarrage
(sleep 20 && curl -fsS -m 120 -X POST -H "x-cron-key: $CRON_SECRET" http://web:3000/api/cron/news && echo) &
exec crond -f -l 8
