# 🚀 Desarrollo Local - Sistema Registro TxH

Guía completa para levantar la plataforma en tu máquina local.

## 📋 Requisitos Previos

- **Node.js** 18 o superior
- **PostgreSQL** 15 o superior (corriendo en puerto 5432)
- **npm** (viene con Node.js)

## ⚡ Setup Rápido (Recomendado)

### 1. Ejecutar script de setup automático

```bash
chmod +x setup-local.sh
./setup-local.sh
```

Este script:
- ✅ Verifica que PostgreSQL esté corriendo
- ✅ Crea el usuario `postgres` con contraseña `postgres`
- ✅ Crea la base de datos `txh_registro`
- ✅ Instala dependencias del backend
- ✅ Ejecuta migraciones de Prisma
- ✅ Opcionalmente carga datos de test (3 pacientes, 2 casos, 20 registros)
- ✅ Opcionalmente instala dependencias del frontend

### 2. Iniciar servidores de desarrollo

**Opción A: Con tmux (recomendado)**
```bash
chmod +x start-dev.sh
./start-dev.sh
```

Esto abre backend y frontend en paneles separados de tmux.

**Opción B: Manualmente en terminales separadas**

Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

### 3. Acceder a la aplicación

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **API Docs**: http://localhost:4000/api-docs (si existe)

---

## 🛠️ Setup Manual (Paso a Paso)

Si prefieres configurar manualmente:

### 1. Configurar PostgreSQL

```bash
# Crear usuario postgres
sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'postgres';"
sudo -u postgres psql -c "ALTER USER postgres CREATEDB;"

# Crear base de datos
sudo -u postgres createdb -O postgres txh_registro
```

### 2. Configurar variables de entorno

El archivo `backend/.env` ya está configurado con:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/txh_registro?schema=public"
JWT_SECRET=<generado automáticamente>
ENCRYPTION_KEY=<generado automáticamente>
PORT=4000
NODE_ENV=development
```

### 3. Instalar dependencias del backend

```bash
cd backend
npm install
```

### 4. Ejecutar migraciones de Prisma

```bash
npx prisma migrate deploy
```

### 5. (Opcional) Cargar datos de prueba

```bash
node -e "
  const {seedTestData, closeDatabase} = require('./tests/helpers/dbHelper');
  seedTestData()
    .then(() => {
      console.log('✅ Datos de test creados');
      return closeDatabase();
    })
    .catch(console.error);
"
```

### 6. Iniciar backend

```bash
npm run dev
```

El backend estará en http://localhost:4000

### 7. Configurar e iniciar frontend

En otra terminal:
```bash
cd frontend
npm install
npm run dev
```

El frontend estará en http://localhost:3000

---

## 🧪 Ejecutar Tests

### Tests del Backend

```bash
cd backend

# Todos los tests
npm test

# Tests con cobertura
npm test -- --coverage

# Tests en modo watch
npm test -- --watch

# Solo tests unitarios
npm run test:unit

# Solo tests de integración
npm run test:int
```

### Tests E2E del Frontend (Playwright)

```bash
cd frontend

# Instalar navegadores de Playwright (solo primera vez)
npx playwright install

# Ejecutar tests E2E
npx playwright test

# Tests con UI interactiva
npx playwright test --ui

# Ver reporte de tests
npx playwright show-report
```

---

## 📊 Datos de Test Incluidos

Cuando ejecutas el seed, se crean:

### Pacientes (3)
1. **Juan Pérez** (CI: 1.234.567-8) - MELD 18, Caso 1
2. **María González** (CI: 2.345.678-9) - MELD 32, Caso 2 (retrasplante)
3. **Pedro Rodríguez** (CI: 3.456.789-0) - Sin casos

### Clínicos (3)
1. Dr. Carlos Martínez (Anestesiólogo)
2. Dra. Ana Fernández (Cirujano)
3. Dr. Luis García (Hepatólogo)

### Casos de Trasplante (2)
- **Caso 1**: Juan Pérez - 15/03/2024 - Sin complicaciones
- **Caso 2**: María González - 20/06/2024 - Retrasplante con insuficiencia renal transitoria

### Registros Intraoperatorios (20)
- 10 registros por cada caso
- Distribuidos en 7 fases quirúrgicas
- Incluyen signos vitales, ventilación, hemodinamia

---

## 🗄️ Gestión de Base de Datos

### Ver datos en la base de datos

```bash
cd backend

# Abrir Prisma Studio (GUI para ver/editar datos)
npx prisma studio
```

Se abrirá en http://localhost:5555

### Resetear base de datos

```bash
cd backend

# Eliminar y recrear base de datos
npx prisma migrate reset

# Aplicar solo migraciones (sin seed)
npx prisma migrate deploy
```

### Generar nueva migración

```bash
cd backend

# Después de cambiar schema.prisma
npx prisma migrate dev --name descripcion_cambio
```

---

## 🔧 Comandos Útiles

### Backend

```bash
# Iniciar en desarrollo
npm run dev

# Iniciar en producción
npm start

# Linting
npm run lint

# Formatear código
npm run format

# Ver logs de Prisma
DEBUG=prisma:* npm run dev
```

### Frontend

```bash
# Iniciar en desarrollo
npm run dev

# Build de producción
npm run build

# Iniciar build de producción
npm start

# Linting
npm run lint
```

---

## 🐛 Troubleshooting

### PostgreSQL no se conecta

**Error**: `Authentication failed against database server`

**Solución**:
```bash
# Verificar que PostgreSQL esté corriendo
pg_isready

# Si no está corriendo
sudo systemctl start postgresql

# Verificar configuración de autenticación
sudo cat /etc/postgresql/*/main/pg_hba.conf | grep local
```

### Puerto 4000 o 3000 ya en uso

**Solución**:
```bash
# Encontrar proceso usando el puerto
lsof -i :4000
lsof -i :3000

# Matar proceso
kill -9 <PID>
```

### Error de migraciones de Prisma

**Solución**:
```bash
cd backend

# Regenerar Prisma Client
npx prisma generate

# Reintentar migraciones
npx prisma migrate deploy

# Si falla todo, resetear
npx prisma migrate reset
```

### Dependencias desactualizadas

**Solución**:
```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

---

## 📝 Notas

- **Credenciales de BD**: Usuario `postgres`, contraseña `postgres` (solo para desarrollo local)
- **JWT Secret**: Generado automáticamente en `.env`, no commitear
- **Puerto Backend**: 4000 (configurable en `.env`)
- **Puerto Frontend**: 3000 (configurable en `frontend/package.json`)
- **Migraciones**: Aplicadas automáticamente con `migrate deploy`

---

## 🔗 URLs de Referencia

- Backend Dev: http://localhost:4000
- Frontend Dev: http://localhost:3000
- Prisma Studio: http://localhost:5555 (con `npx prisma studio`)
- GitHub Repo: https://github.com/baptistaw/TxH

---

## 📞 Soporte

Si encuentras problemas, verifica:
1. Los logs de backend en `/tmp/txh-backend.log` (si usas `start-dev.sh`)
2. Los logs de frontend en `/tmp/txh-frontend.log`
3. El estado del pipeline CI en https://github.com/baptistaw/TxH/actions
