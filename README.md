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

## ✅ Estado Actual (Entregables Completados)

### 1. Diccionario de Datos
- ✅ `docs/data-dictionary.yaml` - Diccionario maestro completo
  - Todas las hojas del Excel documentadas
  - Tipos inferidos y mapeados a Prisma
  - Dominios, unidades y ejemplos
  - Transformaciones necesarias (SI/NO → boolean, fechas → UTC)
  - Claves primarias y foráneas identificadas
  - Conteos verificados: coinciden con XLSX

### 2. Reporte de Conflictos
- ✅ `docs/conflicts-report.md` - Análisis de problemas en datos
  - 8 duplicados de CI (verificar retrasplantes)
  - 45 formatos de fecha únicos detectados
  - 95 columnas vacías identificadas
  - 20 campos calculados documentados
  - Plan de resolución para cada conflicto
  - Checklist de validación post-ETL

### 3. Schema Prisma
- ✅ `backend/prisma/schema.prisma` - Esquema completo de BD
  - 16 modelos principales (Patient, TransplantCase, PreopEvaluation, etc.)
  - 10 enums (Role, IntraopPhase, VentilationMode, etc.)
  - Índices optimizados:
    - `@@index([patientId, startAt])` en TransplantCase
    - `@@index([caseId, phase, timestamp])` en IntraopRecord
    - `@@index([name])`, `@@index([provider])` en Patient
  - Comentarios /// explicando decisiones clínicas
  - Relaciones 1:N y N:M correctamente definidas
  - Validación: ✅ `prisma validate` pasa sin errores

### 4. Configuración Backend
- ✅ `backend/.env.example` - Plantilla de variables de entorno
  - DATABASE_URL con múltiples opciones (local, Railway, Neon, Azure)
  - JWT, CORS, S3, SMTP configurables
  - Comentarios detallados en español
  - Instrucciones de copiado para Windows

- ✅ `backend/package.json` - Scripts npm completos
  - Scripts de desarrollo: `dev`, `build`, `start`
  - Scripts Prisma: `migrate:dev`, `studio`, `seed`, `reset`
  - Scripts ETL: `etl:full`, `etl:incremental`, `etl:validate`
  - Scripts testing: `test`, `test:watch`, `test:int`
  - Dependencias: Prisma 5, Express, Zod, JWT, xlsx, date-fns-tz

- ✅ `backend/src/app.ts` - Servidor Express funcional
  - Middleware configurado (helmet, cors, compression)
  - Health check con verificación de BD
  - Error handling global
  - Graceful shutdown
  - Logging con Morgan (dev)

- ✅ `backend/tsconfig.json` - Config TypeScript estricta
- ✅ `backend/.gitignore` - Archivos ignorados (node_modules, .env, dist)
- ✅ `backend/README.md` - Documentación completa del backend

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

## 📝 Roadmap

### Fase 1: MVP (En progreso)
- ✅ Diccionario de datos
- ✅ Schema Prisma
- ✅ Setup backend básico
- ⏳ ETL Excel → PostgreSQL
- ⏳ APIs REST (CRUD básico)
- ⏳ Frontend Next.js (scaffold)
- ⏳ Autenticación JWT
- ⏳ Tests unitarios y de integración

### Fase 2: Paridad Funcional
- ⏳ UI completa (listados, formularios)
- ⏳ Búsqueda por CI, nombre, fechas
- ⏳ Exportación PDF (Ficha de Trasplante)
- ⏳ Exportación CSV/Excel
- ⏳ Auditoría de cambios
- ⏳ Roles y permisos (RBAC)

### Fase 3: Valor Agregado
- ⏳ Firmas digitales
- ⏳ Plantillas y presets
- ⏳ Alertas por umbrales
- ⏳ Reportes avanzados
- ⏳ Dashboard de métricas
- ⏳ Modo offline (PWA)
- ⏳ Interoperabilidad FHIR

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

**Estado del proyecto:** 🟡 En desarrollo activo (Fase 1 - MVP)

**Última actualización:** 2025-01-13
