# Instrucciones para Claude Code — TableFlow

## Antes de empezar cualquier tarea

1. Lee `CONTEXT.md` — contiene la arquitectura completa, decisiones técnicas y convenciones
2. Lee `BITACORA.md` — para saber en qué estado está el proyecto y qué sigue
3. Ejecuta `git status` y `git log --oneline -5` para ver el estado actual

## Reglas de trabajo

### Commits
- Formato obligatorio: `tipo(scope): descripción en español`
- Tipos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`
- Nunca incluir co-autores automáticos en los commits
- El autor siempre es el desarrollador humano del proyecto
- Hacer commits atómicos — un commit por funcionalidad o cambio lógico

### Código
- TypeScript estricto en todo el proyecto
- Validar todos los inputs con Zod
- Tipos compartidos SIEMPRE en `packages/shared/src/types/`
- Nunca duplicar tipos entre frontend y backend
- Errores del API: `{ error: string, details?: any }`
- Respuestas del API: `{ data: T, meta?: PaginationMeta }`

### Seguridad (crítico)
- Nunca hardcodear secrets o API keys
- Siempre usar variables de entorno (ver `.env.example`)
- JWT de corta duración (15 min) + refresh token en cookie HttpOnly
- Validar `restaurant_id` en CADA operación para garantizar aislamiento de tenants
- Sanitizar todos los inputs antes de queries a la base de datos

### Base de datos
- Todas las migraciones con Prisma (`prisma migrate dev`)
- Nunca modificar el schema sin migración
- Siempre incluir `restaurantId` en queries para multi-tenancy
- Usar índices en columnas de búsqueda frecuente

### WebSockets
- Rooms por restaurante: `restaurant:{id}:kitchen`, `restaurant:{id}:floor`
- Verificar autenticación antes de unir a rooms
- Eventos tipados con el enum `SocketEvent` de `@tableflow/shared`

## Al terminar una sesión

1. Actualizar `BITACORA.md` con lo que se hizo
2. Hacer commit de todos los cambios
3. Documentar en la bitácora los próximos pasos con claridad

## Estructura de carpetas

```
tableflow/
├── CONTEXT.md          ← LEER SIEMPRE AL INICIO
├── BITACORA.md         ← ACTUALIZAR AL TERMINAR
├── apps/
│   ├── waiter/         ← PWA meseros (React + Vite, puerto 5173)
│   ├── kitchen/        ← KDS cocina (React + Vite, puerto 5174)
│   └── admin/          ← Dashboard (React + Vite, puerto 5175)
├── server/             ← API (Fastify, puerto 3001)
│   ├── src/
│   │   ├── routes/     ← Definición de rutas
│   │   ├── controllers/← Lógica de negocio por módulo
│   │   ├── services/   ← Servicios reutilizables
│   │   ├── models/     ← Queries de Prisma encapsuladas
│   │   ├── sockets/    ← Handlers de Socket.io
│   │   ├── middleware/ ← Auth, roles, validación
│   │   └── jobs/       ← Tareas programadas
│   └── prisma/
│       └── schema.prisma
└── packages/
    └── shared/         ← Tipos TypeScript compartidos
```
