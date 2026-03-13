# finella — Application de Gestion Financière Personnelle

> Application web full-stack permettant de gérer ses finances personnelles : suivi des dépenses, budgets, objectifs d'épargne, connexion bancaire en temps réel et analyses prédictives par intelligence artificielle.

---

## Binôme

| Membre | Rôle principal |
|--------|----------------|
| INGRID | Backend API, base de données MongoDB, intégration Plaid, IA analytics, Docker |
| [Prénom Binôme] | Frontend React, UI/UX, composants, pages, import CSV/Excel |

---

## Présentation du projet

**finella** est une application de finance personnelle que nous avons développée de A à Z dans le cadre de notre projet scolaire. Elle permet à un utilisateur de :

- Se connecter de façon sécurisée (JWT, Argon2id)
- Ajouter et gérer plusieurs comptes bancaires
- Connecter son vrai compte bancaire (Revolut, BNP, etc.) via l'API Plaid
- Importer ses relevés bancaires au format CSV ou Excel
- Catégoriser ses transactions
- Créer des budgets par catégorie et suivre les dépassements
- Définir des objectifs d'épargne et contribuer régulièrement
- Visualiser ses données sous forme de graphiques interactifs
- Recevoir des analyses prédictives générées par un modèle IA maison

---

## Fonctionnalités détaillées

### Authentification
- Inscription et connexion sécurisées
- Mot de passe haché avec **Argon2id** (algorithme recommandé par OWASP)
- Tokens JWT : access token (15 min) + refresh token (7 jours) en cookie HTTP-only
- Déconnexion avec invalidation du token (liste noire Redis)
- Protection contre les attaques par force brute (rate limiting)

### Comptes bancaires
- Ajout manuel de comptes (Compte courant, Épargne, Investissement, Crédit)
- **Connexion en temps réel via Plaid** : l'utilisateur clique, une popup s'ouvre, il se connecte à sa banque (Revolut, BNP, Société Générale, N26…), et les transactions sont importées automatiquement
- Synchronisation manuelle à la demande
- Solde total de tous les comptes agrégé

### Transactions
- Liste paginée avec filtres avancés (par catégorie, compte, période, montant)
- **Import CSV** : compatible avec les exports des banques françaises
- **Import Excel (.xlsx / .xls)** : colonnes reconnues en français et en anglais
- Déduplication automatique à l'import (évite les doublons)
- Catégorisation manuelle des transactions

### Budgets
- Création d'un budget mensuel par catégorie avec un montant limite
- Calcul automatique du pourcentage dépensé en temps réel
- Alerte visuelle quand le seuil est dépassé (statuts : OK / Attention / Dépassé)

### Objectifs financiers
- Création d'objectifs typés : épargne, remboursement de dette, achat, fonds d'urgence
- Suivi de la progression avec contributions manuelles
- Affichage du montant restant et des jours avant la date limite

### Analyses prédictives (IA)
Notre modèle IA est implémenté en TypeScript pur, sans bibliothèque externe. Il comprend :

| Algorithme | Ce qu'il fait |
|-----------|---------------|
| **Régression linéaire** | Prédit les dépenses du mois prochain par catégorie, à partir de 3 mois d'historique |
| **Burn rate** | Calcule le taux de consommation quotidien et projette le total fin de mois pour alerter les dépassements de budget |
| **Z-score (anomalie)** | Détecte les transactions inhabituellement élevées par rapport à la moyenne de la catégorie |
| **Projection de trésorerie** | Prédit l'évolution du solde sur 30 jours avec un intervalle de confiance |
| **Insights textuels** | Génère automatiquement des conseils et alertes en langage naturel |

### Interface utilisateur
- Design sombre avec accents néon (rose & violet)
- Entièrement **responsive** : fonctionne sur mobile, tablette et ordinateur
- Graphiques interactifs (camembert, barres, courbes d'aire)
- Notifications in-app avec compteur
- Messages de retour (toasts) pour chaque action

---

## Technologies utilisées

### Backend (dossier `server/`)
| Technologie | Rôle |
|-------------|------|
| Node.js 20 + TypeScript | Serveur et logique métier |
| Express.js | Framework HTTP |
| Prisma ORM | Accès à la base de données |
| **MongoDB Atlas** | Base de données cloud |
| Redis | Cache et blacklist des tokens JWT |
| Argon2id | Hachage des mots de passe |
| AES-256-GCM | Chiffrement des tokens bancaires |
| Zod | Validation des données entrantes |
| Plaid API | Connexion bancaire temps réel |
| SheetJS | Lecture des fichiers Excel |
| PapaParse | Lecture des fichiers CSV |
| dotenv | Gestion des variables d'environnement |

### Frontend (dossier `client/`)
| Technologie | Rôle |
|-------------|------|
| React 18 + TypeScript | Interface utilisateur |
| Vite | Outil de build et serveur de développement |
| React Router v6 | Navigation entre les pages |
| TanStack Query v5 | Gestion du cache et des requêtes API |
| Zustand | État global (authentification, UI) |
| React Hook Form | Gestion des formulaires |
| Recharts | Graphiques SVG interactifs |
| date-fns | Manipulation des dates (locale française) |
| CSS Modules | Styles isolés par composant |
| react-plaid-link | Widget officiel Plaid |

### Infrastructure
| Technologie | Rôle |
|-------------|------|
| Docker & Docker Compose | Lancement de l'application en 1 commande |
| MongoDB Atlas | Base de données hébergée dans le cloud |

---

## Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installé et **démarré**
- Ports **5173**, **3000**, **6379** libres sur la machine

---

## Lancer le projet

### Étape 1 — Cloner le dépôt

```bash
git clone https://github.com/ingridestch04/finella.git
cd finella
```

### Étape 2 — Créer le fichier de configuration

Copier le fichier d'exemple :

```bash
cp .env.example .env
```

Puis ouvrir `.env` et remplir les valeurs (voir section Variables d'environnement ci-dessous).

### Étape 3 — Démarrer l'application

```bash
docker compose up --build -d
```

> Le premier démarrage télécharge les images Docker et installe les dépendances. Cela prend environ 2 à 3 minutes.

### Étape 4 — Ouvrir dans le navigateur

| Service | Adresse |
|---------|---------|
| Application web | http://localhost:5173 |
| API backend | http://localhost:3000/api/v1 |
| Vérification API | http://localhost:3000/health |

### Étape 5 — Créer un compte

Sur la page d'accueil, cliquer sur **"Créer un compte"** et s'inscrire.

---

## Variables d'environnement (fichier `.env`)

```env
# Base de données MongoDB Atlas
DATABASE_URL=mongodb+srv://<utilisateur>:<mot_de_passe>@<cluster>.mongodb.net/finella?appName=<nom>

# Sécurité — clés JWT (minimum 32 caractères)
JWT_SECRET=votre_cle_secrete_jwt
JWT_REFRESH_SECRET=votre_cle_secrete_refresh

# Chiffrement AES-256 (32 caractères minimum)
ENCRYPTION_KEY=votre_cle_chiffrement

# HMAC pour les emails (16 caractères minimum)
HMAC_SECRET=votre_cle_hmac

# Plaid — connexion bancaire (optionnel)
# Créer un compte sur https://dashboard.plaid.com
PLAID_CLIENT_ID=votre_client_id_plaid
PLAID_SECRET=votre_secret_sandbox
PLAID_ENV=sandbox
```

---

## Structure du projet

```
finella/
├── client/                        # Application React (Frontend)
│   ├── src/
│   │   ├── components/ui/         # Composants réutilisables
│   │   │   ├── Button, Card, Modal, Input
│   │   │   ├── Sidebar, Layout, Toast
│   │   │   └── PlaidConnect       # Bouton connexion bancaire
│   │   ├── pages/                 # Pages de l'application
│   │   │   ├── Dashboard.tsx      # Tableau de bord principal
│   │   │   ├── Transactions.tsx   # Liste + import CSV/Excel
│   │   │   ├── Budgets.tsx        # Gestion des budgets
│   │   │   ├── Goals.tsx          # Objectifs financiers
│   │   │   ├── Accounts.tsx       # Comptes bancaires + Plaid
│   │   │   ├── Analytics.tsx      # IA Prédictive
│   │   │   └── Settings.tsx       # Paramètres utilisateur
│   │   ├── services/api/
│   │   │   ├── client.ts          # Configuration Axios + refresh JWT
│   │   │   └── hooks.ts           # Tous les hooks React Query
│   │   └── store/
│   │       ├── authStore.ts       # État d'authentification
│   │       └── uiStore.ts         # Sidebar, toasts, notifications
│   ├── vite.config.ts             # Configuration Vite + proxy API
│   └── Dockerfile.dev
│
├── server/                        # API Express (Backend)
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts             # Validation des variables d'environnement
│   │   │   ├── database.ts        # Connexion Prisma/MongoDB
│   │   │   ├── redis.ts           # Connexion Redis
│   │   │   ├── jwt.ts             # Gestion des tokens
│   │   │   └── plaid.ts           # Client Plaid API
│   │   ├── middleware/
│   │   │   ├── auth.ts            # Vérification JWT
│   │   │   ├── validate.ts        # Validation Zod
│   │   │   ├── rateLimiter.ts     # Limitation des requêtes
│   │   │   └── errorHandler.ts    # Gestion centralisée des erreurs
│   │   ├── routes/
│   │   │   ├── auth.ts            # /register, /login, /logout, /refresh
│   │   │   ├── accounts.ts        # Comptes bancaires + routes Plaid
│   │   │   ├── transactions.ts    # Transactions + import fichiers
│   │   │   ├── budgets.ts         # CRUD budgets
│   │   │   ├── goals.ts           # CRUD objectifs + contributions
│   │   │   ├── categories.ts      # Catégories
│   │   │   ├── notifications.ts   # Notifications in-app
│   │   │   └── analytics.ts       # 5 endpoints IA prédictive
│   │   └── services/
│   │       ├── auth.service.ts    # Logique login/register/logout
│   │       ├── encryption.service.ts  # AES-256-GCM + HMAC
│   │       ├── plaid.service.ts   # Connexion + sync transactions Plaid
│   │       ├── categorization.service.ts  # Catégorisation par règles
│   │       └── analytics.service.ts   # Modèle IA (régression, Z-score…)
│   ├── prisma/schema.prisma       # Schéma de la base de données MongoDB
│   └── Dockerfile.dev
│
├── docker-compose.yml             # Orchestration des services
├── .env                           # Variables d'environnement (non committé)
├── .env.example                   # Modèle de configuration
└── README.md
```

---

## Architecture technique

```
Navigateur (http://localhost:5173)
        │
        ▼
┌─────────────────────┐
│  Vite Dev Server    │  ← Sert le React
│  (Frontend)         │  ← Proxy /api → Backend
└─────────┬───────────┘
          │ HTTP
          ▼
┌─────────────────────┐
│  Express API        │  ← Authentification JWT
│  (Backend :3000)    │  ← Validation Zod
└──────┬──────┬───────┘
       │      │
       ▼      ▼
┌──────────┐  ┌─────────┐
│ MongoDB  │  │  Redis  │
│  Atlas   │  │ (Cache) │
│ (Cloud)  │  └─────────┘
└──────────┘
       │
       ▼
┌─────────────────────┐
│  Plaid API          │  ← Banques réelles (Revolut, BNP…)
│  (Externe)          │
└─────────────────────┘
```

---

## Commandes utiles

```bash
# Démarrer tous les services
docker compose up --build -d

# Arrêter tous les services
docker compose down

# Voir les logs du backend
docker compose logs -f backend

# Voir les logs du frontend
docker compose logs -f frontend

# Redémarrer le backend (après une modification)
docker compose restart backend

# Tout réinitialiser (supprime les conteneurs)
docker compose down && docker compose up --build -d
```

---

## Sécurité mise en place

| Mesure | Détail |
|--------|--------|
| Argon2id | Hachage des mots de passe (recommandé par OWASP 2024) |
| JWT HTTP-only | Tokens non accessibles depuis JavaScript (protection XSS) |
| Redis blacklist | Invalidation des tokens à la déconnexion |
| Rate limiting | Maximum 5 tentatives de login par minute par IP |
| Helmet.js | 9 en-têtes de sécurité HTTP automatiques |
| CORS strict | Seule l'origine du frontend est autorisée |
| AES-256-GCM | Chiffrement des tokens Plaid stockés en base |
| Prisma ORM | Requêtes paramétrées (protection injection NoSQL) |
| Isolation userId | Chaque requête filtre strictement sur l'utilisateur connecté |

---

## Difficultés rencontrées

1. **Migration PostgreSQL → MongoDB** : Prisma impose des conventions différentes pour MongoDB (`@map("_id")` obligatoire sur les IDs, `Float` à la place de `Decimal`, champs absents ≠ `null` nécessitant le filtre `{ isSet: false }`).

2. **MongoDB Replica Set** : Prisma nécessite un Replica Set même en développement local. Nous avons configuré un initialisation automatique via un conteneur `mongo-init`.

3. **CORS avec Docker** : En développement, les requêtes du navigateur vers le backend provoquaient des erreurs CORS. Solution : utiliser le proxy Vite pour que toutes les requêtes passent par le port 5173.

4. **Modules natifs (Argon2) dans Docker** : Les binaires compilés sur Windows sont incompatibles avec Linux. Solution : ajouter un `.dockerignore` pour exclure `node_modules` et recompiler dans le conteneur.

5. **Accès réseau MongoDB Atlas** : La base de données cloud refuse les connexions dont l'IP n'est pas whitelistée. Solution : autoriser `0.0.0.0/0` dans Network Access sur atlas.mongodb.com.

---

## Fonctionnalités à ajouter si plus de temps

- Export PDF des relevés et rapports
- Notifications push (mobile)
- Partage de budget entre membres d'un foyer
- Modèle IA plus avancé avec machine learning (TensorFlow.js)
- Application mobile React Native

---

*Projet scolaire — Promotion 2024/2025*
