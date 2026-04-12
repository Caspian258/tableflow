# Guía de Deploy — TableFlow

> Sigue los pasos en el **orden exacto** que se indica.
> Railway primero (el servidor debe estar arriba antes de desplegar las apps frontend).

---

## Orden de ejecución

1. [Railway — Servidor + PostgreSQL + Redis](#1-railway--servidor--postgresql--redis)
2. [Migraciones y seed en producción](#2-migraciones-y-seed-en-producción)
3. [Vercel — Apps frontend](#3-vercel--apps-frontend)
4. [Post-deploy: CORS y verificación final](#4-post-deploy-cors-y-verificación-final)

---

## 1. Railway — Servidor + PostgreSQL + Redis

### 1a. Crear el proyecto

1. Ve a [railway.app](https://railway.app) e inicia sesión
2. Click en **New Project** → **Deploy from GitHub repo**
3. Autoriza Railway para acceder a tu cuenta de GitHub si aún no lo has hecho
4. Selecciona el repositorio `tableflow`
5. Railway detectará el `Dockerfile` automáticamente (builder = DOCKERFILE)
6. El servicio se llamará `tableflow` o el nombre del repo — puedes renombrarlo a `server`

### 1b. Agregar PostgreSQL

1. En el proyecto de Railway → click en **+ New**
2. Selecciona **Database** → **PostgreSQL**
3. Railway crea la base de datos y agrega `DATABASE_URL` automáticamente a todos los servicios del proyecto
4. Verifica que `DATABASE_URL` aparezca en las variables del servicio `server`

### 1c. Agregar Redis

1. En el proyecto de Railway → click en **+ New**
2. Selecciona **Database** → **Redis**
3. Railway agrega `REDIS_URL` automáticamente
4. Verifica que `REDIS_URL` aparezca en las variables del servicio `server`

### 1d. Variables de entorno del servidor

En Railway → servicio `server` → pestaña **Variables**, agrega estas variables:

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Activa modo producción (logs JSON, CORS estricto) |
| `JWT_SECRET` | `<genera abajo>` | Secret para firmar access tokens JWT |
| `JWT_REFRESH_SECRET` | `<genera abajo>` | Secret para firmar refresh tokens JWT |
| `JWT_EXPIRES_IN` | `15m` | Duración del access token |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Duración del refresh token |
| `FRONTEND_URL` | `<URLs de Vercel, separadas por coma>` | Orígenes permitidos por CORS — actualizar después del paso 3 |
| `PORT` | `3001` | Puerto del servidor (Railway lo puede sobreescribir automáticamente) |
| `STRIPE_SECRET_KEY` | `sk_live_...` | API key de Stripe (dejar vacío si no activas billing aún) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Secret del webhook de Stripe |
| `STRIPE_BASIC_PRICE_ID` | `price_...` | ID del precio "Basic" en Stripe |
| `STRIPE_PRO_PRICE_ID` | `price_...` | ID del precio "Pro" en Stripe |

> **`DATABASE_URL` y `REDIS_URL` son agregadas automáticamente por Railway** — no las agregues a mano.

**Generar los JWT secrets** (corre estos comandos en tu terminal local):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Corre dos veces: una para JWT_SECRET, otra para JWT_REFRESH_SECRET
```

### 1e. Verificar el deploy

1. Railway hace el deploy automáticamente al conectar el repo
2. El build tarda ~3–5 minutos (Docker multi-stage)
3. Ve a **Logs** del servicio para seguir el progreso
4. Al terminar, el health check debe responder:
   ```
   GET https://tu-servicio.up.railway.app/health
   → {"status":"ok","timestamp":"..."}
   ```
5. Guarda la URL del servicio — la necesitarás en el paso 3: `https://tableflow-production.up.railway.app`

---

## 2. Migraciones y seed en producción

Una vez que el servidor esté arriba en Railway, corre el seed para crear el primer restaurante:

### Opción A — Railway CLI (recomendada)

```bash
# Instalar la CLI de Railway (solo la primera vez)
npm install -g @railway/cli

# Login
railway login

# Conectar al proyecto (desde la raíz del repo)
railway link

# Correr seed en producción (usa la DB de Railway)
railway run pnpm db:seed
```

### Opción B — Desde el shell de Railway

1. En Railway → servicio `server` → tab **Settings** → **Shell**
2. Ejecuta:
   ```bash
   node_modules/.bin/prisma db seed
   ```

> **Nota:** Las migraciones de Prisma (`prisma migrate deploy`) se corren **automáticamente** en cada deploy gracias al script `scripts/start.sh`. No necesitas correrlas a mano.

---

## 3. Vercel — Apps frontend

Cada app es un sitio estático independiente. Repite el proceso para las 3 apps.

### Pasos comunes para cada app

1. Ve a [vercel.com](https://vercel.com) → **Add New Project**
2. Importa el repositorio `tableflow`
3. En **Root Directory**, escribe la ruta de la app (ver tabla abajo)
4. Vercel detecta automáticamente que es un proyecto Vite
5. Agrega las variables de entorno (ver tabla abajo)
6. Click en **Deploy**

### Configuración por app

| App | Root Directory | Variables de entorno |
|-----|---------------|----------------------|
| **Admin** | `apps/admin` | `VITE_API_URL=https://tu-servidor.up.railway.app` |
| **Waiter (meseros)** | `apps/waiter` | `VITE_API_URL=https://tu-servidor.up.railway.app`<br>`VITE_SOCKET_URL=https://tu-servidor.up.railway.app` |
| **Kitchen (cocina)** | `apps/kitchen` | `VITE_API_URL=https://tu-servidor.up.railway.app`<br>`VITE_SOCKET_URL=https://tu-servidor.up.railway.app` |

> Reemplaza `https://tu-servidor.up.railway.app` con la URL real de tu servicio en Railway.

### Resultado esperado

Al terminar tendrás 3 URLs de Vercel:
- `https://tableflow-admin.vercel.app` (o el nombre que Vercel asigne)
- `https://tableflow-waiter.vercel.app`
- `https://tableflow-kitchen.vercel.app`

Puedes configurar dominios custom en Vercel → tu proyecto → **Settings** → **Domains**.

---

## 4. Post-deploy: CORS y verificación final

### 4a. Actualizar CORS en Railway

Ahora que tienes las URLs de Vercel, actualiza la variable `FRONTEND_URL` en Railway con las 3 URLs separadas por coma:

```
FRONTEND_URL=https://tableflow-admin.vercel.app,https://tableflow-waiter.vercel.app,https://tableflow-kitchen.vercel.app
```

Railway reinicia el servidor automáticamente al cambiar variables.

### 4b. Configurar webhook de Stripe (cuando actives billing)

1. En el dashboard de Stripe → **Developers** → **Webhooks** → **Add endpoint**
2. URL: `https://tu-servidor.up.railway.app/billing/webhook`
3. Eventos a escuchar:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
4. Copia el **Signing secret** (`whsec_...`) y actualiza `STRIPE_WEBHOOK_SECRET` en Railway

### 4c. Checklist final

```
[ ] Railway: servicio server desplegado y /health responde OK
[ ] Railway: PostgreSQL y Redis agregados como plugins
[ ] Railway: Variables de entorno configuradas (JWT secrets, NODE_ENV=production)
[ ] Seed corrido: restaurante piloto creado (El Piloto con usuarios y menú)
[ ] Vercel: apps/admin deployada con VITE_API_URL correcto
[ ] Vercel: apps/waiter deployada con VITE_API_URL y VITE_SOCKET_URL correctos
[ ] Vercel: apps/kitchen deployada con VITE_API_URL y VITE_SOCKET_URL correctos
[ ] FRONTEND_URL en Railway actualizado con las 3 URLs de Vercel
[ ] Login funcional en las 3 apps
[ ] Crear orden en waiter → aparece en kitchen en tiempo real
[ ] Stripe webhook configurado (cuando actives billing)
```

---

## Comandos útiles con Railway CLI

```bash
railway logs            # Logs del servidor en tiempo real
railway run <cmd>       # Corre un comando con las variables de entorno de Railway
railway shell           # Shell interactivo en el contenedor
railway variables       # Ver todas las variables de entorno
railway status          # Estado del deploy actual
railway run pnpm db:seed  # Correr seed en producción
```
