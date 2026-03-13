# finella — Application de Gestion Financière Personnelle

> Application web full-stack de gestion des finances personnelles avec analyses prédictives par IA, connexion bancaire en temps réel (Plaid) et tableaux de bord interactifs.

---

## Binôme

| Membre | Rôle principal |
|--------|----------------|
| INGRID | Full-stack — Backend API, IA analytics, Intégration Plaid, Infrastructure Docker |
| [Prénom Binôme] | Full-stack — Frontend React, UI/UX, Import CSV/Excel, Composants |

---

## Fonctionnalités implémentées

### Authentification & Sécurité
- Inscription / Connexion avec **JWT** (access token 15 min + refresh token 7 jours en cookie httpOnly)
- Hashage des mots de passe avec **Argon2id** (recommandation OWASP, résistant GPU)
- HMAC sur les emails (recherche sans exposer l'email en clair en base)
- Chiffrement **AES-256-GCM** des tokens bancaires sensibles
- Blacklist de tokens via Redis (logout + rotation)
- Rate limiting par endpoint, headers sécurisés (Helmet), CORS strict
- Soft-delete des comptes utilisateurs (RGPD Art. 17)

### Comptes bancaires
- Ajout manuel de comptes (Chèques, Épargne, Investissement, Crédit)
- **Connexion bancaire en temps réel via l'API Plaid** (Revolut, BNP, Société Générale, N26…)
- Synchronisation automatique des transactions Plaid sur 90 jours
- Solde total agrégé multi-comptes

### Transactions
- Liste paginée avec filtres (catégorie, compte, période, montant min/max)
- **Import de fichiers CSV** (virgule, point-virgule, colonnes FR ou EN)
- **Import de fichiers Excel (.xlsx / .xls)** via SheetJS
- Déduplication automatique à l'import
- Catégorisation manuelle des transactions
- Statistiques par période (revenus, dépenses, solde net, répartition par catégorie)

### Budgets
- Création de budgets par catégorie avec limite mensuelle
- Calcul en temps réel du pourcentage consommé
- Alertes de dépassement (seuil configurable)
- Statuts visuels : OK / Attention / Dépassé

### Objectifs financiers
- Objectifs typés : épargne, remboursement de dette, achat, retraite
- Contributions manuelles avec historique
- Calcul automatique des jours restants et du montant manquant

### Analyses Prédictives par IA
- **Prévision des dépenses** : régression linéaire sur 3 mois par catégorie, calcul du R²
- **Évaluation des risques budgétaires** : burn rate quotidien → projection fin de mois, score de risque 0–100
- **Détection d'anomalies** : Z-score par catégorie (seuil z > 2), sévérité moderate / high / extreme
- **Prévision de trésorerie** : projection du solde sur 30 jours avec intervalle de confiance croissant
- **Insights textuels intelligents** : alertes et conseils générés automatiquement

### Interface utilisateur
- Design sombre (dark theme) avec accents néon Rose & Violet
- Sidebar rétractable, entièrement **responsive** (mobile / tablette / desktop)
- Graphiques interactifs (Recharts) : donut, barres, courbes d'aire avec gradient
- Système de notifications in-app avec compteur non-lus
- Toasts de feedback (succès / erreur)
- Skeleton loaders pendant les chargements

---

## Stack technique

### Backend
| Technologie | Usage |
|-------------|-------|
| Node.js 20 + TypeScript | Runtime & typage strict |
| Express.js | Framework HTTP |
| Prisma ORM | Accès base de données type-safe |
| MongoDB 7 (Replica Set) | Base de données principale |
| Redis 7 | Cache & blacklist JWT |
| Argon2id | Hashage mots de passe |
| Zod | Validation des entrées |
| Plaid API | Connexion bancaire temps réel |
| SheetJS (xlsx) | Parsing fichiers Excel |
| PapaParse | Parsing fichiers CSV |

### Frontend
| Technologie | Usage |
|-------------|-------|
| React 18 + TypeScript | Interface utilisateur |
| Vite | Build tool & dev server HMR |
| React Router v6 | Navigation SPA |
| TanStack Query v5 | Cache & fetching API |
| Zustand | État global (auth, UI) |
| React Hook Form | Formulaires performants |
| Recharts | Graphiques SVG responsives |
| date-fns | Manipulation de dates (locale FR) |
| CSS Modules | Styles scopés |
| react-plaid-link | Widget Plaid Link officiel |

### Infrastructure
| Technologie | Usage |
|-------------|-------|
| Docker & Docker Compose | Conteneurisation complète (1 commande) |
| MongoDB Replica Set rs0 | Requis pour transactions Prisma |

---

## Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installé et **démarré**
- Ports **5173**, **3000**, **27017**, **6379** libres sur la machine

---

## Lancer le projet

### 1. Cloner le dépôt

```bash
git clone <url-du-repo>
cd my-app
```

### 2. Configurer les variables d'environnement

Le fichier `.env` à la racine est déjà configuré avec des valeurs par défaut fonctionnelles.

Pour activer la connexion bancaire Plaid (optionnel — nécessite un compte sur [dashboard.plaid.com](https://dashboard.plaid.com)), modifier dans `.env` :

```env
PLAID_CLIENT_ID=votre_client_id_sandbox
PLAID_SECRET=votre_secret_sandbox
PLAID_ENV=sandbox
```

### 3. Démarrer avec Docker

```bash
docker compose up --build
```

> Le premier démarrage prend environ 2 minutes (build des images + initialisation du Replica Set MongoDB).

### 4. Accéder à l'application

| Service | URL |
|---------|-----|
| Application web | http://localhost:5173 |
| API REST | http://localhost:3000/api/v1 |
| Health check | http://localhost:3000/health |

### 5. Créer un compte

Ouvrir **http://localhost:5173**, cliquer sur **"Créer un compte"** et s'inscrire.

---

## Commandes utiles

```bash
# Démarrer tous les services
docker compose up --build

# Arrêter
docker compose down

# Voir les logs du backend en temps réel
docker compose logs -f backend

# Redémarrer le backend (après modification de code)
docker compose restart backend

# Réinitialiser complètement la base de données
docker compose down -v && docker compose up --build
```

---

## Structure du projet

```
my-app/
├── client/                       # Frontend React
│   ├── src/
│   │   ├── components/ui/        # Design system (Button, Card, Modal, Sidebar…)
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx     # KPIs + graphiques + transactions récentes
│   │   │   ├── Transactions.tsx  # Liste paginée + import CSV/Excel
│   │   │   ├── Budgets.tsx       # Budgets avec jauges
│   │   │   ├── Goals.tsx         # Objectifs financiers
│   │   │   ├── Accounts.tsx      # Comptes + connexion Plaid
│   │   │   ├── Analytics.tsx     # IA Prédictive
│   │   │   └── Settings.tsx      # Paramètres & RGPD
│   │   ├── services/api/
│   │   │   ├── client.ts         # Axios + intercepteur refresh JWT
│   │   │   └── hooks.ts          # Tous les hooks React Query
│   │   └── store/
│   │       ├── authStore.ts      # Zustand — état d'authentification
│   │       └── uiStore.ts        # Zustand — sidebar, toasts
│   └── Dockerfile.dev
│
├── server/                       # Backend Express
│   ├── src/
│   │   ├── config/               # env.ts, database.ts, redis.ts, plaid.ts
│   │   ├── middleware/           # auth.ts, validate.ts, rateLimiter.ts, errorHandler.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── accounts.ts       # + routes Plaid intégrées
│   │   │   ├── transactions.ts   # + import CSV/Excel
│   │   │   ├── budgets.ts
│   │   │   ├── goals.ts
│   │   │   ├── categories.ts
│   │   │   ├── notifications.ts
│   │   │   ├── analytics.ts      # 5 endpoints IA
│   │   │   └── admin.ts
│   │   └── services/
│   │       ├── auth.service.ts   # Login, register, refresh, logout
│   │       ├── plaid.service.ts  # Link token, exchange, sync transactions
│   │       └── analytics.service.ts  # Régression, Z-score, burn rate, cash flow
│   ├── prisma/schema.prisma
│   └── Dockerfile.dev
│
├── docker-compose.yml
├── .env
└── README.md
```

---

## API — Principaux endpoints

### Authentification
```
POST /api/v1/auth/register          Inscription
POST /api/v1/auth/login             Connexion
POST /api/v1/auth/refresh           Renouvellement du token
POST /api/v1/auth/logout            Déconnexion
GET  /api/v1/auth/me                Profil utilisateur connecté
```

### Comptes
```
GET    /api/v1/accounts                     Liste des comptes actifs
POST   /api/v1/accounts                     Ajouter un compte manuel
PATCH  /api/v1/accounts/:id                 Modifier (comptes manuels uniquement)
DELETE /api/v1/accounts/:id                 Désactiver
POST   /api/v1/accounts/:id/sync            Synchroniser
POST   /api/v1/accounts/plaid/link-token    Créer un token Plaid Link
POST   /api/v1/accounts/plaid/exchange      Échanger le token public Plaid
```

### Transactions
```
GET    /api/v1/transactions                 Liste paginée (cursor-based)
GET    /api/v1/transactions/stats           Statistiques par période
PATCH  /api/v1/transactions/:id/category    Catégoriser une transaction
POST   /api/v1/transactions/import-csv      Import CSV ou Excel
```

### Analyses prédictives (IA)
```
GET /api/v1/analytics/forecasts     Prévisions de dépenses par catégorie
GET /api/v1/analytics/risks         Risques de dépassement de budget (0–100)
GET /api/v1/analytics/anomalies     Transactions inhabituelles (Z-score > 2)
GET /api/v1/analytics/cashflow      Projection trésorerie 30 jours + IC
GET /api/v1/analytics/insights      Insights textuels générés automatiquement
```

---

## Modèle IA — Détail technique

Le module `analytics.service.ts` implémente quatre algorithmes en TypeScript pur (sans dépendance ML externe) :

| Algorithme | Description |
|-----------|-------------|
| **Régression linéaire** | Prédit les dépenses du mois prochain par catégorie à partir de 3 mois d'historique. Calcule la pente, l'ordonnée et le R². |
| **Burn rate analysis** | `dépenses_actuelles / jours_écoulés × jours_du_mois` = projection fin de mois. Score de risque normalisé 0–100. |
| **Z-score anomaly detection** | Pour chaque catégorie, calcule µ et σ. Signale les transactions où `z = (x − µ) / σ > 2` avec sévérité (moderate / high / extreme). |
| **Cash flow forecasting** | Flux moyen journalier estimé sur 90 jours, avec facteur week-end (×0.7) / semaine (×1.1). Intervalle de confiance : `±σ × √t × 0.5`. |

---

## Import de transactions

| Format | Colonnes reconnues |
|--------|--------------------|
| CSV | `date`, `montant` ou `amount`, `libellé` ou `label` |
| Excel .xlsx / .xls | Mêmes colonnes, première feuille utilisée |
| Export Revolut CSV | Compatible nativement |

---

## Sécurité

| Mesure | Détail |
|--------|--------|
| Argon2id | memory: 64 MB, iterations: 3, parallelism: 4 |
| JWT | Access 15 min + Refresh 7 j (cookie httpOnly Secure SameSite=Strict) |
| Redis | Blacklist JWT à la déconnexion + rotation refresh |
| Rate limiting | Login : 5/min, Register : 3/min, Global : 100/min |
| Helmet.js | 9 en-têtes de sécurité HTTP |
| AES-256-GCM | Chiffrement des access_token Plaid en base |
| Prisma | Requêtes paramétrées → pas d'injection NoSQL |
| Isolation userId | Chaque requête DB filtre sur `userId` de l'utilisateur connecté |

---

## Difficultés rencontrées

- **Migration PostgreSQL → MongoDB** : Prisma impose des conventions différentes (`@map("_id")`, pas de `@db.Decimal`, champs absents ≠ null nécessitant le filtre `isSet: false`).
- **MongoDB Replica Set obligatoire** : Prisma nécessite un replica set même en développement. Configuration automatique via un conteneur `mongo-init`.
- **Modules natifs (Argon2) dans Docker** : binaires compilés sur Windows incompatibles Linux → `.dockerignore` excluant `node_modules`.
- **Hot-reload sous Windows avec Docker** : les événements inotify ne se propagent pas → `docker compose restart backend` requis après certains changements.
- **Flux Plaid** : l'échange du `public_token` doit être suivi immédiatement d'une sync pour peupler les transactions.

---

*Projet scolaire — 2024/2025*
