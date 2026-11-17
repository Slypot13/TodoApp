# Todo App

Application Todo List : un client web (Vite, JavaScript) qui appelle une API REST (Node.js / Express) stockant les tâches dans PostgreSQL. Les deux sont déployés sur Scalingo.

- Client en ligne : https://todoapp-client.osc-fr1.scalingo.io
- API en ligne : https://todoapp.osc-fr1.scalingo.io/health (documentation : https://todoapp.osc-fr1.scalingo.io/docs)

Fonctionnalités : afficher, ajouter, terminer / annuler et supprimer des tâches, avec gestion d'erreurs côté API (400, 404, 500, 503) et côté interface.

---

## Architecture

```
Navigateur ──HTTPS──▶ app Scalingo « client »   (Node.js, serve -s dist)
     │                    fichiers statiques construits par Vite
     │
     └──────HTTPS──▶ app Scalingo « api »       (Node.js, Express)
                          │  SCALINGO_POSTGRESQL_URL
                          ▼
                     addon PostgreSQL (postgresql-starter-512)
```

Monorepo : un seul dépôt GitHub, deux apps Scalingo. Chacune pointe vers son dossier grâce à `PROJECT_DIR`.

```
api/                     API Express
  src/app.js             routes /, /health, /docs, /tasks
  src/openapi.js         spécification OpenAPI affichée sur /docs
  src/routes/tasks.js    CRUD des tâches (SQL paramétré)
  src/config.js          configuration lue depuis l'environnement
  src/migrate.js         exécute les migrations SQL non encore jouées
  src/seed.js            données initiales (une seule fois)
  migrations/            migrations versionnées (001_..., 002_...)
  test/                  tests d'intégration (node:test + vraie base)
  Procfile               process web + postdeploy (migrations)
client/                  Client Vite
  index.html, src/       interface, appels à l'API (src/api.js)
  public/images/         images du carrousel
  Procfile               sert dist/ avec serve
docker-compose.yml       PostgreSQL 16 local (bases todo et todo_test)
.github/workflows/       CI : lint + tests, déclenchée par dossier
```

### API

| Méthode | Route         | Réponse                                   |
|---------|---------------|-------------------------------------------|
| GET     | `/health`     | 200 si l'API et la base répondent, sinon 503 |
| GET     | `/docs`       | documentation Swagger (spec brute : `/openapi.json`) |
| GET     | `/tasks`      | 200, liste des tâches                     |
| POST    | `/tasks`      | 201, `{ "title": "...", "done": false }` |
| PUT     | `/tasks/:id`  | 200, modifie `title` et/ou `done`         |
| DELETE  | `/tasks/:id`  | 200, supprime la tâche                    |

### Migrations

Le schéma n'est jamais créé au démarrage de l'API. Chaque changement de schéma est un nouveau fichier `api/migrations/NNN_description.sql`. `npm run migrate` joue, dans l'ordre et dans une transaction, ceux qui ne figurent pas encore dans la table `schema_migrations`. Sur Scalingo, le process `postdeploy` le fait après chaque déploiement : si une migration échoue, le déploiement est annulé et l'ancienne version reste en ligne.

---

## Lancer le projet en local

Prérequis : Node.js 22 et Docker.

```bash
git clone https://github.com/Slypot13/TodoApp.git
cd TodoApp

# 1. Base de données
docker compose up -d

# 2. API (terminal 1)
cd api
cp .env.example .env
npm install
npm run migrate
npm run seed        # facultatif
npm run dev         # http://localhost:3000/health

# 3. Client (terminal 2)
cd client
cp .env.example .env
npm install
npm run dev         # http://localhost:5173
```

Tests et lint :

```bash
cd api && npm run lint && npm test       # utilise la base todo_test
cd client && npm run lint && npm test
```

---

## Variables d'environnement

### API (`api/`)

| Variable | Local | Scalingo | Rôle |
|---|---|---|---|
| `DATABASE_URL` | oui | non | URL PostgreSQL locale (et en CI) |
| `SCALINGO_POSTGRESQL_URL` | non | fournie par l'addon | URL PostgreSQL de production, prioritaire sur `DATABASE_URL` |
| `TEST_DATABASE_URL` | oui | non | base utilisée par `npm test` |
| `PORT` | facultatif | fournie par Scalingo | port d'écoute |
| `CORS_ORIGINS` | oui | oui | origines autorisées, séparées par des virgules (URL publique du client) |
| `DATABASE_SSL` | facultatif | facultatif | force (`true`) ou coupe (`false`) le TLS vers la base ; déduit de `sslmode` sinon |
| `PROJECT_DIR` | non | `api` | dossier de l'app dans le monorepo |

Note : avec SQLAlchemy il faudrait remplacer `postgres://` par `postgresql://` ; le driver Node `pg` accepte les deux, aucune conversion n'est nécessaire.

### Client (`client/`)

| Variable | Local | Scalingo | Rôle |
|---|---|---|---|
| `VITE_API_URL` | oui | oui | URL de l'API sans `/tasks`. Figée dans le bundle au build : la changer impose un redéploiement. Le build échoue si elle est absente. |
| `PORT` | facultatif | fournie par Scalingo | port de `serve` |
| `PROJECT_DIR` | non | `client` | dossier de l'app dans le monorepo |

Les valeurs ne sont jamais commitées : seuls les fichiers `.env.example` le sont.

---

## Procédure de déploiement (reproductible)

Prérequis : un compte Scalingo et la [CLI Scalingo](https://doc.scalingo.com/tools/cli/start) (`scalingo login`). Apps utilisées : `todoapp` (API) et `todoapp-client` (client).

Compte Scalingo créé via GitHub (sans mot de passe) : ajouter sa clé SSH publique dans **User settings → SSH Keys**, puis `scalingo login --ssh --ssh-identity ~/.ssh/id_ed25519`.

Premier déploiement réalisé sans liaison GitHub, par `git push` vers chaque app (le monorepo entier est envoyé, `PROJECT_DIR` choisit le dossier) :

```bash
git remote add scalingo-api    git@ssh.osc-fr1.scalingo.com:todoapp.git
git remote add scalingo-client git@ssh.osc-fr1.scalingo.com:todoapp-client.git
git push scalingo-api main:master
git push scalingo-client main:master
```

### 1. API et base

```bash
scalingo create todoapp --region osc-fr1
scalingo --app todoapp env-set PROJECT_DIR=api
scalingo --app todoapp addons-add postgresql postgresql-starter-512
```

Dans le dashboard de `todoapp` : onglet **Deploy → Configuration**, lier le dépôt GitHub `Slypot13/TodoApp`, branche `main`, puis lancer un déploiement manuel. Le build utilise le buildpack Node.js (détecté via `api/package.json`), puis `postdeploy` joue les migrations.

```bash
scalingo --app todoapp run npm run seed     # une seule fois
curl https://todoapp.osc-fr1.scalingo.io/health
```

### 2. Client

```bash
scalingo create todoapp-client --region osc-fr1
scalingo --app todoapp-client env-set PROJECT_DIR=client \
  VITE_API_URL=https://todoapp.osc-fr1.scalingo.io
```

Lier le même dépôt GitHub à `todoapp-client` et déployer. Scalingo exécute `npm run build` (Vite → `dist/`) puis `npm start` (`serve -s dist`, qui renvoie `index.html` pour toute URL inconnue : un rafraîchissement ne donne jamais 404).

### 3. Relier les deux

```bash
scalingo --app todoapp env-set CORS_ORIGINS=https://todoapp-client.osc-fr1.scalingo.io
```

(`env-set` redémarre l'app.) Ouvrir le client, ajouter / terminer / supprimer une tâche, et vérifier dans l'onglet Réseau qu'il n'y a pas d'erreur CORS.

### 4. Déploiement automatique

Pour chaque app, dans **Deploy → Configuration** : activer **Auto Deploy** sur `main` et l'option qui attend la réussite de la CI. Les workflows `.github/workflows/api.yml` et `client.yml` lancent lint + tests (et le build pour le client) uniquement quand leur dossier change. Une pull request qui casse un test reste rouge et n'est donc jamais déployée.

#### Testé le 17/11/2026 : un code rouge n'atteint pas la production

1. Commit `6cb4815` ajoutant un test volontairement faux (`assert.equal(1, 2)`) poussé sur `main`.
2. GitHub Actions : workflow **API** en échec (`failure`).
3. Scalingo : **aucun déploiement** de `6cb4815`, ni pour `todoapp` ni pour `todoapp-client` ; la production reste sur le commit précédent.
4. Correction (`git revert`, commit `c92cf87`) poussée : CI verte, puis déploiement automatique de `todoapp` (statut `success`), sans action manuelle.

---

## Coût mensuel

| Ressource | Taille | Estimation (HT/mois) |
|---|---|---|
| App `todoapp` (API) | 1 conteneur S (256 Mo) | ≈ 7,20 € |
| App `todoapp-client` | 1 conteneur S (256 Mo) | ≈ 7,20 € |
| PostgreSQL | Starter 512 | ≈ 7,20 € |
| **Total** | | **≈ 21,60 €** |

Estimation d'après la [grille tarifaire Scalingo](https://scalingo.com/pricing) (à revérifier, les prix évoluent). Facturation à la minute : une app arrêtée (`scalingo --app <app> scale web:0`) ne coûte plus rien en conteneur.

**Coût réel** : relevé dans le dashboard, onglet **Consumption** (rapport mis à jour chaque jour à minuit UTC).

| Période relevée | `todoapp` | `todoapp-client` | Total |
|---|---|---|---|
| à partir du 17/11/2026 | … € | … € | … € |

Écart avec l'estimation : … (à commenter une fois le relevé fait).

Les apps ont d'abord été créées en taille **M** (taille par défaut), puis ramenées en **S** (`scalingo --app <app> scale web:1:S`) : la taille M aurait doublé le coût des conteneurs pour rien.

#### Dimensionnement (relevé le 17/11/2026, `scalingo --app <app> stats` et onglet Metrics)

| App | Mémoire max observée | CPU |
|---|---|---|
| `todoapp` (API) | 17 Mo / 256 Mo | ~0 % |
| `todoapp-client` | 66 Mo / 256 Mo | ~0 % |

La taille S suffit largement : moins de 30 % de la mémoire utilisée au pic, aucun swap.

---

## En cas de panne

Toutes les commandes de cette section ont été réellement exécutées sur la production le 17/11/2026.

### 1. Lire les logs

```bash
scalingo --app todoapp logs --lines 200        # logs de l'API
scalingo --app todoapp logs -f                 # en continu
scalingo --app todoapp addons                  # récupérer l'ID de l'addon PostgreSQL
scalingo --app todoapp logs --addon <addon-id> --lines 200   # logs de la base
scalingo --app todoapp ps                       # état des conteneurs
```

#### Erreur provoquée et diagnostiquée (testé le 17/11/2026)

1. **Panne** : `scalingo --app todoapp env-set CORS_ORIGINS=https://mauvaise-url.example` puis `scalingo --app todoapp restart`.
2. **Symptôme** : le client affiche « Impossible de charger les tâches. ». Dans la console du navigateur :
   `Access to fetch at 'https://todoapp.osc-fr1.scalingo.io/tasks' from origin 'https://todoapp-client.osc-fr1.scalingo.io' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.`
   Onglet Réseau : requête `tasks` en rouge, statut « CORS error ».
3. **Diagnostic** :
   - `curl https://todoapp.osc-fr1.scalingo.io/health` → 200 : l'API et la base vont bien, le problème n'est pas côté serveur.
   - `scalingo --app todoapp logs --lines 200` → aucune erreur : la requête aboutit (200), c'est le **navigateur** qui bloque la réponse. Une erreur CORS ne se voit donc pas dans les logs de l'API.
   - `scalingo --app todoapp env | grep CORS` → `CORS_ORIGINS=https://mauvaise-url.example` : cause trouvée.
4. **Réparation** : `scalingo --app todoapp env-set CORS_ORIGINS=https://todoapp-client.osc-fr1.scalingo.io` puis `restart`.

Piège rencontré : tant que le cache du navigateur était actif, l'erreur n'apparaissait pas (réponse `304` réutilisant l'ancien en-tête CORS). Pour reproduire un problème CORS : DevTools → Network → cocher **Disable cache**, puis recharger.

Diagnostic rapide :

| Symptôme | Où regarder |
|---|---|
| `/health` répond 503 | la base : logs de l'addon, `scalingo --app todoapp pgsql-console` |
| Erreur CORS dans le navigateur | `CORS_ORIGINS` de l'API contient-elle l'URL exacte du client (https, sans `/` final) ? |
| Le client appelle une mauvaise URL | `VITE_API_URL` du client, puis redéployer le client |
| Déploiement en échec | onglet Deployments → logs du build ; `PROJECT_DIR` bien défini ? migration en erreur ? |

### 2. Revenir à un déploiement précédent

Le plus sûr avec l'Auto Deploy : annuler le commit fautif, la CI puis Scalingo redéploient la version précédente.

```bash
git revert <sha-du-commit-fautif>
git push origin main
```

En urgence, depuis le dashboard : **Deployments**, choisir un déploiement précédent réussi, puis le redéployer (voir la [doc Rollback](https://doc.scalingo.com/platform/app/rollback)).

En urgence, depuis le terminal (sans attendre la CI) : renvoyer à Scalingo le dernier commit sain.

```bash
git push --force scalingo-client <sha-sain>:refs/heads/master   # ou scalingo-api pour l'API
```

Puis **toujours** `git revert` du commit fautif sur `main`, sinon le prochain push le remet en production.

#### Rollback testé le 17/11/2026

1. Commit volontairement fautif (titre du client remplacé par « VERSION CASSÉE ») poussé sur `main` : CI verte, Auto Deploy, en ligne en ~100 s.
2. Rollback d'urgence : `git push --force scalingo-client 9540e94:refs/heads/master` → ancien titre de retour en ligne en **47 s**.
3. `git revert` du commit fautif puis `git push origin main` : `main` et la production sont de nouveau identiques.

Attention : un retour arrière du code n'annule pas une migration déjà jouée. Une migration qui supprime ou renomme une colonne doit être écrite pour rester compatible avec la version précédente.

### 3. Sauvegarder et restaurer la base

Scalingo sauvegarde la base automatiquement chaque nuit. On peut aussi déclencher une sauvegarde à la main (avant une migration risquée, par exemple).

```bash
ADDON=$(scalingo --app todoapp addons | grep PostgreSQL | awk '{print $4}')   # ID de l'addon (ad-...)

# Sauvegarder
scalingo --app todoapp --addon $ADDON backups-create
scalingo --app todoapp --addon $ADDON backups                     # liste
scalingo --app todoapp --addon $ADDON backups-download --output backup.tar.gz   # la plus récente

# Restaurer
tar -xzf backup.tar.gz                                             # donne un fichier .pgsql (format pg_dump custom)
scalingo --app todoapp db-tunnel -i ~/.ssh/id_ed25519 SCALINGO_POSTGRESQL_URL   # terminal 1, à laisser ouvert (port 10000)

# Terminal 2 : pg_restore via Docker (pas besoin d'installer PostgreSQL sur le poste).
# <user>, <password>, <db> : ceux de SCALINGO_POSTGRESQL_URL (scalingo --app todoapp env).
docker run --rm -v "$PWD:/backup:ro" postgres:18 pg_restore \
  --clean --if-exists --no-owner --no-privileges \
  -d "postgres://<user>:<password>@host.docker.internal:10000/<db>?sslmode=prefer" \
  /backup/<fichier>.pgsql
```

Depuis Docker, `host.docker.internal` désigne le poste local, où le tunnel écoute. Sans Docker, utiliser `pg_restore` directement avec `127.0.0.1:10000`.

#### Sauvegarde et restauration testées le 17/11/2026

1. État initial : 3 tâches en production.
2. `backups-create` → « Backup successfully finished », puis `backups-download` → archive de 1,6 Ko contenant `20261117151201_todoapp_7896.pgsql`.
3. Perte de données simulée : `DELETE /tasks/2` → 2 tâches.
4. Tunnel + `pg_restore` (code de sortie 0, quelques secondes).
5. Vérification : `GET /tasks` renvoie de nouveau les **3 tâches**, dont la n° 2 ; une création puis une suppression de tâche fonctionnent toujours.

Remarque : avec la CLI 1.41, `backups` affichait une liste vide juste après la sauvegarde, alors que `backups-download` la trouvait bien. Mettre à jour la CLI (https://cli.scalingo.com) en cas de doute.

Références : [Logs](https://doc.scalingo.com/platform/app/logs) · [Sauvegarder PostgreSQL](https://doc.scalingo.com/databases/postgresql/shared-resources/guides/backing-up) · [Restaurer PostgreSQL](https://doc.scalingo.com/databases/postgresql/shared-resources/guides/restoring)

---

## Auteur

POTTIER Sylvain
