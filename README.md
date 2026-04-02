# TableFlow

Sistema POS + KDS + Analytics para restaurantes, construido como plataforma SaaS multi-tenant.

## ¿Qué hace?

- **Meseros** toman órdenes desde su teléfono (PWA)
- **Cocina** recibe las órdenes en tiempo real en pantalla y/o impresora
- **Dueño/Gerente** ve analytics, configura menú y gestiona el negocio
- **SaaS** — múltiples restaurantes, planes de pago, onboarding propio

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript + Vite (PWA) |
| Backend | Node.js + Fastify + TypeScript |
| ORM | Prisma |
| Base de datos | PostgreSQL |
| Cache / Sesiones | Redis |
| Tiempo real | Socket.io |
| Auth | JWT + Refresh tokens |
| Impresión | ESC/POS sobre red local |
| Pagos | Stripe (suscripciones) |
| Infra | Railway (dev) → AWS/GCP (producción) |
| Monorepo | pnpm workspaces |

## Estructura del monorepo

```
tableflow/
├── apps/
│   ├── waiter/          # PWA para meseros
│   ├── kitchen/         # Pantalla KDS para cocina
│   └── admin/           # Dashboard web para dueño/gerente
├── server/              # API backend + WebSockets
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── sockets/
│   │   ├── middleware/
│   │   └── jobs/        # Tareas programadas (reportes, alertas)
│   └── prisma/          # Schema y migraciones
├── packages/
│   └── shared/          # Tipos TypeScript compartidos
└── docs/                # Documentación técnica
```

## Fases de desarrollo

- [x] **Fase 0** — Estructura del proyecto y configuración inicial
- [ ] **Fase 1** — MVP: menú, órdenes, KDS, impresión
- [ ] **Fase 2** — Analytics: reportes, dashboards, métricas
- [ ] **Fase 3** — SaaS: multi-tenant, billing, onboarding
- [ ] **Fase 4** — Automatizaciones: alertas, reportes automáticos, WhatsApp

## Inicio rápido

```bash
# Requisitos: Node.js 20+, pnpm 9+, Docker
pnpm install
cp .env.example .env  # Configurar variables de entorno
docker-compose up -d   # PostgreSQL + Redis
pnpm db:migrate        # Correr migraciones
pnpm dev               # Levantar todo en paralelo
```

## Convenciones

- Commits en español, formato: `tipo(scope): descripción`
- Tipos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`
- Branches: `feature/nombre`, `fix/nombre`, `release/v0.x`
- PRs requieren al menos un reviewer antes de merge a `main`
