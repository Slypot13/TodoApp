# Todo App

Application Todo List : un client web (Vite, JavaScript) qui appelle une API REST (Node.js / Express) stockant les tâches dans PostgreSQL. Les deux sont déployés sur Scalingo.

- Client en ligne : https://todo-client-XXXX.osc-fr1.scalingo.io <!-- à remplacer -->
- API en ligne : https://todo-api-XXXX.osc-fr1.scalingo.io/health <!-- à remplacer -->

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

Prérequis : un compte Scalingo et la [CLI Scalingo](https://doc.scalingo.com/tools/cli/start) (`scalingo login`). Remplacer `todo-api` et `todo-client` par vos noms d'apps.

### 1. API et base

```bash
scalingo create todo-api --region osc-fr1
scalingo --app todo-api env-set PROJECT_DIR=api
scalingo --app todo-api addons-add postgresql postgresql-starter-512
```

Dans le dashboard de `todo-api` : onglet **Deploy → Configuration**, lier le dépôt GitHub `Slypot13/TodoApp`, branche `main`, puis lancer un déploiement manuel. Le build utilise le buildpack Node.js (détecté via `api/package.json`), puis `postdeploy` joue les migrations.

```bash
scalingo --app todo-api run npm run seed     # une seule fois
curl https://todo-api.osc-fr1.scalingo.io/health
```

### 2. Client

```bash
scalingo create todo-client --region osc-fr1
scalingo --app todo-client env-set PROJECT_DIR=client \
  VITE_API_URL=https://todo-api.osc-fr1.scalingo.io
```

Lier le même dépôt GitHub à `todo-client` et déployer. Scalingo exécute `npm run build` (Vite → `dist/`) puis `npm start` (`serve -s dist`, qui renvoie `index.html` pour toute URL inconnue : un rafraîchissement ne donne jamais 404).

### 3. Relier les deux

```bash
scalingo --app todo-api env-set CORS_ORIGINS=https://todo-client.osc-fr1.scalingo.io
```

(`env-set` redémarre l'app.) Ouvrir le client, ajouter / terminer / supprimer une tâche, et vérifier dans l'onglet Réseau qu'il n'y a pas d'erreur CORS.

### 4. Déploiement automatique

Pour chaque app, dans **Deploy → Configuration** : activer **Auto Deploy** sur `main` et l'option qui attend la réussite de la CI. Les workflows `.github/workflows/api.yml` et `client.yml` lancent lint + tests (et le build pour le client) uniquement quand leur dossier change. Une pull request qui casse un test reste rouge et n'est donc jamais déployée.

---

## Coût mensuel

| Ressource | Taille | Estimation (HT/mois) | Réel relevé |
|---|---|---|---|
| App `todo-api` | 1 conteneur S | ≈ 7,20 € | _à compléter_ |
| App `todo-client` | 1 conteneur S | ≈ 7,20 € | _à compléter_ |
| PostgreSQL | Starter 512 | ≈ 7,20 € | _à compléter_ |
| **Total** | | **≈ 21,60 €** | _à compléter_ |

Estimation d'après la [grille tarifaire Scalingo](https://scalingo.com/pricing) (à revérifier, les prix évoluent). Le réel se relève dans le dashboard, section **Billing**, après quelques jours de fonctionnement. Facturation à la minute : une app arrêtée (`scalingo --app <app> scale web:0`) ne coûte plus rien en conteneur.

Dimensionnement : voir l'onglet **Metrics** de chaque app. _À compléter : mémoire max observée … Mo sur 256 Mo (limite d'un conteneur S), CPU …, la taille S suffit / ne suffit pas._

---

## En cas de panne

> Commandes à tester réellement, puis à noter ici avec la date et le résultat obtenu.

### 1. Lire les logs

```bash
scalingo --app todo-api logs --lines 200        # logs de l'API
scalingo --app todo-api logs -f                 # en continu
scalingo --app todo-api addons                  # récupérer l'ID de l'addon PostgreSQL
scalingo --app todo-api logs --addon <addon-id> --lines 200   # logs de la base
scalingo --app todo-api ps                       # état des conteneurs
```

Erreur provoquée pour l'exercice : _à compléter : par exemple `scalingo --app todo-api env-set CORS_ORIGINS=https://mauvaise-url.fr`, constater l'erreur CORS dans le navigateur et ce qu'affichent les logs, puis remettre la bonne valeur._

Diagnostic rapide :

| Symptôme | Où regarder |
|---|---|
| `/health` répond 503 | la base : logs de l'addon, `scalingo --app todo-api pgsql-console` |
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

Attention : un retour arrière du code n'annule pas une migration déjà jouée. Une migration qui supprime ou renomme une colonne doit être écrite pour rester compatible avec la version précédente.

### 3. Sauvegarder et restaurer la base

```bash
# Lister les sauvegardes automatiques et en télécharger une
scalingo --app todo-api --addon postgresql backups
scalingo --app todo-api --addon postgresql backups-download --backup <backup-id>

# Restaurer : ouvrir un tunnel vers la base (garder ce terminal ouvert)
scalingo --app todo-api db-tunnel SCALINGO_POSTGRESQL_URL
# Dans un autre terminal, avec l'URL affichée par le tunnel :
tar -xzf <archive-telechargee>.tar.gz
pg_restore --clean --if-exists --no-owner --no-privileges \
  -d "postgres://<user>:<password>@127.0.0.1:10000/<db>" <fichier>.pgsql
```

_À compléter : date du test de restauration, durée, vérification (nombre de tâches avant / après)._

Références : [Logs](https://doc.scalingo.com/platform/app/logs) · [Sauvegarder PostgreSQL](https://doc.scalingo.com/databases/postgresql/shared-resources/guides/backing-up) · [Restaurer PostgreSQL](https://doc.scalingo.com/databases/postgresql/shared-resources/guides/restoring)

---

## Auteur

POTTIER Sylvain
