# gemabm.com — site du Cabinet GEM Consult (Next.js)

Site vitrine trilingue (FR / EN / AR) du cabinet, avec outils fiscaux, veille quotidienne et assistant rédigés par Claude (API Anthropic).

## Pile technique
| Couche | Choix |
|---|---|
| Framework | **Next.js 16** (App Router, TypeScript), sortie `standalone` |
| Rendu | Pages statiques pré-générées, une par rubrique : `/`, `/cabinet`, `/services`, `/references`, `/outils`, `/ressources`, `/veille`, `/contact` |
| Interface | Balisage trilingue (`content/body.ts`) et styles (`app/site.css`) ; comportements (langues, outils, assistant) en JavaScript client (`public/js/site.js`) |
| Polices | Spectral, Archivo, Amiri, Noto Naskh Arabic, **auto-hébergées** (`@fontsource`) : aucune requête vers Google |
| Serveur | Routes API Node (`app/api/*`), sans base de données : fichiers JSON dans `GEM_DATA_DIR` |
| IA | API Claude : `claude-sonnet-5-5` (rédaction, assistant), `claude-haiku-5-5` (tri des demandes), outil de recherche web |
| E-mails | SMTP via `nodemailer` (boîte OVH du domaine ou Gmail) |
| Exploitation | Docker (`web` + `cron`), derrière le reverse proxy nginx du VPS |

## Arborescence
```
app/
  [[...slug]]/page.tsx   pages publiques (métadonnées par rubrique)
  layout.tsx, site.css    gabarit, polices, styles
  admin/                  administration (/admin) : installation, clé API, SMTP, contenus IA
  api/contact             formulaires → e-mail + analyse Claude (tri, brouillon de réponse)
  api/assistant           assistant IA du site
  api/ia-data             contenus publiés (veille, repères fiscaux, échéances)
  api/news, rss, rates    actualité de la profession, flux, cours de change
  api/cron/[task]         déclenchement des tâches planifiées (protégé par CRON_SECRET)
  robots.ts, sitemap.ts, manifest.ts
content/body.ts           TEXTES DU SITE (FR / EN / AR) — c'est ici qu'on modifie le contenu
lib/server/               logique serveur : claude, tâches IA, repères, actualité, e-mails, authentification
public/                   js/site.js, images, sw.js (site installable)
docker/cron/              planificateur (crond + curl)
deploy/                   bloc nginx
```

## Développement
```
npm ci
GEM_DATA_DIR=./gem-data npm run dev      # http://localhost:3000
npm run build && npm run typecheck
```
Mode test sans clé API : `GEM_AI_MOCK=/dossier/reponses`, qui lit des fichiers de réponses simulées `veille.txt`, `reperes.txt`, `echeances.txt`, `tri.txt` et `assistant.txt`.

## Mise en production
Voir **DEPLOIEMENT.md**.
