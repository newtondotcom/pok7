# 🎯 Pok7

Une application moderne de pokes à la Meta avec des fonctionnalités temps réel, construite avec une stack TypeScript de pointe.

## ✨ Fonctionnalités

- **🔔 Notifications Push** - Recevez des notifications en temps réel
- **📡 Server-Sent Events** - Mises à jour instantanées sans rechargement
- **👥 Système de Poke** - Interagissez avec d'autres utilisateurs
- **🏆 Classement** - Suivez votre position dans le classement
- **🔍 Recherche d'utilisateurs** - Trouvez facilement d'autres personnes
- **🌙 Thème sombre/clair** - Interface adaptée à vos préférences
- **📱 PWA** - Installation sur mobile et desktop
- **🔐 Authentification sécurisée** - Authentification centralisée

## 🛠️ Stack Technique

### Frontend
- **TypeScript** - For type safety and improved developer experience
- **TanStack Router** - File-based routing with full type safety
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Fastify** - Fast, low-overhead web framework
- **Bun** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **Turborepo** - Optimized monorepo build system
- **PWA** - Progressive Web App support

### Backend
- **Fastify** - Framework serveur Node.js ultra-rapide
- **Connect RPC** - APIs gRPC-Web avec sécurité des types
- **Protocol Buffers** - Sérialisation binaire efficace
- **Drizzle ORM** - ORM TypeScript-first avec migrations
- **PostgreSQL** - Base de données relationnelle robuste
- **Redis (ioredis)** - Cache et gestion des sessions temps réel
- **Web Push** - Notifications push natives
- **JOSE** - Gestion sécurisée des tokens JWT
- **Winston** - Logging structuré et performant

### Infrastructure & Tools
- **Bun 1.2.17** - Runtime JavaScript ultra-rapide
- **Turborepo** - Monorepo optimisé pour la performance
- **Docker** - Conteneurisation et déploiement
- **Buf** - Outils Protocol Buffers modernes
- **Drizzle Kit** - Outils de migration et introspection DB

## Getting Started

First, install the dependencies:

```bash
bun install
```
## Database Setup

This project uses PostgreSQL with Drizzle ORM.

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/server/.env` file with your PostgreSQL connection details.

3. Apply the schema to your database:
```bash
bun db:push
```


Then, run the development server:

```bash
bun dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).







## Project Structure

```
test/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Router)
│   └── server/      # Backend API (Fastify)
├── packages/
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `bun dev`: Start all applications in development mode
- `bun build`: Build all applications
- `bun dev:web`: Start only the web application
- `bun dev:server`: Start only the server
- `bun check-types`: Check TypeScript types across all apps
- `bun db:push`: Push schema changes to database
- `bun db:studio`: Open database studio UI
- `cd apps/web && bun generate-pwa-assets`: Generate PWA assets
- `cd apps/web && bun desktop:dev`: Start Tauri desktop app in development
- `cd apps/web && bun desktop:build`: Build Tauri desktop app


## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🆘 Support

Si vous rencontrez des problèmes ou avez des questions :
- Ouvrez une [issue](https://github.com/votre-username/pok7/issues)
- Consultez la [documentation](https://github.com/votre-username/pok7/wiki)

---

**Développé avec ❤️ et [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack)**
