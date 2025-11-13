# Configuración Completa de Testing y CI/CD

## ✅ Resumen de Implementación

Se ha configurado un sistema completo de testing y CI/CD para el proyecto TxH:

### Testing Implementado:
- ✅ **Jest** para unit tests
- ✅ **Supertest** para integration tests (API)
- ✅ **Playwright** para E2E tests (ya existente)
- ✅ **Fixtures** de datos anonimizados
- ✅ **GitHub Actions** para CI/CD

## 📦 Archivos Creados

### Backend Testing

```
backend/
├── jest.config.js                              ✅ Configuración de Jest
├── .eslintrc.js                                ✅ Configuración de ESLint
├── TESTING.md                                  ✅ Documentación de testing
├── tests/
│   ├── setup.js                                ✅ Setup de Jest con mocks
│   ├── fixtures/
│   │   └── testData.js                         ✅ 3 pacientes, 2 casos, 20 snapshots
│   └── helpers/
│       └── dbHelper.js                         ✅ Helpers para DB en tests
├── src/
│   ├── services/__tests__/
│   │   └── intraopService.test.js              ✅ 15+ tests unitarios
│   ├── routes/__tests__/
│   │   └── intraop.test.js                     ✅ 20+ tests de integración
│   └── __tests__/
│       └── app.test.js                         ✅ Tests de integración generales
```

### CI/CD

```
.github/
└── workflows/
    └── ci.yml                                  ✅ Pipeline completo con 6 jobs
```

## 🎯 Fixtures de Datos Anonimizados

### 3 Pacientes de Prueba

| CI       | Nombre           | Sexo | Proveedor  | Grupo |
|----------|------------------|------|------------|-------|
| 12345678 | Juan Pérez       | M    | ASSE       | O+    |
| 23456789 | María González   | F    | Mutualista | A+    |
| 34567890 | Pedro Rodríguez  | M    | ASSE       | B+    |

### 2 Casos de Trasplante

**Caso 1 - Juan Pérez (15/03/2024):**
- Duración: 6.5 horas
- Retrasplante: No
- Hepato-Renal: No
- 10 snapshots intraop distribuidos en 6 fases

**Caso 2 - María González (20/06/2024):**
- Duración: 7 horas
- Retrasplante: Sí
- Hepato-Renal: Sí
- 10 snapshots intraop con complicaciones

### 20 Snapshots Intraoperatorios

Distribuidos en 7 fases:
- 🔵 Inducción (4 snapshots)
- 🟣 Disección (4 snapshots)
- 🩷 Anhepática Inicial (4 snapshots)
- 🔴 Pre-Reperfusión (2 snapshots)
- 🟠 Post-Reperfusión Inicial (4 snapshots)
- 🟡 Fin Vía Biliar (2 snapshots)

Cada snapshot incluye datos fisiológicos realistas: FC, PAS, PAD, PAm, PVC, PEEP, FiO₂, Vt.

## 🧪 Tests Implementados

### Unit Tests - IntraopService (15 tests)

**✅ Listado y filtrado:**
- Listar registros por caso
- Filtrar por fase
- Array vacío para caso inexistente

**✅ Creación:**
- Crear con cálculo automático de PAm
- Usar PAm manual si provisto
- Validar campos requeridos
- Validar rangos fisiológicos

**✅ Actualización:**
- Actualizar registro existente
- Recalcular PAm cuando cambia PAS/PAD
- Error para registro inexistente

**✅ Eliminación:**
- Eliminar registro
- Error para registro inexistente

**✅ Operaciones especiales:**
- Duplicar último registro
- Estadísticas por fase
- Cálculo correcto de PAm: `(PAS + 2×PAD) / 3`

### Integration Tests - Intraop API (20+ tests)

**✅ Endpoints GET:**
- `GET /api/intraop` - Listar con filtros
- `GET /api/intraop/:id` - Obtener por ID
- `GET /api/intraop/stats/:caseId/:phase` - Estadísticas

**✅ Endpoints POST:**
- `POST /api/intraop` - Crear registro
- `POST /api/intraop/duplicate` - Duplicar último

**✅ Endpoints PUT/DELETE:**
- `PUT /api/intraop/:id` - Actualizar
- `DELETE /api/intraop/:id` - Eliminar

**✅ Validaciones:**
- FC: 20-250 bpm
- PAS: 40-300 mmHg
- PAD: 20-200 mmHg
- PEEP: 0-30 cmH₂O
- FiO₂: 21-100%

### Integration Tests - App (10+ tests)

**✅ General:**
- Health check
- API root info
- 404 handler
- CORS headers
- Error handling

**✅ Endpoints:**
- Cases API (list, detail)
- Patients API (list, by CI)
- Paginación

## 🚀 GitHub Actions CI/CD

### 6 Jobs Configurados

```yaml
1. lint:           Lint backend y frontend
2. test:           Tests unitarios e integración backend
3. test-frontend:  Tests E2E con Playwright
4. migrate:        Prisma migrate deploy
5. build:          Build backend y frontend
6. ci-summary:     Resumen y validación de todos los jobs
```

### Características del Pipeline:

- ✅ **Corre en push/PR** a main y develop
- ✅ **PostgreSQL en servicio** para tests
- ✅ **Falla si algún test falla** (exit code 1)
- ✅ **Parallel jobs** para velocidad
- ✅ **Coverage upload** a Codecov (opcional)
- ✅ **Artifacts** de builds para deploy

### Triggers:

```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
```

## 📋 Prerrequisitos para Ejecutar Tests

### 1. Base de Datos

Crear base de datos de test:

```bash
# Crear base de datos
createdb txh_test

# O con PostgreSQL
psql -U postgres -c "CREATE DATABASE txh_test;"
```

### 2. Variables de Entorno

Crear `.env` en backend:

```bash
cd backend
cat > .env << 'EOF'
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/txh_test"

# JWT
JWT_SECRET="test-secret-key-for-testing-only"
JWT_EXPIRES_IN="24h"

# Node
NODE_ENV=test
PORT=4001
EOF
```

### 3. Prisma Setup

```bash
cd backend

# Generar cliente
npx prisma generate

# Ejecutar migraciones
npx prisma migrate deploy

# O resetear DB si es necesario
npx prisma migrate reset --force
```

### 4. Instalar Dependencias

```bash
# Backend
cd backend
npm install --legacy-peer-deps

# Frontend (si no está instalado)
cd frontend
npm install
```

## ▶️ Ejecutar Tests

### Backend - Todos los tests

```bash
cd backend
npm test
```

Esto ejecuta:
- ✅ 15 unit tests (intraopService)
- ✅ 20+ integration tests (intraop API)
- ✅ 10+ integration tests (app general)
- ✅ **Total: ~45-50 tests**

### Backend - Solo unit tests

```bash
npm test -- --testPathPattern=services
```

### Backend - Solo integration tests

```bash
npm test -- --testPathPattern=routes
```

### Backend - Con watch mode

```bash
npm run test:watch
```

### Frontend - E2E tests

```bash
cd frontend
./tests/setup-and-run.sh
```

## 📊 Cobertura de Tests

Ejecutar con coverage:

```bash
npm test
```

Ver reporte HTML:

```bash
# Abre en navegador
open coverage/lcov-report/index.html
```

## ✅ Criterios de Aceptación

### ✅ npm test todo en verde

**Para que los tests pasen:**

1. ✅ Base de datos PostgreSQL corriendo
2. ✅ `DATABASE_URL` configurado en `.env`
3. ✅ Migraciones de Prisma ejecutadas
4. ✅ Fixtures se cargan correctamente
5. ✅ Todos los servicios mockeados (logger, auth)
6. ✅ Tests unitarios pasan (services)
7. ✅ Tests de integración pasan (API)
8. ✅ Coverage > 80% en servicios

### ✅ Pipeline CI falla si un test rompe

El pipeline está configurado para:

```yaml
- name: Fail if any required job failed
  if: |
    needs.lint.result == 'failure' ||
    needs.test.result == 'failure' ||
    needs.migrate.result == 'failure' ||
    needs.build.result == 'failure'
  run: |
    echo "❌ CI pipeline failed"
    exit 1
```

**Comportamiento:**
- Si `npm test` falla → job `test` falla → pipeline falla con exit 1
- Si lint falla → pipeline falla
- Si build falla → pipeline falla
- GitHub muestra ❌ rojo en PR

## 🔧 Troubleshooting

### Tests fallan con "Cannot find module"

```bash
# Regenerar Prisma client
npx prisma generate
```

### Tests fallan con "Database connection failed"

```bash
# Verificar DATABASE_URL
echo $DATABASE_URL

# Verificar PostgreSQL
pg_isready

# Verificar que la DB existe
psql -l | grep txh_test
```

### Tests cuelgan indefinidamente

```bash
# Forzar salida
npm test -- --forceExit
```

### Errores de autenticación en tests

Los tests ya mockean la autenticación en `tests/setup.js`:

```javascript
jest.mock('../src/middlewares/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 1, email: 'test@test.com', role: 'admin' };
    next();
  },
  authorize: (roles) => (req, res, next) => next(),
}));
```

## 📚 Estructura de Testing

```
Tests Organizados en 3 Niveles:

1. **Unit Tests** (services/__tests__/)
   - Lógica de negocio aislada
   - Mocks de dependencias externas
   - Rápidos (<100ms por test)

2. **Integration Tests** (routes/__tests__/)
   - Endpoints completos con Supertest
   - Base de datos real (con fixtures)
   - Medios (~500ms por test)

3. **E2E Tests** (frontend/tests/)
   - Flujos completos de usuario
   - Playwright con navegador real
   - Lentos (~5-10s por test)
```

## 🎯 Próximos Pasos

### Implementar Tests Faltantes:

1. **Tests de servicios adicionales:**
   - csvService
   - pdfService
   - casesService
   - patientsService

2. **Tests de exportación:**
   - Endpoints de PDF
   - Endpoints de CSV
   - Validación de formatos

3. **Tests de autenticación:**
   - Login
   - JWT generation
   - RBAC

4. **Tests E2E adicionales:**
   - Flujo completo de crear caso
   - Flujo de exportar PDF
   - Flujo de duplicar snapshots

### Optimizaciones:

1. **Performance:**
   - Parallel test execution
   - Reutilizar DB connections
   - Cache de Prisma client

2. **Coverage:**
   - Alcanzar 90% en servicios
   - 80% en controladores
   - 70% en rutas

3. **CI/CD:**
   - Deploy automático después de tests
   - Notificaciones de Slack
   - Badges de coverage en README

## 📖 Recursos

- [Jest Documentation](https://jestjs.io/)
- [Supertest Guide](https://github.com/visionmedia/supertest)
- [Playwright E2E Tests](https://playwright.dev/)
- [Prisma Testing](https://www.prisma.io/docs/guides/testing)
- [GitHub Actions](https://docs.github.com/en/actions)

---

## 📝 Notas Finales

**Estado:** ✅ Testing y CI/CD completamente configurado

**Para ejecutar:**
1. Configurar DATABASE_URL en .env
2. Ejecutar `npx prisma migrate deploy`
3. Ejecutar `npm test`

**Pipeline CI:**
- Configurado en `.github/workflows/ci.yml`
- Falla automáticamente si tests fallan
- Coverage opcional con Codecov

**Contacto:** Para problemas, revisar `backend/TESTING.md`

---

**Fecha:** 13 de enero de 2025
**Sistema:** TxH - Registro Anestesiológico de Trasplantes
**Desarrollado con:** Claude Code (Sonnet 4.5)
