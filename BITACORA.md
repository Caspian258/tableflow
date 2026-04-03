# BITACORA.md — Registro de avances de TableFlow

> Registro cronológico de decisiones, avances y pendientes.
> Actualizar al final de cada sesión de trabajo.

---

## Cómo usar esta bitácora

Al **iniciar** una sesión:
1. Leer la última entrada para saber en qué quedó
2. Ver la sección "Próximos pasos" de esa entrada
3. Abrir el archivo `CONTEXT.md` para el contexto técnico completo

Al **terminar** una sesión:
1. Agregar una nueva entrada con fecha
2. Documentar qué se hizo, qué decisiones se tomaron y por qué
3. Actualizar "Próximos pasos" con claridad para retomar sin fricción

---

## Fase actual: 🚀 LISTO PARA DEPLOY — Railway + Vercel configurados, pendiente ejecutar

---

## Entradas

---

### [Sesión 1] — Inicio del proyecto

**Fecha:** 2026-04-02
**Fase:** 0 — Estructura inicial

#### Contexto y decisiones

Se definió la visión completa del proyecto en conversación inicial:

- **Producto:** Sistema POS + KDS + Analytics para restaurantes
- **Modelo de negocio:** SaaS multi-tenant — cobro mensual por restaurante
- **Cliente piloto:** Restaurante familiar (padre del desarrollador)
- **Escala objetivo:** Múltiples restaurantes independientes

**Decisiones de arquitectura tomadas:**
- Monorepo con `pnpm workspaces` para compartir tipos y lógica
- PWA en lugar de app nativa — evita App Store, funciona en cualquier dispositivo
- Multi-tenancy por `restaurant_id` en cada tabla (schema compartido, datos aislados)
- Socket.io con Redis adapter para tiempo real escalable
- JWT de corta duración + refresh token en cookie HttpOnly (seguridad)
- Impresión ESC/POS desde el KDS como puente (la tablet de cocina imprime)
- Railway para el MVP, migración a AWS/GCP cuando escale
- Stripe para billing SaaS en Fase 3

**Stack final decidido:**
- Frontend: React 18 + TypeScript + Vite + TailwindCSS
- Backend: Node.js 20 + Fastify + TypeScript + Prisma
- BD: PostgreSQL 15 + Redis 7
- Monorepo: pnpm workspaces

#### Qué se hizo en esta sesión

- [x] Definición completa de la visión del producto
- [x] Decisión del stack tecnológico
- [x] Creación de la estructura de carpetas del monorepo
- [x] `README.md` — descripción general y guía de inicio
- [x] `CONTEXT.md` — contexto técnico completo para retomar trabajo
- [x] `BITACORA.md` — este archivo
- [x] `.gitignore` configurado
- [x] `.env.example` con todas las variables necesarias
- [x] `package.json` raíz con workspaces de pnpm
- [x] `docker-compose.yml` para PostgreSQL + Redis local
- [x] Schema inicial de Prisma con todas las tablas principales
- [x] Configuración de TypeScript, ESLint y Prettier
- [x] GitHub Actions básico (CI)
- [x] Repositorio inicializado en GitHub

#### Decisiones pendientes de confirmar

- [ ] Nombre de dominio del producto (tableflow.mx, tableflow.app, etc.)
- [ ] ¿Qué modelo de precios para el SaaS? (por sugerencia: básico $X/mes, pro $Y/mes)
- [ ] ¿El restaurante piloto tiene Wi-Fi estable en el área de mesas? (afecta el diseño offline)
- [ ] ¿Qué impresora térmica tiene o va a comprar el restaurante?

#### Próximos pasos (Sesión 2)

1. Configurar Fastify con estructura base (plugins: cors, jwt, sensible)
2. Crear las rutas de autenticación (`POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`)
3. Implementar el middleware de autenticación y roles
4. Crear seed inicial (1 restaurante, 5 mesas, menú de ejemplo, usuarios de prueba)
5. Iniciar la app de meseros con: login screen, lista de mesas, pantalla de orden

---

---

### [Sesión 2] — Backend: Fastify + Auth + Seed

**Fecha:** 2026-04-02
**Fase:** 1 — Backend base

#### Qué se hizo en esta sesión

- [x] `pnpm-workspace.yaml` — creado (pnpm lo requiere en lugar del campo `workspaces` en package.json)
- [x] `server/tsconfig.json` — configuración TypeScript para Node.js (`module: NodeNext`)
- [x] `server/src/lib/prisma.ts` — singleton de PrismaClient
- [x] `server/src/types/fastify.d.ts` — declaración de tipos para payload JWT (`sub`, `restaurantId`, `role`, `name`)
- [x] `server/src/middleware/authenticate.ts` — `authenticate` (preHandler JWT) y `requireRole(...roles)` (factory de roles)
- [x] `server/src/controllers/auth.controller.ts` — lógica de `login`, `refresh`, `logout`
- [x] `server/src/routes/auth.ts` — rutas `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- [x] `server/src/index.ts` — Fastify configurado con cors, jwt, cookie, sensible; rutas de auth registradas
- [x] `server/prisma/seed.ts` — restaurante "El Piloto", 5 mesas, 4 categorías, 13 platillos, 5 usuarios
- [x] `server/package.json` — agregado `bcryptjs` y `@types/bcryptjs`
- [x] `server/.env` — copiado de `.env.example` con valores de desarrollo
- [x] Dependencias instaladas con `pnpm install`
- [x] Prisma Client generado (`prisma generate`)
- [x] Seed ejecutado — BD poblada con datos de prueba
- [x] Servidor probado: `/health`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` todos responden correctamente

#### Decisiones técnicas

- Refresh token guardado en cookie HttpOnly `path: /auth` — limita la exposición a solo las rutas de auth
- `authenticate` y `requireRole` como funciones exportadas (no decoradores de Fastify) — más simple para el MVP
- Seed idempotente: si ya existe el restaurante con slug `el-piloto`, no hace nada (evita duplicados en `db:reset` accidental)
- PostgreSQL corre directo en el sistema (no Docker)

#### Credenciales de prueba (BD local)

| Rol     | Email                   | Password     | PIN  |
|---------|-------------------------|--------------|------|
| owner   | owner@elpiloto.com      | owner1234    | —    |
| manager | manager@elpiloto.com    | manager1234  | —    |
| waiter  | mesero1@elpiloto.com    | waiter1234   | 1234 |
| waiter  | mesero2@elpiloto.com    | waiter5678   | 5678 |
| kitchen | cocina@elpiloto.com     | kitchen1234  | 9012 |

#### Próximos pasos (Sesión 3)

1. **Rutas de mesas** — `GET /tables` (lista por restaurante), `PATCH /tables/:id/status`
2. **Rutas de menú** — `GET /menu` (categorías + platillos activos)
3. **Rutas de órdenes** — `POST /orders`, `GET /orders`, `PATCH /orders/:id/status`
4. **Socket.io** — configurar rooms por restaurante, emitir eventos `order:new` y `order:status_changed`
5. **App de meseros** — pantalla de login, lista de mesas, pantalla de nueva orden

---

---

### [Sesión 3] — Rutas core + Socket.io

**Fecha:** 2026-04-02
**Fase:** 1 — Backend

#### Qué se hizo en esta sesión

- [x] `server/src/lib/socket.ts` — inicialización de Socket.io con auth JWT y auto-join de rooms por rol
- [x] `server/src/controllers/tables.controller.ts` — `GET /tables`, `PATCH /tables/:id/status`
- [x] `server/src/controllers/menu.controller.ts` — `GET /menu` (categorías + platillos activos, precio como number)
- [x] `server/src/controllers/orders.controller.ts` — `POST /orders`, `PATCH /orders/:id/status`
- [x] `server/src/routes/tables.ts`, `menu.ts`, `orders.ts` — registradas en Fastify
- [x] `server/src/index.ts` — Socket.io inicializado tras `app.ready()`

#### Comportamientos implementados

**Mesas:**
- `GET /tables` — lista ordenada por número, cualquier rol autenticado
- `PATCH /tables/:id/status` — cambia status, valida que la mesa pertenezca al tenant

**Menú:**
- `GET /menu` — solo categorías e ítems activos, `price` serializado como `number`

**Órdenes:**
- `POST /orders` — solo `waiter/manager/owner`; captura precios al momento; marca mesa como `occupied`; emite `order:new` a `restaurant:{id}:kitchen`
- `PATCH /orders/:id/status` — transiciones válidas: `pending→in_progress→ready→delivered`; roles: kitchen avanza, waiter entrega/cancela, manager/owner todo; al `delivered` libera la mesa si no quedan órdenes activas; emite `order:status_changed` o `order:cancelled` a kitchen + floor

**Socket.io:**
- Auth por JWT en el handshake (`socket.handshake.auth.token`)
- Kitchen → room `restaurant:{id}:kitchen` automáticamente
- Waiter/manager/owner → room `restaurant:{id}:floor` automáticamente
- Eventos tipados con `SocketEvent` de `@tableflow/shared`

#### Decisiones técnicas

- `getIO()` lanza error si Socket.io no está inicializado; los controllers lo capturan silenciosamente (permite tests sin socket)
- Las transiciones de status están declaradas en `VALID_TRANSITIONS` — fácil de extender
- Los precios de la orden se capturan de la BD en el momento de crear (`unitPrice`) — correcto para historial de ventas
- `fetchOrderWithDetails()` centraliza la query para construir el `OrderDTO`

#### Pruebas realizadas (curl)

- `GET /health` ✓
- `GET /tables` → 5 mesas ✓
- `GET /menu` → 4 categorías, 13 platillos ✓
- `POST /orders` → orden creada, mesa pasa a `occupied`, total calculado ✓
- `PATCH status`: `pending→in_progress→ready→delivered` ✓
- Transición inválida `delivered→in_progress` → error 400 ✓
- Mesa vuelve a `available` al entregar ✓
- `PATCH /tables/:id/status` → `reserved` ✓

#### Próximos pasos (Sesión 4)

1. **App de meseros (PWA)** — pantalla de login, lista de mesas, nueva orden
   - Login con email/password → guardar accessToken en memoria (Zustand)
   - Lista de mesas con colores por status
   - Seleccionar mesa → pantalla para elegir platillos del menú
   - Confirmar orden → `POST /orders`
2. **GET /orders** — listar órdenes activas del restaurante (necesario para KDS y admin)
3. **KDS (cocina)** — muestra órdenes `pending` e `in_progress`, botones para avanzar status

---

---

### [Sesión 4] — App de meseros (PWA)

**Fecha:** 2026-04-02
**Fase:** 1 — Frontend (waiter)

#### Qué se hizo en esta sesión

**Server:**
- `GET /orders` — lista órdenes activas del restaurante (no paid/cancelled), necesario para el estado inicial de la app

**packages/shared:**
- `TableDTO`, `MenuItemDTO`, `MenuCategoryDTO` — tipos agregados (usados por waiter y futuros admin/kitchen)

**apps/waiter — configuración:**
- `index.html` — meta tags PWA (viewport, theme-color, apple-mobile-web-app)
- `vite.config.ts` — VitePWA con manifest, workbox caching del menú, `service worker autoUpdate`
- `tsconfig.json` — frontend TypeScript (target ES2020, moduleResolution bundler, jsx react-jsx)
- `tailwind.config.js` + `postcss.config.js`
- `public/icon.svg` — icono SVG verde con emoji 🍽
- `package.json` — `"type": "module"` agregado

**apps/waiter — código:**
- `src/store/index.ts` — Zustand: auth, tables, menu (caché), orders, cart (draft de nueva orden)
- `src/lib/api.ts` — fetch wrapper con auto-refresh de token (401 → `/auth/refresh` → retry)
- `src/lib/socket.ts` — Socket.io-client: auth JWT en handshake, maneja `order:new`, `order:status_changed`, `order:cancelled`, `table:status_changed`
- `src/App.tsx` — React Router con `RequireAuth` guard
- `src/pages/LoginPage.tsx` — form email/password, conecta socket al hacer login
- `src/pages/TablesPage.tsx` — grid 2 cols, colores por status, carga tablas + órdenes al montar
- `src/pages/NewOrderPage.tsx` — tabs de categorías, selector de cantidad por ítem, notas por ítem, barra inferior con total y confirmación
- `src/pages/OrderDetailPage.tsx` — status badge, lista de items, botón "Marcar como entregada" solo cuando status=ready, cancelar orden
- `src/components/TableCard.tsx` — card con color por status, badge de orden activa

**Infraestructura (arreglado):**
- `packages/shared/tsconfig.json` — creado con `include: ["src"]` para evitar que el typecheck de shared levante archivos de otros workspaces
- `apps/admin/tsconfig.json` y `apps/kitchen/tsconfig.json` — creados con `include: ["src"]` por la misma razón

#### Flujos implementados

1. **Login:** form → `POST /auth/login` → token en memoria Zustand → socket conectado → `/tables`
2. **Lista de mesas:** carga `GET /tables` + `GET /orders` en paralelo → grid con colores + badge si tiene orden
3. **Nueva orden:** mesa disponible → navega a `/orders/new/:tableId` → menú por categorías → cart → `POST /orders` → navega a detalle
4. **Detalle de orden:** muestra status en tiempo real (Socket.io), botón "Entregada" cuando status=ready, cancelar en cualquier momento
5. **Auto-refresh:** si el access token expira (401), intenta `POST /auth/refresh` automáticamente antes de volver a pedir login

#### Próximos pasos (Sesión 5)

1. **KDS (apps/kitchen)** — pantalla para cocina: lista de órdenes pending/in_progress, botones para marcar in_progress/ready, actualización en tiempo real
2. **GET /orders/:id** — endpoint para obtener detalle de una orden por ID (útil si el mesero recarga la página)
3. **Prueba completa de flujo** — login mesero → crear orden → login cocina → avanzar status → mesero entrega
4. **App admin** — dashboard básico con listado de órdenes del día

---

---

### [Sesión 5] — KDS de cocina + prueba end-to-end

**Fecha:** 2026-04-02
**Fase:** 1 — ✅ COMPLETA

#### Qué se hizo en esta sesión

**Server:**
- `POST /auth/login/pin` — login por PIN + restaurantSlug para tablet de cocina; respuesta incluye `kitchenAlertSeconds`

**apps/kitchen — completo:**
- `LoginPage.tsx` — primera vez: ingresa restaurantSlug (guardado en localStorage); luego: teclado PIN 4 dígitos con auto-submit al 4° dígito
- `PinPad.tsx` — componente de teclado numérico táctil, grande, con dots de progreso
- `KDSPage.tsx` — dos columnas: Pendientes | En preparación; reloj en tiempo real; carga `GET /orders` al montar
- `OrderCard.tsx` — tarjeta con timer ⏱ en segundos, alerta roja pulsante si supera `kitchenAlertSeconds`, botón "Iniciar ▶" o "Marcar lista ✓"
- Socket.io-client conectado al room kitchen, recibe `order:new` y `order:status_changed` en tiempo real

#### Prueba end-to-end ejecutada con curl ✅

| Paso | Actor | Acción | Resultado |
|------|-------|--------|-----------|
| 1 | Mesero | Login email/password | JWT + cookie ✓ |
| 2 | Cocina | Login PIN 9012 + slug `el-piloto` | JWT + kitchenAlertSeconds:600 ✓ |
| 3 | Mesero | Ver mesas | 4 disponibles ✓ |
| 4 | Mesero | Crear orden Mesa 3 (2 platillos) | pending, mesa → occupied ✓ |
| 5 | Cocina | `GET /orders` | Ve 1 orden pending ✓ |
| 6 | Cocina | `pending → in_progress` | Status actualizado ✓ |
| 7 | Mesero | Consulta órdenes | Ve in_progress ✓ |
| 8 | Cocina | `in_progress → ready` | Status actualizado ✓ |
| 9 | Mesero | `ready → delivered` | Status actualizado ✓ |
| 10 | Sistema | Auto-check active orders | Mesa 3 → available ✓ |
| 11 | Mesero | `GET /orders` | 0 activas ✓ |

#### Estado de Fase 1 — Completa

**Backend:**
- ✅ Autenticación JWT + refresh token + PIN login
- ✅ Middleware de auth + roles
- ✅ CRUD de mesas con status
- ✅ Menú (categorías + platillos)
- ✅ Órdenes: crear, listar activas, cambiar status con validaciones
- ✅ Socket.io: rooms por restaurante, eventos tipados
- ✅ Seed: restaurante El Piloto, 5 mesas, 13 platillos, 5 usuarios

**Apps:**
- ✅ `apps/waiter` — PWA: login, lista mesas, nueva orden, detalle de orden
- ✅ `apps/kitchen` — KDS: login por PIN, dos columnas, timer, alertas, botones de avance

#### Próximos pasos — Fase 2

1. **Pagos** — `POST /orders/:id/pay` → crea Payment, cambia orden a `paid`
2. **App admin** — dashboard: órdenes del día, ventas totales, mesas en uso
3. **GET /orders/:id** — detalle por ID (para recargas de página)
4. **Printer bridge** — emitir evento de impresión desde KDS al marcar orden como lista
5. **Deploy en Railway** — server + apps en producción para el piloto real

---

---

### [Sesión 6] — Fase 2: Analytics + Dashboard Admin

**Fecha:** 2026-04-02
**Fase:** 2 — Analytics

#### Qué se hizo en esta sesión

**Server — 4 endpoints GET /analytics/*:**
- `GET /analytics/sales?from&to` — summary (totalRevenue, totalOrders, avgTicket) + byDay array con ceros para días sin ventas
- `GET /analytics/top-items?from&to` — platillos más vendidos (rank, name, quantity, revenue)
- `GET /analytics/peak-hours?from&to` — órdenes agrupadas por hora del día (array[24])
- `GET /analytics/prep-times?from&to` — avg/p50/p90 en minutos de (readyAt - createdAt), tamaño de muestra
- Todos con guard `requireRole('owner', 'manager')`
- `server/prisma/seed-demo.ts` — seed de 244 órdenes demo distribuidas en 30 días para probar analytics

**apps/admin — completa:**
- `store/index.ts` — Zustand: auth + date range (from/to) + 5 slices de analytics
- `lib/api.ts` — fetch wrapper con 401→refresh→retry (igual que waiter)
- `pages/LoginPage.tsx` — login con check de rol (solo owner/manager)
- `components/StatCard.tsx` — card reutilizable con icono, valor y subtítulo
- `components/SalesChart.tsx` — Recharts LineChart: ingresos por día, tooltip con formato de moneda
- `components/PeakHoursChart.tsx` — Recharts BarChart: horas pico, barras altas con color indigo oscuro
- `components/TopItemsTable.tsx` — tabla con medallas 🥇🥈🥉 para top 3, rank numérico para el resto
- `pages/DashboardPage.tsx` — orquesta todo: 4 StatCards, 2 gráficas side-by-side, tabla, date range picker inline en header, botón Actualizar, botón Salir

#### Pruebas realizadas ✅

```
GET /analytics/sales    → totalRevenue: 110825, totalOrders: 240, avgTicket: 461.77
GET /analytics/top-items → Guacamole con totopos #1 (169 uds, $14,365)
GET /analytics/peak-hours → pico a las 12:00–14:00
GET /analytics/prep-times → avg: 15.3 min, p90: 23.3 min
```

- Admin app corriendo en http://localhost:5175
- Login con `owner@elpiloto.com` / `owner1234`

#### Estado Fase 2

- ✅ Analytics backend (4 endpoints)
- ✅ Dashboard admin completo (charts + tabla + stat cards + date range)
- ⬜ `POST /orders/:id/pay` — registrar pagos
- ⬜ Deploy Railway

#### Próximos pasos — Fase 2 (resto)

1. **Pagos** — `POST /orders/:id/pay`: valida orden delivered, crea Payment, cambia status a `paid`, emite evento Socket.io
2. **Pantalla de cobro** — en apps/waiter: botón "Cobrar" en OrderDetail cuando status=delivered, muestra total, métodos de pago (cash/card/transfer)
3. **Historial en admin** — tabla de pagos del día con método y monto
4. **Deploy Railway** — server + apps, variables de entorno en Railway, PostgreSQL en Railway plugin

---

### [Sesión 7] — Fase 3: SaaS multi-tenant — Registro + Billing con Stripe

**Fecha:** 2026-04-03
**Fase:** 3 — SaaS Billing

#### Qué se hizo en esta sesión

**Server — nuevos endpoints:**
- `POST /auth/register` — crea restaurante + usuario owner + subscription(trialing 30 días) en una transacción atómica; retorna login automático con accessToken
  - Valida unicidad de slug y email antes de la transacción
  - Trial de 30 días configurado en `currentPeriodEnd`
- `GET /billing/status` — devuelve plan, status, trialDaysRemaining, currentPeriodEnd (solo owner)
- `POST /billing/create-checkout` — crea Stripe Checkout Session; crea/reutiliza stripe customer; retorna `url` para redirigir (solo owner)
- `POST /billing/webhook` — sin auth; verifica firma Stripe con STRIPE_WEBHOOK_SECRET; maneja:
  - `checkout.session.completed` → activa subscription, guarda stripeCustomerId + priceId
  - `invoice.paid` → actualiza status=active y currentPeriodEnd (usa `invoice.period_end`)
  - `invoice.payment_failed` → marca status=past_due
  - `customer.subscription.deleted` → marca status=cancelled
- `middleware/checkSubscription.ts` — bloquea con 402 si status=cancelled o past_due
- `lib/stripe.ts` — singleton lazy (no lanza excepción si STRIPE_SECRET_KEY no está configurada; solo falla cuando se intenta usar)
- Raw body capturado globalmente con content type parser personalizado (`request.rawBody: Buffer`)

**Stripe API version:** `2026-03-25.dahlia` (v21 del SDK)
- En esta versión, `Subscription.current_period_end` ya no existe; se usa `Invoice.period_end`

**Admin app — nuevas pantallas:**
- `/register` — formulario completo; auto-genera slug desde el nombre del restaurante; login automático al crear; link a login
- `/billing` — planes Basic ($299/mes) vs Pro ($599/mes) con features; botón que inicia Stripe Checkout; muestra plan actual si ya está activo
- Dashboard — banner amber si status=trialing (días restantes + botón "Ver planes"); banner rojo si past_due; link "Facturación" en header (solo owner)
- Login — link "Crear cuenta gratis" → /register

#### Configuración pendiente para que Stripe funcione

```env
STRIPE_SECRET_KEY=sk_live_...       # o sk_test_... para pruebas
STRIPE_WEBHOOK_SECRET=whsec_...     # del dashboard de Stripe
STRIPE_BASIC_PRICE_ID=price_...     # ID del precio Basic en Stripe
STRIPE_PRO_PRICE_ID=price_...       # ID del precio Pro en Stripe
```

Para probar webhooks localmente: `stripe listen --forward-to localhost:3001/billing/webhook`

#### Pruebas realizadas ✅

```
POST /auth/register → crea restaurante "El Rincón", owner María, subscription trialing 30 días
GET /billing/status → { plan: "trial", status: "trialing", trialDaysRemaining: 30 }
GET /tables (con token del nuevo restaurante) → OK, 0 mesas (trialing no bloquea)
Slug duplicado → 409 "El slug ya está en uso"
```

#### Próximos pasos — Fase 3 (resto)

1. **Configurar Stripe** — crear productos/precios en el dashboard de Stripe, llenar .env con las keys
2. **Prueba de checkout** — hacer un checkout de prueba completo con la CLI de Stripe
3. **POST /orders/:id/pay** — registrar pagos en efectivo/tarjeta/transferencia
4. **Deploy Railway** — subir server + apps, configurar variables de entorno en Railway

> _Última actualización: Sesión 7 — Registro + Billing con Stripe completo_

---

### [Sesión 8] — Configuración de deploy (Railway + Vercel)

**Fecha:** 2026-04-03
**Fase:** Deploy

#### Qué se hizo en esta sesión

- `Dockerfile` — multi-stage build (deps → builder → runner) con Node 20 Alpine
  - Stage `deps`: copia solo manifests (package.json), instala todas las dependencias; esta capa se cachea mientras no cambien las dependencias
  - Stage `builder`: copia fuentes, compila TypeScript → `server/dist/`, genera Prisma Client para linux/x64
  - Stage `runner`: copia `node_modules` de `deps`, artefactos de `builder` y `.prisma`; usuario sin privilegios; HEALTHCHECK incluido
- `.dockerignore` — excluye node_modules, builds de apps, .env, seeds, editor configs
- `railway.toml` — configura builder=DOCKERFILE, healthcheck en `/health` (timeout 60s), restart ON_FAILURE
- `scripts/start.sh` — script de arranque: corre `prisma migrate deploy` antes de `node server/dist/index.js`
- `package.json` — agrega script `build:prod` que compila server + waiter + kitchen + admin en secuencia
- `CONTEXT.md` — sección "Deploy a producción" completa con:
  - Diagrama de arquitectura (Railway + Vercel)
  - Pasos 1-10 detallados: crear proyecto Railway, plugins PostgreSQL/Redis, variables de entorno, deploy de las 3 apps en Vercel, configurar Socket.io, webhook de Stripe, seed de producción
  - Comandos útiles de Railway CLI
  - Checklist de deploy

#### Verificaciones

- `pnpm build:prod` ejecutado localmente → todos los builds pasan:
  - `server`: TypeScript compilado a `server/dist/`
  - `apps/waiter`: Vite build OK
  - `apps/kitchen`: Vite build OK
  - `apps/admin`: Vite build OK
- Socket.io en `apps/waiter` y `apps/kitchen` ya usaba `VITE_API_URL` (no había localhost hardcoded)

#### Pendiente (el desarrollador debe ejecutar)

1. Push a GitHub y crear proyecto en Railway (seguir pasos en CONTEXT.md)
2. Agregar plugins PostgreSQL y Redis en Railway
3. Configurar variables de entorno en Railway (ver sección deploy en CONTEXT.md)
4. Crear 3 proyectos en Vercel (waiter, kitchen, admin) con sus `VITE_API_URL`
5. Configurar CORS: actualizar `FRONTEND_URL` en Railway con URLs de Vercel
6. Webhook de Stripe cuando actives billing
7. Correr `railway run pnpm db:seed` para crear el restaurante piloto

> _Última actualización: Sesión 8 — Deploy configurado, listo para ejecutar_

