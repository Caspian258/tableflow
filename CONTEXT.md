# CONTEXT.md — Guía de contexto del proyecto TableFlow

> Este archivo existe para mantener el contexto completo del proyecto entre sesiones.
> Léelo al inicio de cada sesión antes de continuar con cualquier tarea.

---

## Visión general

**TableFlow** es un sistema POS (Point of Sale) + KDS (Kitchen Display System) + Analytics
construido como plataforma SaaS multi-tenant para restaurantes.

**Objetivo inmediato:** Implementar el MVP para un restaurante piloto real (el restaurante del cliente).
**Objetivo a mediano plazo:** Escalar como SaaS y vender a otros restaurantes.

---

## Usuarios del sistema

| Rol | Qué hace en la app |
|-----|--------------------|
| `owner` | Dueño del restaurante. Acceso total: menú, analytics, personal, billing |
| `manager` | Gerente. Igual que owner pero sin acceso a billing |
| `waiter` | Mesero. Solo ve y toma órdenes de sus mesas asignadas |
| `kitchen` | Chef/cocinero. Solo ve el KDS con las órdenes pendientes |
| `superadmin` | Admin de la plataforma SaaS. Acceso a todos los tenants |

---

## Flujo principal de una orden

```
Mesero abre mesa → selecciona platillos → confirma orden
  → Backend guarda orden con estado "pending"
  → WebSocket emite evento "new_order" a la cocina
  → KDS muestra la orden → cocinero la acepta ("in_progress")
  → Cocinero la marca como lista ("ready")
  → WebSocket notifica al mesero → mesero lleva la orden
  → Mesero cierra la cuenta → se genera ticket
  → Analytics registra la venta
```

**Estados de una orden:** `pending` → `in_progress` → `ready` → `delivered` → `paid` | `cancelled`

---

## Decisiones técnicas clave

### Multi-tenancy
Cada restaurante es un **tenant** aislado. Se implementa con `restaurant_id` en cada tabla.
Un mismo usuario NO puede pertenecer a múltiples restaurantes (simplificación MVP).
Los datos de cada restaurante están lógicamente separados en la misma base de datos (schema compartido).

### Tiempo real
Socket.io con rooms por restaurante: `restaurant:{id}:kitchen`, `restaurant:{id}:waiter:{id}`.
Redis como adaptador de Socket.io para escalar horizontalmente en el futuro.

### Autenticación
JWT de corta duración (15 min) + Refresh token (7 días) guardado en cookie HttpOnly.
Los roles se incluyen en el payload del JWT. El middleware verifica el rol antes de cada ruta.

### Impresión
La impresora ESC/POS está en la red local del restaurante.
El KDS (tablet en cocina) actúa como puente de impresión vía una librería Node en el cliente.
Librería recomendada: `node-thermal-printer` o `escpos`.

### PWA (app de meseros)
React con Vite. Service worker para funcionamiento offline básico (caché del menú).
Instalable en iPhone/Android sin App Store.
Diseño mobile-first, pantallas táctiles, fuentes grandes, botones generosos.

---

## Stack completo

```
Monorepo:        pnpm workspaces
Frontend:        React 18 + TypeScript + Vite + TailwindCSS
Estado global:   Zustand
Routing:         React Router v6
Tiempo real:     Socket.io-client
Backend:         Node.js 20 + Fastify + TypeScript
ORM:             Prisma 5
Base de datos:   PostgreSQL 15
Cache:           Redis 7
Auth:            JWT (jsonwebtoken) + bcrypt
Validación:      Zod (compartido frontend/backend via packages/shared)
Testing:         Vitest + Testing Library
Linting:         ESLint + Prettier
CI/CD:           GitHub Actions
Infra inicial:   Railway
Pagos:           Stripe (Fase 3)
```

---

## Schema de base de datos (resumen)

### Tablas principales

```
restaurants         — tenant raíz, configuración del restaurante
users               — usuarios con rol y restaurant_id
tables              — mesas del restaurante
menu_categories     — categorías del menú
menu_items          — platillos con precio, disponibilidad
orders              — órdenes por mesa
order_items         — líneas de cada orden (platillo + cantidad + notas)
payments            — pagos/cierres de cuenta
analytics_events    — eventos para analytics (ventas, tiempos, etc.)
subscriptions       — plan SaaS del restaurante (Fase 3)
```

### Relaciones clave

```
restaurant → users (1:N)
restaurant → tables (1:N)
restaurant → menu_categories → menu_items (1:N:N)
table → orders (1:N activas, historia)
order → order_items → menu_items
order → payments
```

---

## Variables de entorno necesarias

```env
# Base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/tableflow
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=<secret-aleatorio-256bits>
JWT_REFRESH_SECRET=<otro-secret-aleatorio>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# App
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173

# Stripe (Fase 3)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Email (Fase 4)
RESEND_API_KEY=
```

---

## Comandos del proyecto

```bash
pnpm install              # Instalar dependencias
pnpm dev                  # Levantar todo (server + apps en paralelo)
pnpm dev:server           # Solo el backend
pnpm dev:waiter           # Solo la app de meseros
pnpm dev:kitchen          # Solo el KDS
pnpm dev:admin            # Solo el dashboard admin
pnpm db:migrate           # Correr migraciones de Prisma
pnpm db:seed              # Poblar con datos de prueba
pnpm db:studio            # Abrir Prisma Studio
pnpm build                # Build de producción de todo
pnpm test                 # Correr todos los tests
pnpm lint                 # Linting
```

---

## Convenciones de código

- **TypeScript estricto** en todo el proyecto (`strict: true`)
- **Zod** para validar todos los inputs del API y formularios
- **Tipos compartidos** en `packages/shared/src/types/` — nunca duplicar tipos
- Nombres de archivos: `kebab-case.ts`
- Nombres de componentes React: `PascalCase.tsx`
- Nombres de funciones y variables: `camelCase`
- Constantes globales: `UPPER_SNAKE_CASE`
- Errores del API siempre con el formato: `{ error: string, details?: any }`
- Respuestas del API siempre con el formato: `{ data: T, meta?: PaginationMeta }`

---

## Convenciones de Git

```
# Formato de commits
tipo(scope): descripción en español

# Tipos permitidos
feat      Nueva funcionalidad
fix       Corrección de bug
chore     Tareas de mantenimiento, dependencias
docs      Solo documentación
refactor  Refactorización sin cambio funcional
test      Agregar o modificar tests
style     Cambios de formato/estilo (no lógica)

# Ejemplos
feat(orders): agregar endpoint para crear orden
fix(auth): corregir expiración de refresh token
chore(deps): actualizar Prisma a v5.8
docs(readme): actualizar instrucciones de instalación
```

**Importante:** Los commits no deben incluir referencias a herramientas de IA.
El autor de los commits es siempre el desarrollador humano.

---

## Bitácora de trabajo

Ver archivo `BITACORA.md` en la raíz del proyecto.

---

## Archivos clave a conocer

| Archivo | Propósito |
|---------|-----------|
| `CONTEXT.md` | Este archivo — contexto completo para retomar el trabajo |
| `BITACORA.md` | Registro cronológico de avances y decisiones |
| `server/prisma/schema.prisma` | Schema completo de la BD |
| `packages/shared/src/types/` | Tipos TypeScript compartidos |
| `server/src/routes/` | Definición de todas las rutas del API |
| `.env.example` | Variables de entorno necesarias |

---

## Estado actual del proyecto

Ver `BITACORA.md` para el estado actualizado.

Al retomar una sesión, siempre:
1. Leer `BITACORA.md` para ver en qué quedó
2. Revisar la rama actual con `git status` y `git log --oneline -10`
3. Continuar desde donde dice la bitácora

---

## Deploy a producción

### Arquitectura de producción

```
Railway (1 servicio)          Vercel (3 sitios estáticos)
┌──────────────────┐          ┌─────────────────────────┐
│  Node.js server  │◄────────►│  apps/waiter  (PWA)     │
│  Fastify + WS    │          │  apps/kitchen (KDS)     │
│  Puerto 3001     │          │  apps/admin   (Dashboard)│
└──────────────────┘          └─────────────────────────┘
         │
    ┌────┴──────┐
    │           │
PostgreSQL    Redis
(Railway      (Railway
 plugin)       plugin)
```

### Archivos de deploy creados

| Archivo | Propósito |
|---------|-----------|
| `Dockerfile` | Multi-stage build del servidor (Node 20 Alpine) |
| `.dockerignore` | Excluye archivos innecesarios del contexto Docker |
| `railway.toml` | Configura el servicio de Railway |
| `scripts/start.sh` | Corre migraciones y luego inicia el servidor |

---

### Paso 1 — Preparar el repositorio

```bash
# Asegurarte de que el repo esté en GitHub
git remote -v   # debe mostrar origin → github.com/tu-usuario/tableflow

# Verificar que build:prod funciona localmente
pnpm build:prod
```

---

### Paso 2 — Crear proyecto en Railway

1. Ve a [railway.app](https://railway.app) → **New Project**
2. Elige **Deploy from GitHub repo** → selecciona `tableflow`
3. Railway detecta el `Dockerfile` automáticamente
4. El servicio se llama `server` por defecto; puedes renombrarlo

---

### Paso 3 — Agregar PostgreSQL

1. En el proyecto de Railway → **+ New** → **Database** → **PostgreSQL**
2. Railway crea la base de datos y agrega `DATABASE_URL` como variable
   compartida automáticamente al servicio del servidor
3. Verifica que `DATABASE_URL` aparezca en las variables del servicio `server`

---

### Paso 4 — Agregar Redis

1. En el proyecto de Railway → **+ New** → **Database** → **Redis**
2. Railway agrega `REDIS_URL` como variable compartida automáticamente
3. Verifica que `REDIS_URL` aparezca en las variables del servicio `server`

---

### Paso 5 — Variables de entorno del servidor

En Railway → servicio `server` → pestaña **Variables**, agrega:

```
NODE_ENV            = production
JWT_SECRET          = <genera con: openssl rand -hex 32>
JWT_REFRESH_SECRET  = <genera con: openssl rand -hex 32>
JWT_EXPIRES_IN      = 15m
JWT_REFRESH_EXPIRES_IN = 7d
FRONTEND_URL        = https://admin.tudominio.com,https://waiter.tudominio.com,https://kitchen.tudominio.com

# Stripe (cuando estés listo para billing)
STRIPE_SECRET_KEY       = sk_live_...
STRIPE_WEBHOOK_SECRET   = whsec_...
STRIPE_BASIC_PRICE_ID   = price_...
STRIPE_PRO_PRICE_ID     = price_...

# PORT y DATABASE_URL y REDIS_URL los agrega Railway automáticamente
```

> **Nota sobre FRONTEND_URL:** Railway pone este valor en los CORS del servidor.
> Ponlo como lista separada por comas con todas las URLs de tus apps.
> Mientras estás en desarrollo, puede quedar como `*` temporalmente.

---

### Paso 6 — Deploy del servidor

1. Railway hace el deploy automáticamente al hacer push a `main`
2. El proceso tarda ~3-5 minutos (build Docker)
3. Revisa los logs en Railway → servicio `server` → **Logs**
4. Al finalizar, el health check apunta a `GET /health` — debe responder `{"status":"ok"}`
5. Railway asigna una URL pública: `https://tableflow-server-production.up.railway.app`
   (puedes configurar un dominio custom en Settings → Domains)

---

### Paso 7 — Deploy de las apps frontend (Vercel)

Cada app es un sitio estático independiente. Repite estos pasos para las 3 apps:

#### 7a. apps/admin (Dashboard)

1. Ve a [vercel.com](https://vercel.com) → **Add New Project** → importa el repo `tableflow`
2. En **Root Directory** escribe: `apps/admin`
3. Framework: **Vite** (Vercel lo detecta automáticamente)
4. En **Environment Variables** agrega:
   ```
   VITE_API_URL = https://tableflow-server-production.up.railway.app
   ```
5. Click **Deploy**
6. URL resultante: `https://tableflow-admin.vercel.app` (configura dominio custom si quieres)

#### 7b. apps/waiter (Meseros)

1. **Add New Project** → mismo repo → **Root Directory**: `apps/waiter`
2. Variables:
   ```
   VITE_API_URL = https://tableflow-server-production.up.railway.app
   VITE_SOCKET_URL = https://tableflow-server-production.up.railway.app
   ```
3. Deploy → URL: `https://tableflow-waiter.vercel.app`

#### 7c. apps/kitchen (KDS)

1. **Add New Project** → mismo repo → **Root Directory**: `apps/kitchen`
2. Variables:
   ```
   VITE_API_URL = https://tableflow-server-production.up.railway.app
   VITE_SOCKET_URL = https://tableflow-server-production.up.railway.app
   ```
3. Deploy → URL: `https://tableflow-kitchen.vercel.app`

> **Importante:** Después de desplegar las apps, actualiza `FRONTEND_URL` en Railway
> con las URLs reales de Vercel para que los CORS funcionen.

---

### Paso 8 — Configurar Socket.io para producción

Las apps de waiter y kitchen se conectan por Socket.io. Actualmente leen
`import.meta.env.VITE_SOCKET_URL` (o `VITE_API_URL` como fallback).

Verifica en `apps/waiter/src/lib/socket.ts` y `apps/kitchen/src/lib/socket.ts`
que usen `VITE_SOCKET_URL` o `VITE_API_URL` en lugar del hardcoded `localhost`.

---

### Paso 9 — Webhook de Stripe

1. En el dashboard de Stripe → **Developers** → **Webhooks** → **Add endpoint**
2. URL del endpoint: `https://tableflow-server-production.up.railway.app/billing/webhook`
3. Eventos a escuchar:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
4. Copia el **Signing secret** (`whsec_...`) y ponlo como `STRIPE_WEBHOOK_SECRET` en Railway

---

### Paso 10 — Seed de producción (solo primera vez)

Desde la Railway CLI o el shell del servicio, corre el seed para crear el primer restaurante:

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Conectar al proyecto
railway link

# Correr seed en producción (usa la DB de Railway)
railway run pnpm db:seed
```

---

### Comandos útiles con Railway CLI

```bash
railway logs           # Ver logs del servidor en tiempo real
railway run <cmd>      # Correr un comando en el contexto de Railway (con sus env vars)
railway shell          # Shell interactivo en el contenedor
railway variables      # Ver todas las variables de entorno
railway status         # Estado del deploy actual
```

---

### Checklist de deploy

```
[ ] Repo en GitHub (rama main actualizada)
[ ] Servicio server creado en Railway con Dockerfile
[ ] Plugin PostgreSQL agregado en Railway
[ ] Plugin Redis agregado en Railway
[ ] Variables de entorno configuradas (JWT secrets, NODE_ENV=production)
[ ] Deploy exitoso — /health responde OK
[ ] apps/admin deployada en Vercel con VITE_API_URL correcto
[ ] apps/waiter deployada en Vercel con VITE_API_URL correcto
[ ] apps/kitchen deployada en Vercel con VITE_API_URL correcto
[ ] FRONTEND_URL en Railway actualizado con URLs de Vercel
[ ] Webhook de Stripe configurado (cuando actives billing)
[ ] Seed de producción corrido (primer restaurante creado)
[ ] Login funcional en las 3 apps
```
