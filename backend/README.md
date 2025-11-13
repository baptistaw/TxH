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
- **Rate Limiting**: Protección contra fuerza bruta
- **JWT**: Autenticación con tokens
- **Bcrypt**: Hashing de contraseñas
- **Validación**: Joi/Zod para inputs

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

(Pendiente: Swagger/OpenAPI)

Ver rutas disponibles en `src/routes/`

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
