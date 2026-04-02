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

## Fase actual: 1 — App de meseros completa

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

> _Última actualización: Sesión 4 — App de meseros PWA completa_

