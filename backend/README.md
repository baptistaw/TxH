# Backend - Sistema Registro Anestesiológico TxH

API REST construida con **Node.js**, **Express**, **Prisma** y **PostgreSQL**.

## 🚀 Setup Inicial

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

Editar `.env` y configurar `DATABASE_URL` con tu conexión a PostgreSQL.

### 3. Crear base de datos y ejecutar migraciones

```bash
# Generar cliente Prisma
npm run prisma:generate

# Ejecutar migraciones
npm run prisma:migrate:dev

# (Opcional) Seedear datos iniciales
npm run prisma:seed
```

### 4. Iniciar servidor de desarrollo

```bash
npm run dev
```

El servidor estará corriendo en `http://localhost:3001`

## 📦 Scripts Disponibles

### Desarrollo
- `npm run dev` - Servidor con hot-reload (nodemon + ts-node)
- `npm run prisma:studio` - Abrir Prisma Studio (UI para explorar BD)

### Build y Producción
- `npm run build` - Compilar TypeScript a JavaScript
- `npm start` - Iniciar servidor en producción (requiere build previo)

### Base de Datos
- `npm run prisma:generate` - Generar Prisma Client
- `npm run prisma:migrate:dev` - Crear y aplicar migraciones (dev)
- `npm run prisma:migrate:deploy` - Aplicar migraciones (producción)
- `npm run prisma:reset` - Resetear BD (⚠️ borra todos los datos)
- `npm run db:push` - Push schema sin crear migración
- `npm run db:pull` - Pull schema desde BD existente

### ETL (Migración desde Excel)
- `npm run etl:full` - Migración completa Excel → PostgreSQL
- `npm run etl:incremental` - Migración incremental (solo cambios)
- `npm run etl:validate` - Validar integridad post-migración

### Testing
- `npm test` - Ejecutar tests con coverage
- `npm run test:watch` - Tests en modo watch
- `npm run test:int` - Tests de integración

### Linting y Formato
- `npm run lint` - Linter con ESLint
- `npm run format` - Formatear código (Prettier + Prisma)

## 🗂️ Estructura del Proyecto

```
backend/
├── prisma/
│   ├── schema.prisma          # Esquema de base de datos
│   ├── migrations/            # Migraciones versionadas
│   └── seed.ts                # Datos iniciales (catálogos)
├── src/
│   ├── app.ts                 # Servidor Express principal
│   ├── routes/                # Definición de rutas
│   ├── controllers/           # Lógica de negocio
│   ├── services/              # Servicios (Prisma, externos)
│   ├── middlewares/           # Middlewares (auth, validación)
│   ├── utils/                 # Utilidades
│   └── types/                 # Tipos TypeScript
├── tools/
│   └── etl/                   # Scripts de migración
├── tests/
│   ├── unit/                  # Tests unitarios
│   └── integration/           # Tests de integración
├── .env.example               # Variables de entorno (plantilla)
├── package.json
├── tsconfig.json
└── README.md
```

## 🔐 Seguridad

- **Helmet**: Headers de seguridad HTTP
- **CORS**: Configurado para frontend específico
- **Rate Limiting**: Protección contra fuerza bruta (express-rate-limit)
- **JWT**: Autenticación con tokens (jsonwebtoken)
- **Bcrypt**: Hashing de contraseñas (bcryptjs)
- **Validación**: Zod para inputs
- **Logging**: Winston para registro de eventos

## 📦 Tecnologías Clave Implementadas

### Core
- **Node.js 18+** - Runtime JavaScript
- **Express 4** - Framework web
- **Prisma 5** - ORM para PostgreSQL
- **PostgreSQL 15+** - Base de datos relacional

### Autenticación y Seguridad
- **jsonwebtoken** - JWT para auth
- **bcryptjs** - Hash de contraseñas
- **helmet** - Headers de seguridad
- **express-rate-limit** - Rate limiting
- **cors** - CORS configurado

### Exportación y Reportes
- **Puppeteer** - Generación de PDF
- **json2csv** - Exportación CSV
- **nodemailer** - Envío de emails
- **exceljs** - Lectura/escritura Excel

### Integraciones
- **googleapis** - Google Drive API
- **node-cron** - ETL incremental programado
- **multer** - Upload de archivos

### Utilidades
- **date-fns / date-fns-tz** - Manejo de fechas
- **zod** - Validación de schemas
- **winston** - Logging estructurado
- **morgan** - HTTP request logging
- **compression** - Compresión de responses

### Testing
- **jest** - Framework de testing
- **supertest** - Tests de API HTTP
- **eslint** - Linting
- **prettier** - Formateo de código

## 📊 Prisma Studio

Para explorar la base de datos visualmente:

```bash
npm run prisma:studio
```

Abre en `http://localhost:5555`

## 🧪 Testing

```bash
# Todos los tests
npm test

# Tests con watch
npm run test:watch

# Solo integración
npm run test:int
```

## 📝 Migraciones

### Crear nueva migración

```bash
npx prisma migrate dev --name nombre_descriptivo
```

### Aplicar migraciones en producción

```bash
npm run prisma:migrate:deploy
```

## 🐛 Debugging

### Ver queries de Prisma

En `.env`, agregar:

```
DEBUG=*
```

O en `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  log      = ["query", "info", "warn", "error"]
}
```

## 📚 Documentación API

### Endpoints Implementados

**Base URL:** `http://localhost:4000/api`

#### Autenticación (`/api/auth`)
- `POST /register` - Registrar nuevo usuario
- `POST /login` - Iniciar sesión (devuelve access y refresh tokens)
- `POST /refresh` - Refrescar access token
- `POST /logout` - Cerrar sesión
- `GET /me` - Obtener usuario actual (requiere auth)

#### Pacientes (`/api/patients`)
- `GET /` - Listar pacientes (con paginación, filtros y búsqueda)
- `GET /:ci` - Obtener paciente por CI
- `POST /` - Crear paciente
- `PUT /:ci` - Actualizar paciente
- `DELETE /:ci` - Eliminar paciente

#### Casos de Trasplante (`/api/cases`)
- `GET /` - Listar casos (con filtros y paginación)
- `GET /:id` - Obtener caso completo con relaciones
- `POST /` - Crear caso
- `PUT /:id` - Actualizar caso
- `DELETE /:id` - Eliminar caso
- `GET /patient/:ci` - Casos por paciente

#### Evaluación Preoperatoria (`/api/preop`)
- `GET /case/:caseId` - Obtener evaluación preop de un caso
- `POST /` - Crear evaluación preoperatoria
- `PUT /:id` - Actualizar evaluación
- `GET /:id/labs` - Obtener laboratorios preoperatorios
- `POST /:id/labs` - Agregar laboratorios

#### Registros Intraoperatorios (`/api/intraop`)
- `GET /case/:caseId` - Obtener todos los registros intraop de un caso
- `GET /case/:caseId/phase/:phase` - Registros por fase
- `POST /` - Crear registro intraoperatorio
- `PUT /:id` - Actualizar registro
- `DELETE /:id` - Eliminar registro

#### Fluidos y Hemoderivados (`/api/fluids`)
- `GET /case/:caseId` - Fluidos de un caso
- `POST /` - Registrar fluidos
- `PUT /:id` - Actualizar registro de fluidos
- `GET /case/:caseId/balance` - Calcular balance total

#### Resultados Postoperatorios (`/api/postop`)
- `GET /case/:caseId` - Obtener postoperatorio de un caso
- `POST /` - Crear registro postoperatorio
- `PUT /:id` - Actualizar postoperatorio

#### Mortalidad y Seguimiento (`/api/mortality`)
- `GET /patient/:patientId` - Datos de mortalidad de un paciente
- `POST /` - Registrar seguimiento
- `PUT /:id` - Actualizar seguimiento

#### Equipo Quirúrgico (`/api/team`)
- `GET /case/:caseId` - Equipo asignado a un caso
- `POST /` - Asignar equipo
- `PUT /:id` - Actualizar asignación
- `DELETE /:id` - Eliminar asignación

#### Procedimientos (`/api/procedures`)
- `GET /` - Listar procedimientos
- `GET /:id` - Obtener procedimiento
- `POST /` - Crear procedimiento
- `PUT /:id` - Actualizar procedimiento
- `GET /patient/:patientId` - Procedimientos por paciente
- `GET /clinician/:clinicianId` - Procedimientos por médico

#### Catálogos (`/api/catalogs`)
- `GET /providers` - Prestadores
- `GET /specialties` - Especialidades
- `GET /roles` - Roles de equipo
- `GET /procedure-types` - Tipos de procedimiento
- `GET /drugs` - Catálogo de fármacos

#### Personal Médico (`/api/clinicians`)
- `GET /` - Listar médicos
- `GET /:id` - Obtener médico por ID
- `POST /` - Crear médico
- `PUT /:id` - Actualizar médico

#### Archivos (`/api/files`)
- `POST /upload` - Subir archivo (multipart/form-data)
- `GET /:id` - Descargar archivo
- `DELETE /:id` - Eliminar archivo
- `GET /case/:caseId` - Archivos de un caso
- `POST /sync-drive` - Sincronizar con Google Drive

#### Exportación (`/api/exports`)
- `GET /case/:id/pdf` - Exportar caso como PDF
- `GET /case/:id/csv?format=complete|summary|intraop` - Exportar caso como CSV
- `POST /cases/csv` - Exportar múltiples casos como CSV
- `POST /case/:id/email` - Enviar reporte por email

#### Administración (`/api/admin`)
- `GET /users` - Listar usuarios (admin)
- `PUT /users/:id/role` - Cambiar rol de usuario
- `GET /audit-logs` - Ver logs de auditoría
- `GET /stats` - Estadísticas del sistema

### Autenticación

La mayoría de endpoints requieren autenticación mediante JWT. Incluir el token en el header:

```
Authorization: Bearer <access_token>
```

### Códigos de Respuesta

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

Ver rutas completas en `src/routes/`

## 🚢 Deploy

### Railway.app (Recomendado)

1. Conectar repo de GitHub
2. Configurar variables de entorno
3. Railway detecta automáticamente Node.js
4. Migraciones se ejecutan con `npm run prisma:migrate:deploy`

### Render.com

Similar a Railway, agregar en "Build Command":

```bash
npm install && npm run build && npm run prisma:migrate:deploy
```

### Docker (Opcional)

```bash
docker build -t txh-backend .
docker run -p 3001:3001 --env-file .env txh-backend
```

## 📞 Soporte

William Baptista - baptistaw@gmail.com
