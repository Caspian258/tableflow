# COMANDOS.md — Referencia rápida TableFlow

## Antes de empezar (cada vez)

```bash
sudo systemctl start postgresql
sudo systemctl start valkey
```

---

## Levantar el proyecto

```bash
pnpm dev:server        # Backend — siempre primero (puerto 3001)
pnpm dev:waiter        # App meseros  (puerto 5173)
pnpm dev:kitchen       # KDS cocina   (puerto 5174)
pnpm dev:admin         # Dashboard    (puerto 5175)
pnpm db:studio         # Editor visual de BD (puerto 5555)
```

---

## Git

```bash
git status             # Ver qué cambió
git add .              # Agregar todo
git commit -m "tipo: mensaje en español"
git push origin main   # Subir a GitHub
git log --oneline -10  # Ver últimos commits
```

---

## Base de datos

```bash
pnpm db:migrate        # Aplicar cambios del schema
pnpm db:seed           # Repoblar con datos de prueba
pnpm db:studio         # Interfaz visual en localhost:5555
pnpm db:reset          # ⚠️ Borra todo y re-migra (solo desarrollo)
```

---

## Diagnóstico

```bash
curl http://localhost:3001/health        # Verificar que el servidor responde
ip addr | grep "inet " | grep -v 127    # Tu IP para acceder desde el teléfono
sudo systemctl status postgresql        # Estado de PostgreSQL
sudo journalctl -u postgresql -n 20     # Logs de PostgreSQL
```

---

## Cuando algo falla

```bash
# Puertos ocupados por Vite
pkill -9 -f vite
pkill -9 -f node

# Puerto 5432 ocupado (pasta/Podman)
sudo lsof -i :5432
sudo kill -9 <PID>

# Reiniciar PostgreSQL
sudo systemctl restart postgresql

# PostgreSQL no arranca — puerto ocupado por pasta
sudo kill -9 $(sudo lsof -t -i :5432)
sudo systemctl start postgresql
```

---

## Acceso desde el teléfono

```bash
ip addr | grep "inet " | grep -v 127
# Busca la línea wlp3s0 → ejemplo: 192.168.100.181
# Abre en el teléfono: http://192.168.100.181:5173
```

---

## Credenciales de prueba (seed)

| App | Usuario | Contraseña |
|-----|---------|------------|
| Admin / Waiter | `owner@elpiloto.com` | `owner1234` |
| Waiter | `waiter@elpiloto.com` | `waiter1234` |
| Kitchen | PIN `1234` + slug `el-piloto` | — |

---

## Puertos por defecto

| Servicio | Puerto |
|----------|--------|
| Backend (Fastify) | 3001 |
| App meseros | 5173 |
| KDS cocina | 5174 |
| Dashboard admin | 5175 |
| Prisma Studio | 5555 |
| PostgreSQL | 5432 |
| Redis / Valkey | 6379 |
