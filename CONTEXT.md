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
