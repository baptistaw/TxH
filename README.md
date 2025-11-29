# Sistema Registro Anestesiológico - Trasplante Hepático

Migración completa desde **AppSheet + Google Sheets** a plataforma web full-stack moderna.

## 📋 Resumen del Proyecto

**Objetivo:** Migrar sistema de registro anestesiológico para trasplantes hepáticos sin pérdida de datos, con paridad funcional y arquitectura escalable.

**Stack Tecnológico:**
- **Frontend:** Next.js 14 (App Router), JavaScript, Tailwind CSS
- **Backend:** Node.js + Express + TypeScript
- **ORM:** Prisma 5
- **Base de Datos:** PostgreSQL 15+
- **Testing:** Jest, Supertest, Playwright

**Datos Fuente:**
- Archivo Excel: `Tablas Sistema Registro.xlsx`
- ~13 hojas con 400+ pacientes, 280+ casos de trasplante
- Clave primaria clínica: **CI** (Cédula de Identidad uruguaya)

## 🏗️ Arquitectura del Monorepo

```
anestesia-trasplante/
├── backend/                    # API REST (Node.js + Express + Prisma)
│   ├── prisma/
│   │   ├── schema.prisma       # ✅ Esquema completo con índices
│   │   ├── migrations/         # Migraciones versionadas
│   │   └── seed.ts             # Seed de catálogos
│   ├── src/
│   │   ├── app.ts              # ✅ Servidor Express configurado
│   │   ├── routes/             # Rutas de API
│   │   ├── controllers/        # Lógica de negocio
│   │   ├── services/           # Servicios de Prisma
│   │   ├── middlewares/        # Auth, validación
│   │   └── utils/              # Utilidades
│   ├── tools/
│   │   └── etl/                # Scripts de migración Excel → PostgreSQL
│   ├── tests/                  # Tests (Jest + Supertest)
│   ├── .env.example            # ✅ Variables de entorno documentadas
│   ├── package.json            # ✅ Scripts y dependencias
│   ├── tsconfig.json           # ✅ Configuración TypeScript
│   └── README.md               # ✅ Documentación del backend
│
├── frontend/                   # App Next.js (pendiente scaffold)
│   ├── app/                    # App Router (Next.js 14)
│   ├── components/             # Componentes React
│   ├── lib/                    # Utilidades y servicios
│   ├── public/                 # Assets estáticos
│   ├── .env.local.example      # Variables de entorno frontend
│   ├── package.json
│   ├── tailwind.config.js
│   └── README.md
│
├── docs/                       # Documentación del proyecto
│   ├── data-dictionary.yaml    # ✅ Diccionario de datos maestro
│   ├── conflicts-report.md     # ✅ Análisis de conflictos en datos
│   ├── architecture.md         # Diagramas de arquitectura (pendiente)
│   └── api-spec.md             # Especificación de API (pendiente)
│
├── .gitignore                  # Archivos ignorados por Git
├── README.md                   # ✅ Este archivo
└── package.json                # Scripts de monorepo (raíz)
```

## ✅ Estado Actual (Funcionalidades Implementadas)

### 1. Base de Datos y Schema
- ✅ **Diccionario de Datos** (`docs/data-dictionary.yaml`)
  - Todas las hojas del Excel documentadas
  - Tipos inferidos y mapeados a Prisma
  - Conteos verificados: coinciden con XLSX

- ✅ **Schema Prisma** (`backend/prisma/schema.prisma`)
  - 16 modelos principales implementados
  - 10 enums configurados
  - Índices optimizados para queries comunes
  - Migraciones versionadas y aplicadas

### 2. Backend API REST (JavaScript/Node.js)
- ✅ **Servidor Express** funcionando en puerto 4000
  - Middlewares: Helmet, CORS, Compression
  - Logging con Winston
  - Error handling global
  - Health check endpoint

- ✅ **Endpoints Implementados:**
  - `/api/auth` - Autenticación JWT (login, registro, refresh token)
  - `/api/patients` - CRUD de pacientes
  - `/api/cases` - CRUD de casos de trasplante
  - `/api/preop` - Evaluación preoperatoria y laboratorios
  - `/api/intraop` - Registros intraoperatorios por fase
  - `/api/fluids` - Fluidos y hemoderivados
  - `/api/postop` - Resultados postoperatorios
  - `/api/mortality` - Seguimiento y mortalidad
  - `/api/team` - Equipo quirúrgico
  - `/api/procedures` - Gestión de procedimientos
  - `/api/catalogs` - Catálogos del sistema
  - `/api/clinicians` - Personal médico
  - `/api/admin` - Administración del sistema
  - `/api/files` - Gestión de archivos (uploads con Multer)
  - `/api/exports` - Exportación PDF/CSV

- ✅ **Funcionalidades de Exportación:**
  - Generación de PDF con Puppeteer
  - Exportación CSV (completo, resumen, intraop)
  - Exportación batch de múltiples casos
  - Envío de reportes por email (Nodemailer)
  - Compatibilidad UTF-8/Excel

### 3. ETL y Migración de Datos
- ✅ **Scripts de Importación** (140+ scripts)
  - Migración completa desde Excel a PostgreSQL
  - Importación de pacientes (428 registros)
  - Importación de casos de trasplante (282 registros)
  - Importación de datos preoperatorios con laboratorios
  - Importación de registros intraoperatorios por fase
  - Importación de procedimientos y equipo
  - Importación de mortalidad y seguimiento

- ✅ **Validación e Integridad:**
  - Scripts de validación de datos
  - Limpieza de duplicados
  - Normalización de CIs
  - Verificación de relaciones FK
  - Scripts de análisis y diagnóstico

- ✅ **Sincronización:**
  - Integración con Google Drive API
  - Sincronización de archivos adjuntos
  - ETL incremental con node-cron
  - Validación post-migración automatizada

### 4. Frontend Next.js 14
- ✅ **Arquitectura:**
  - App Router (Next.js 14)
  - React 18 con hooks personalizados
  - Context API para estado global
  - Tailwind CSS para estilos

- ✅ **Módulos Implementados:**
  - Autenticación y autorización
  - Dashboard principal
  - Gestión de pacientes
  - Gestión de casos de trasplante
  - Evaluación preoperatoria
  - Registros intraoperatorios
  - Procedimientos
  - Panel de administración
  - Perfil de usuario

- ✅ **Componentes:**
  - UI components reutilizables
  - Formularios con React Hook Form + Zod
  - Tablas con TanStack Table
  - Layout responsive
  - Componentes específicos por módulo

### 5. Testing y Calidad
- ✅ **Backend:**
  - Jest configurado para tests unitarios
  - Supertest para tests de integración
  - ESLint con reglas de Node.js
  - Prettier para formateo

- ✅ **Frontend:**
  - Playwright para tests E2E
  - ESLint con Next.js config
  - Tests de componentes configurados

### 6. Seguridad y Compliance
- ✅ **Implementado:**
  - Autenticación JWT con refresh tokens
  - Hashing de contraseñas con Bcrypt
  - Validación de datos con Zod
  - Rate limiting configurado
  - Headers de seguridad (Helmet)
  - CORS configurado
  - Logging y auditoría

## 📊 Modelo de Datos (Resumen)

### Entidades Principales

**Patient** (Paciente)
- Clave: CI normalizado
- Datos demográficos básicos
- Relación 1:N con TransplantCase

**TransplantCase** (Caso de Trasplante)
- ID único (cuid)
- Fechas inicio/fin, tiempos de isquemia
- Flags: retrasplante, hepato-renal, donante óptimo

**TeamAssignment** (Equipo Quirúrgico)
- Asignación de roles por caso
- FK a Clinician (catálogo de personal)

**PreopEvaluation** (Evaluación Preoperatoria)
- Scores: MELD, MELD-Na, Child-Pugh
- Comorbilidades cardiovasculares, respiratorias, renales
- Complicaciones de cirrosis

**PreopLabs** (Laboratorios Preoperatorios)
- Hematología, coagulación, bioquímica, función hepática
- Relación 1:N con PreopEvaluation

**IntraopRecord** (Registro Intraoperatorio)
- Snapshots por fase (enum IntraopPhase)
- Ventilación: FiO2, VC, FR, PEEP
- Hemodinamia: FC, SatO2, PAS/PAD/PAm, PVC, PAP
- Monitoreo avanzado: BIS, ICP, SvO2

**FluidsAndBlood** (Fluidos y Hemoderivados)
- Cristaloides, coloides, hemoderivados
- Pérdidas (ascitis, aspirador, gasas, diuresis)
- Balance calculado

**DrugsGiven** (Fármacos Administrados)
- Opiáceos, hipnóticos, relajantes, vasopresores
- Bolos e infusiones continuas

**LinesAndMonitoring** (Líneas y Monitoreo)
- VVC, arteriales, Swan-Ganz
- Vía aérea (Cormack), tipo de anestesia

**PostOpOutcome** (Resultados Postoperatorios)
- Extubación en block, ARM, reintubación
- Complicaciones, estancia CTI/sala

**Mortality** (Mortalidad y Seguimiento)
- Muerte precoz/tardía
- Seguimiento 1, 3, 5 años
- Reingresos

### Catálogos (Enums)
- Sex, ASA, Role, Specialty, Provider
- IntraopPhase, VentilationMode, AirwayGrade
- FunctionalClass

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+ y npm 9+
- PostgreSQL 15+
- Git

### 1. Clonar repositorio

```bash
git clone <url-repo>
cd anestesia-trasplante
```

### 2. Setup Backend

```bash
cd backend

# Instalar dependencias
npm install

# Configurar .env
copy .env.example .env   # Windows
# o
cp .env.example .env     # Linux/Mac

# Editar .env y configurar DATABASE_URL

# Generar Prisma Client
npm run prisma:generate

# Crear BD y ejecutar migraciones
npm run prisma:migrate:dev

# (Opcional) Seed de catálogos
npm run prisma:seed

# Iniciar servidor de desarrollo
npm run dev
```

Servidor corriendo en `http://localhost:3001`

### 3. Verificar Setup

```bash
# Health check
curl http://localhost:3001/health

# Prisma Studio (UI de BD)
npm run prisma:studio
```

### 4. Migración de Datos Excel → PostgreSQL

```bash
# Ejecutar ETL completo
npm run etl:full

# Validar migración
npm run etl:validate
```

## 🧪 Testing

```bash
# Backend
cd backend
npm test

# Tests con cobertura
npm run test:coverage

# Tests de integración
npm run test:int
```

## 📝 Roadmap y Estado del Proyecto

### Fase 1: MVP ✅ COMPLETADA
- ✅ Diccionario de datos
- ✅ Schema Prisma con migraciones
- ✅ Setup backend completo
- ✅ ETL Excel → PostgreSQL (completo con 140+ scripts)
- ✅ APIs REST (todos los módulos implementados)
- ✅ Frontend Next.js (arquitectura y módulos principales)
- ✅ Autenticación JWT con refresh tokens
- ✅ Tests unitarios y de integración configurados

### Fase 2: Paridad Funcional ✅ EN PRODUCCIÓN
- ✅ UI completa (listados, formularios, dashboard)
- ✅ Búsqueda por CI, nombre, fechas
- ✅ Exportación PDF (Ficha de Trasplante con Puppeteer)
- ✅ Exportación CSV/Excel (múltiples formatos)
- ✅ Envío de reportes por email
- ✅ Roles y permisos (RBAC implementado)
- ✅ Gestión de archivos y sincronización con Drive
- ⏳ Auditoría de cambios (parcial - logging implementado)

### Fase 3: Valor Agregado (En planificación)
- ⏳ Firmas digitales
- ⏳ Plantillas y presets
- ⏳ Alertas por umbrales clínicos
- ⏳ Reportes avanzados y analytics
- ⏳ Dashboard de métricas y KPIs
- ⏳ Modo offline (PWA)
- ⏳ Interoperabilidad FHIR
- ⏳ API pública documentada con Swagger

## 🔐 Seguridad

- **Autenticación:** JWT con refresh tokens
- **Autorización:** RBAC (Role-Based Access Control)
- **Datos sensibles:** Cifrado AES-256 para CI
- **Auditoría:** Log de todos los cambios críticos
- **HTTPS:** Obligatorio en producción
- **Rate Limiting:** Protección contra fuerza bruta
- **Cumplimiento:** Ley 18.331 (Habeas Data Uruguay)

## 📚 Documentación Adicional

- [Backend README](backend/README.md) - Setup y API del backend
- [Diccionario de Datos](docs/data-dictionary.yaml) - Estructura de datos completa
- [Reporte de Conflictos](docs/conflicts-report.md) - Análisis de problemas en datos
- [Schema Prisma](backend/prisma/schema.prisma) - Comentado línea por línea

## 🤝 Contribuir

1. Fork del repositorio
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📞 Contacto

**William Baptista**
- Email: baptistaw@gmail.com
- Institución: Programa de Trasplante Hepático - Uruguay

## 📄 Licencia

UNLICENSED - Uso interno exclusivo del programa de trasplante.

---

**Estado del proyecto:** 🟢 En producción (Fase 2 completada - Valor agregado en planificación)

**Servidor backend:** http://localhost:4000 (desarrollo)

**Última actualización:** 2025-11-24
