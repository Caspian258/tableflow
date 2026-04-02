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

## Fase actual: 0 — Estructura y configuración inicial

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

> _Última actualización: Sesión 1 — Estructura inicial completa_

