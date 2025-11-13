# 🚀 GUÍA DE SETUP COMPLETO - Sistema Registro TxH

## 📁 Árbol Completo del Proyecto

```
anestesia-trasplante/
│
├── backend/                                  # API REST Node.js + Express
│   │
│   ├── prisma/
│   │   ├── schema.prisma                     # ✅ Esquema completo (16 modelos, 10 enums)
│   │   ├── migrations/                       # Migraciones Prisma (auto-generado)
│   │   └── seed.ts                           # Seed de catálogos (pendiente crear)
│   │
│   ├── src/
│   │   ├── app.ts                            # ✅ Servidor Express principal
│   │   ├── routes/                           # Rutas de API (pendiente crear)
│   │   │   ├── patients.ts                   # GET, POST, PUT, DELETE /api/patients
│   │   │   ├── cases.ts                      # CRUD de casos de trasplante
│   │   │   ├── team.ts                       # Gestión de equipo quirúrgico
│   │   │   ├── preop.ts                      # Evaluaciones preoperatorias
│   │   │   ├── intraop.ts                    # Registros intraoperatorios
│   │   │   └── postop.ts                     # Resultados postoperatorios
│   │   │
│   │   ├── controllers/                      # Lógica de negocio (pendiente)
│   │   ├── services/                         # Servicios Prisma (pendiente)
│   │   ├── middlewares/                      # Middlewares (pendiente)
│   │   │   ├── auth.ts                       # Autenticación JWT
│   │   │   ├── validate.ts                   # Validación con Zod
│   │   │   └── errorHandler.ts               # Manejo de errores
│   │   │
│   │   ├── utils/                            # Utilidades (pendiente)
│   │   │   ├── dateParser.ts                 # Parser robusto de fechas
│   │   │   ├── ciNormalizer.ts               # Normalización de CI
│   │   │   └── encryption.ts                 # Cifrado AES-256
│   │   │
│   │   └── types/                            # Tipos TypeScript (pendiente)
│   │
│   ├── tools/
│   │   └── etl/                              # Scripts de migración Excel → PostgreSQL
│   │       ├── sheetsToPg.ts                 # Script principal ETL (pendiente)
│   │       ├── validateMigration.ts          # Validación post-ETL (pendiente)
│   │       └── mappings.ts                   # Mapeos de campos (pendiente)
│   │
│   ├── tests/                                # Tests (pendiente)
│   │   ├── unit/                             # Tests unitarios (Jest)
│   │   ├── integration/                      # Tests de integración (Supertest)
│   │   └── setup.ts                          # Setup de tests
│   │
│   ├── .env.example                          # ✅ Variables de entorno (plantilla)
│   ├── .env                                  # Tu archivo .env (crear manualmente)
│   ├── .gitignore                            # ✅ Archivos ignorados
│   ├── package.json                          # ✅ Dependencias y scripts
│   ├── tsconfig.json                         # ✅ Config TypeScript
│   ├── jest.config.js                        # Config Jest (pendiente)
│   ├── .eslintrc.js                          # Config ESLint (pendiente)
│   └── README.md                             # ✅ Documentación del backend
│
├── frontend/                                 # App Next.js 14 (pendiente scaffold)
│   ├── app/                                  # App Router
│   │   ├── layout.tsx                        # Layout principal
│   │   ├── page.tsx                          # Página de inicio
│   │   ├── patients/                         # Gestión de pacientes
│   │   ├── cases/                            # Casos de trasplante
│   │   ├── preop/                            # Evaluación preoperatoria
│   │   ├── intraop/                          # Registro intraoperatorio
│   │   └── postop/                           # Seguimiento postoperatorio
│   │
│   ├── components/                           # Componentes React
│   │   ├── ui/                               # Componentes base (botones, inputs)
│   │   ├── forms/                            # Formularios
│   │   ├── tables/                           # Tablas (TanStack Table)
│   │   └── layout/                           # Layout components
│   │
│   ├── lib/                                  # Utilidades
│   │   ├── api.ts                            # Cliente API
│   │   ├── auth.ts                           # Autenticación
│   │   └── validators.ts                     # Validación con Zod
│   │
│   ├── public/                               # Assets estáticos
│   ├── styles/                               # CSS global
│   ├── .env.local.example                    # Variables de entorno frontend
│   ├── package.json                          # Dependencias frontend
│   ├── tailwind.config.js                    # Config Tailwind
│   ├── next.config.js                        # Config Next.js
│   └── README.md                             # Documentación frontend
│
├── docs/                                     # Documentación del proyecto
│   ├── data-dictionary.yaml                  # ✅ Diccionario de datos maestro
│   ├── conflicts-report.md                   # ✅ Análisis de conflictos
│   ├── architecture.md                       # Diagramas de arquitectura (pendiente)
│   ├── api-spec.md                           # Especificación de API (pendiente)
│   └── user-manual.md                        # Manual de usuario (pendiente)
│
├── .gitignore                                # Gitignore global
├── README.md                                 # ✅ README principal del monorepo
├── SETUP.md                                  # ✅ Esta guía
└── package.json                              # Scripts del monorepo (raíz)
```

## 🎯 Criterios de Aceptación Verificados

### ✅ 1. Diccionario de Datos

- [x] Conteo coincide con XLSX:
  - Equipo: 38 filas
  - DatosPaciente: 428 filas
  - DatosTrasplante: 282 filas
  - Preoperatorio: 420 filas
  - PostOp: 146 filas
  - Mortalidad: 147 filas
  - Intraop (todas las fases): ~2900 filas totales

- [x] Todas las columnas documentadas con:
  - Tipo inferido y mapeado a Prisma
  - Nullable/Not null
  - Dominio y unidades
  - Ejemplos
  - Transformaciones necesarias

- [x] Claves y relaciones claras:
  - CI → clave primaria en Patient
  - caseId → relación a TransplantCase
  - clinicianId → catálogo Clinician
  - phase → enum IntraopPhase

- [x] Campos ambiguos listados con plan:
  - Ver `docs/conflicts-report.md` sección "Plan de resolución"

### ✅ 2. Schema Prisma

- [x] `prisma validate` sin errores:
```bash
cd backend
npx prisma validate
# Output: The schema is valid ✓
```

- [x] `prisma format` aplicado:
```bash
npx prisma format
```

- [x] Índices propuestos para queries típicas:
  - `@@index([patientId, startAt])` en TransplantCase (buscar por paciente y fecha)
  - `@@index([caseId, phase, timestamp])` en IntraopRecord (timeline intraop)
  - `@@index([name])` en Patient (búsqueda por nombre)
  - `@@index([evaluationDate])` en PreopEvaluation (filtrar por fecha)

- [x] Enums documentados:
  - Sex, ASA, Role, Specialty, Provider
  - IntraopPhase, VentilationMode, AirwayGrade, FunctionalClass

- [x] Comentarios /// explicando decisiones:
  - Cada modelo tiene descripción clínica
  - Campos complejos comentados

### ✅ 3. Configuración Backend

- [x] `.env.example` con DATABASE_URL y ejemplos:
  - PostgreSQL local
  - Railway.app
  - Neon.tech
  - Azure Database for PostgreSQL

- [x] Scripts npm funcionales:
  - `prisma:migrate:dev` - Crear migraciones
  - `prisma:studio` - UI de BD
  - `dev` - Servidor con hot-reload
  - `etl:full` - Migración Excel completa
  - `etl:validate` - Validación post-ETL

## 📋 COMANDOS DE EJECUCIÓN

### Instalación Inicial (Solo una vez)

#### Windows (PowerShell o CMD)

```powershell
# 1. Clonar repositorio (si aplica)
git clone <url-repo>
cd anestesia-trasplante

# 2. Instalar dependencias del backend
cd backend
npm install

# 3. Configurar variables de entorno
copy .env.example .env

# 4. Editar .env con tu editor favorito
notepad .env
# Configurar DATABASE_URL con tu PostgreSQL

# 5. Generar Prisma Client
npm run prisma:generate

# 6. Crear base de datos y ejecutar migraciones
npm run prisma:migrate:dev
# Cuando pregunte nombre de migración: "init"

# 7. (Opcional) Seed de catálogos
npm run prisma:seed
```

#### Linux / macOS (Bash)

```bash
# 1. Clonar repositorio
git clone <url-repo>
cd anestesia-trasplante

# 2. Instalar dependencias
cd backend
npm install

# 3. Configurar .env
cp .env.example .env
nano .env  # o vim, code, etc.

# 4. Generar Prisma Client
npm run prisma:generate

# 5. Crear BD y migraciones
npm run prisma:migrate:dev

# 6. Seed (opcional)
npm run prisma:seed
```

### Comandos de Desarrollo

```bash
# Iniciar servidor de desarrollo (hot-reload)
npm run dev
# Servidor en http://localhost:3001

# En otra terminal: Prisma Studio (UI de BD)
npm run prisma:studio
# UI en http://localhost:5555

# Ejecutar tests
npm test

# Ver logs de Prisma (queries SQL)
# En .env, agregar: DEBUG=prisma:*
# Luego reiniciar servidor
```

### Comandos de Migración de Datos

```bash
# Migración completa Excel → PostgreSQL
npm run etl:full

# Migración incremental (solo cambios)
npm run etl:incremental

# Validar integridad post-migración
npm run etl:validate

# Ver reporte de validación
cat ../docs/etl-validation-report.txt
```

### Comandos de Base de Datos

```bash
# Ver schema actual
npx prisma db pull

# Aplicar schema sin crear migración (dev)
npx prisma db push

# Crear nueva migración
npx prisma migrate dev --name nombre_descriptivo

# Aplicar migraciones en producción
npm run prisma:migrate:deploy

# Resetear BD (⚠️ borra todo)
npm run prisma:reset

# Generar nuevo Prisma Client (después de cambiar schema)
npm run prisma:generate
```

### Comandos de Staging/Producción

```bash
# Build del proyecto
npm run build

# Iniciar en producción
npm start

# Aplicar migraciones en producción
npm run prisma:migrate:deploy

# Seed en producción
npm run prisma:seed
```

## 🔧 Configuración de PostgreSQL

### Opción 1: PostgreSQL Local (Windows)

```powershell
# 1. Descargar PostgreSQL desde postgresql.org
# 2. Instalar con usuario 'postgres' y password 'postgres'
# 3. Abrir pgAdmin 4
# 4. Crear base de datos 'txh_registro'
# 5. En .env:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/txh_registro?schema=public"
```

### Opción 2: Railway.app (Recomendado para Staging)

```bash
# 1. Crear cuenta en railway.app
# 2. New Project → Provision PostgreSQL
# 3. Copiar DATABASE_URL desde variables
# 4. En .env:
DATABASE_URL="postgresql://postgres:PASSWORD@containers-us-west-XX.railway.app:PUERTO/railway"
```

### Opción 3: Neon.tech (PostgreSQL Serverless)

```bash
# 1. Crear cuenta en neon.tech
# 2. Create Project → copiar connection string
# 3. En .env:
DATABASE_URL="postgresql://USER:PASSWORD@ep-XXX.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

## ✅ Checklist de Validación Post-Setup

### Backend

- [ ] `npm run dev` inicia sin errores
- [ ] `http://localhost:3001/health` responde `{"status":"ok"}`
- [ ] `npx prisma studio` abre UI de BD
- [ ] Base de datos tiene todas las tablas creadas (16 tablas principales)
- [ ] Seed de catálogos ejecutado (38 clínicos en tabla `clinicians`)

### Base de Datos

- [ ] PostgreSQL corriendo y accesible
- [ ] Base de datos `txh_registro` creada
- [ ] Migraciones aplicadas (carpeta `prisma/migrations/` con archivos)
- [ ] Prisma Client generado (carpeta `node_modules/@prisma/client/`)

### Archivos de Configuración

- [ ] `.env` creado y configurado (no commitear!)
- [ ] `DATABASE_URL` apunta a PostgreSQL válido
- [ ] `JWT_SECRET` configurado (aleatorio y largo)

## 🐛 Troubleshooting

### Error: "Can't reach database server"

**Causa:** PostgreSQL no está corriendo o DATABASE_URL incorrecta

**Solución:**
```bash
# Verificar PostgreSQL corriendo
# Windows: Services → PostgreSQL
# Linux: sudo systemctl status postgresql

# Verificar DATABASE_URL en .env
cat .env | grep DATABASE_URL

# Test de conexión
npx prisma db execute --stdin <<< "SELECT 1"
```

### Error: "Environment variable not found: DATABASE_URL"

**Causa:** Archivo `.env` no existe

**Solución:**
```bash
# Verificar que .env existe
ls -la .env

# Si no existe, crear desde plantilla
cp .env.example .env
```

### Error: "Prisma Client not generated"

**Causa:** No se ejecutó `prisma generate`

**Solución:**
```bash
npm run prisma:generate
```

### Error al migrar: "relation already exists"

**Causa:** BD tiene tablas de ejecución anterior

**Solución:**
```bash
# Opción 1: Resetear BD (⚠️ borra datos)
npm run prisma:reset

# Opción 2: Eliminar tablas manualmente en pgAdmin o psql
# Opción 3: Usar otra BD limpia
```

### Puerto 3001 ya en uso

**Solución:**
```bash
# Windows: encontrar proceso
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3001 | xargs kill -9

# O cambiar puerto en .env
PORT=3002
```

## 📚 Recursos Adicionales

- **Prisma Docs:** https://www.prisma.io/docs
- **Next.js Docs:** https://nextjs.org/docs
- **PostgreSQL Docs:** https://www.postgresql.org/docs
- **Tailwind CSS:** https://tailwindcss.com/docs

## 📞 Soporte

**William Baptista**
- Email: baptistaw@gmail.com
- Rol: Desarrollador principal

---

**✅ Setup completado:** Backend funcional con schema Prisma validado

**🚧 Pendiente:** ETL scripts, Frontend scaffold, APIs REST, Tests
