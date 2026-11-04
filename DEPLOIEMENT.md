# Mise en production sur le VPS (Docker + nginx existant)

Destinataire : l'informaticien du cabinet. Durée : environ 30 minutes. Le nouveau site **remplace l'ancien site Next.js** ; l'ancien reste disponible pour un retour arrière immédiat.

## Prérequis sur le VPS
- Docker Engine avec le plugin Compose (`docker compose version`).
- nginx et le certificat Let's Encrypt de gemabm.com : **déjà en place** pour l'ancien site.
- Sortie HTTPS autorisée vers `api.anthropic.com`, vers les sites des médias tunisiens (flux RSS) et vers le serveur SMTP.

## 1. Installer le projet
```
unzip gemabm-next.zip -d /opt && cd /opt/gemabm-next
cp .env.example .env
sed -i "s/^CRON_SECRET=.*/CRON_SECRET=$(openssl rand -hex 32)/" .env
nano .env                      # vérifier WEB_PORT : un port LIBRE (l'ancien site utilise peut-être 3000) — par défaut 3010
mkdir -p gem-data && chown 1001:1001 gem-data && chmod 750 gem-data
```

## 2. Construire et démarrer
```
docker compose up -d --build
docker compose ps                                  # web : healthy · cron : running
curl -sI http://127.0.0.1:3010/ | head -1          # HTTP/1.1 200 OK
docker compose logs web | grep "Code d'installation"
```
Le code d'installation apparaît dans les journaux à la première visite de `/admin`. Pour le provoquer : `curl -s http://127.0.0.1:3010/admin >/dev/null`.

## 3. Basculer nginx vers le nouveau site
1. Sauvegarder la configuration actuelle : `cp /etc/nginx/sites-available/<fichier-gemabm> /root/nginx-gemabm.bak`
2. Dans le bloc `server` HTTPS de gemabm.com, faire pointer `proxy_pass` vers `http://127.0.0.1:3010`. Le modèle complet est dans `deploy/nginx-gemabm.conf` ; on peut en reprendre uniquement les lignes utiles :
   - `X-Real-IP` et `X-Forwarded-For` : indispensables pour la protection anti-abus ;
   - `proxy_read_timeout 420s` sur `/admin` ;
   - le blocage de `/api/cron/`.
3. `nginx -t && systemctl reload nginx`
4. **Retour arrière** si nécessaire : remettre l'ancien `proxy_pass` (ou restaurer la sauvegarde), puis `systemctl reload nginx`.

Cas particulier : si nginx tourne lui-même dans un conteneur Docker, le relier au réseau du projet (`docker network connect gemabm-next_default <conteneur-nginx>`) et utiliser `proxy_pass http://gemabm-web:3000;`.

## 4. Première connexion (avec le cabinet)
1. Ouvrir `https://gemabm.com/admin`, saisir le code d'installation, puis choisir le mot de passe administrateur.
2. **Clé API Claude** : la coller, puis « Tester la clé ». Créer la clé sur console.anthropic.com et fixer un plafond de dépense mensuel.
3. **E-mails** :
   - boîte OVH `site@gemabm.com` : serveur `ssl0.ovh.net`, port 465, case SSL cochée ;
   - ou Gmail : serveur `smtp.gmail.com`, port 587, case décochée, avec un mot de passe d'application.
   Puis « Enregistrer et envoyer un e-mail de test ».
4. Lancer « Veille du jour » et « Vérifier les repères fiscaux » pour un premier remplissage.

## 5. Vérifications
- `https://gemabm.com`, `/cabinet`, `/outils`… dans les 3 langues, sur ordinateur et sur mobile.
- Formulaire de contact : le message « envoyé ✓ » s'affiche et un e-mail d'analyse IA arrive au cabinet.
- `curl -s -o /dev/null -w '%{http_code}' https://gemabm.com/api/cron/veille` doit renvoyer **404** (bloqué par nginx).
- `docker compose logs cron` : planificateur démarré, avec la liste des horaires.

## Tâches automatiques (conteneur `cron`, heure de Tunis)
| Horaire | Tâche |
|---|---|
| 6 h et 13 h | Actualité de la profession (flux des médias, filtrés) |
| 7 h 15 | Veille du cabinet rédigée par Claude (FR/EN/AR) |
| 7 h 30 | Vérification des taux, barèmes et seuils ; mise à jour des simulateurs |
| 7 h 45, du 1er au 5 et du 20 au 28 | Échéances fiscales du mois (communiqué DGI) |

## Exploitation courante
- **Mise à jour du site** : remplacer les fichiers, puis `docker compose up -d --build`. Le dossier `gem-data/` (configuration, clé, veille) est conservé.
- **Sauvegarde** à ajouter dans la crontab de l'hôte :
  `30 2 * * * tar -czf /var/backups/gem-data-$(date +\%u).tgz -C /opt/gemabm-next gem-data`
- **Journaux** :
  - `docker compose logs -f web` ;
  - `gem-data/ia.log` : tâches IA, tests de clé, e-mails en échec.
- **Données** : `gem-data/config.json` contient la clé API, le hash du mot de passe et le SMTP, en droits 600 et hors image Docker. **Ne jamais le versionner.**
- **Arrêt de l'IA** : depuis /admin, « Supprimer la clé ». Le site continue de fonctionner, l'assistant répondant à partir de la FAQ.

## Ce que le projet n'utilise plus
Les scripts PHP de la version précédente (`api/*.php`, `.htaccess`, `install-vps.sh`) sont remplacés par les routes API de Next.js et par Docker. Il n'y a pas d'Apache ni de PHP à installer.

## Mise à jour « référencement » (novembre 2026)

Cette version donne à chaque page et à chaque langue sa propre adresse, lisible par Google :

- 24 pages : `/`, `/cabinet`, `/services`, `/references`, `/outils`, `/ressources`, `/veille`, `/contact`, puis les mêmes sous `/en/…` et `/ar/…` ;
- chaque analyse de la veille quotidienne a sa page (`/veille/analyse/<id>`, en 3 langues) ;
- titres, descriptions, balises hreflang, adresses canoniques, données structurées et plan du site (`/sitemap.xml`) générés automatiquement ;
- les anciennes adresses avec `#` continuent de fonctionner.

Déploiement : comme d'habitude, `docker compose up -d --build` (aucune variable nouvelle, données conservées).

Après déploiement :
1. Google Search Console → ajouter la propriété « Domaine » `gemabm.com` → copier l'enregistrement TXT proposé → l'ajouter dans la zone DNS OVH → valider.
2. Search Console → Sitemaps → soumettre `https://gemabm.com/sitemap.xml`.
3. Bing Webmaster Tools → « Importer depuis Google Search Console ».

## Mise à jour automatique depuis GitHub (à installer une seule fois)

Sur le serveur, une seule commande :

```bash
curl -fsSL https://raw.githubusercontent.com/gemconsultabm-cpu/gem-consult/main/deploy/installer-mise-a-jour.sh | sudo bash
```

Ensuite, toute nouvelle version publiée sur la branche `main` du dépôt `gemconsultabm-cpu/gem-consult` est installée en 5 minutes maximum. Les éléments suivants ne sont jamais touchés : `gem-data/`, `.env`, `docker-compose.yml` du serveur, nginx et les certificats. Une sauvegarde complète est faite au départ dans `/root/sauvegardes-gemabm/`. Si une version ne démarre pas, la précédente est remise en place automatiquement.

- Journal : `/var/log/gemabm-maj.log`
- Forcer une mise à jour : `sudo gemabm-maj --force`
- Suspendre les mises à jour : `sudo rm /etc/cron.d/gemabm-maj`

## Sécurité (novembre 2026)

Intégré au site, appliqué automatiquement par la mise à jour :
- en-têtes de sécurité stricts (CSP sans aucune ressource externe, HSTS, anti-clickjacking, isolation des origines) ;
- plus aucun relais tiers pour l'actualité (tout passe par le serveur du cabinet, flux en liste blanche) ;
- administration : 5 échecs depuis une même adresse = blocage 15 min ; 30 échecs en 1 h = connexion fermée 1 h et alerte e-mail ; e-mail à chaque connexion réussie ; double authentification (application Authenticator) ; bouton « Déconnecter toutes les sessions » ; mot de passe de 12 caractères minimum ; journal `gem-data/securite.log` ;
- dépendances sans vulnérabilité connue (`npm audit` : 0), `/.well-known/security.txt`.

Perte du téléphone de double authentification : sur le serveur, supprimer les lignes `totpSecret` et `totpLast` de `gem-data/config.json`, puis se reconnecter avec le seul mot de passe.

Renforcement du serveur (une fois, après l'installation de la mise à jour automatique) :

```bash
curl -fsSL https://raw.githubusercontent.com/gemconsultabm-cpu/gem-consult/main/deploy/securiser-serveur.sh | sudo bash
```

Ce script installe les mises à jour de sécurité automatiques, fail2ban (SSH), un pare-feu qui conserve les ports déjà ouverts, masque la version de nginx, réduit les privilèges du conteneur (`docker-compose.override.yml`) et programme une sauvegarde nocturne de `gem-data` et `.env` (14 jours). Chaque mesure est annulée si elle échoue ; la connexion SSH n'est pas modifiée.
