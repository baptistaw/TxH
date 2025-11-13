# Guía de Testing - Sistema Registro TxH

## 📋 Resumen

Este proyecto tiene una estrategia de testing completa que incluye:

- **Tests Unitarios**: Servicios y lógica de negocio (Jest)
- **Tests de Integración**: APIs REST (Supertest)
- **Tests E2E**: Flujos completos de usuario (Playwright)
- **CI/CD**: GitHub Actions con validación automática

## 🎯 Cobertura de Tests

### Backend (Jest + Supertest)

✅ **Tests Unitarios** (`src/**/__tests__/`)
- `intraopService.test.js` - 18 tests de lógica de negocio
- Validación de cálculos (MAP automático)
- Validación de rangos fisiológicos
- CRUD de registros intraoperatorios

✅ **Tests de Integración** (`src/**/__tests__/`)
- `app.test.js` - 11 tests de endpoints generales
- `intraop.test.js` - 21 tests de API intraoperatoria
- Validaciones de request/response
- Manejo de errores
- Autenticación y autorización (mockeada)

### Frontend (Playwright)

✅ **Tests E2E** (`frontend/tests/`)
- `smoke.spec.js` - 2 tests de smoke
- `intraop.spec.js` - 6 tests del módulo intraoperatorio
  - Crear 2 snapshots
  - Editar snapshot existente
  - Validaciones de campos
  - Duplicar última fila
  - Eliminar con confirmación

## 🔧 Setup de Tests

### Prerrequisitos

- Node.js 18+
- PostgreSQL 15+ (para tests de integración)
- npm 9+

### 1. Backend Tests

#### Opción A: Configuración Automática (Recomendado)

```bash
cd backend

# Ejecutar script de setup (crea BD de test y migraciones)
chmod +x scripts/test-setup.sh
./scripts/test-setup.sh

# Ejecutar tests
npm test
```

#### Opción B: Configuración Manual

```bash
cd backend

# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno de test
cp .env.test .env.test.local  # Opcional: personalizar

# 3. Crear base de datos de test
createdb txh_registro_test

# 4. Ejecutar migraciones
npx prisma migrate deploy

# 5. Generar Prisma Client
npx prisma generate

# 6. Ejecutar tests
npm test
```

### 2. Frontend Tests (E2E)

```bash
cd frontend

# 1. Instalar dependencias
npm install

# 2. Instalar navegadores de Playwright
npx playwright install chromium

# 3. Asegurarse que el backend esté corriendo
# En otra terminal:
cd backend && npm run dev

# 4. Ejecutar tests E2E
npx playwright test

# 5. Ver reporte HTML
npx playwright show-report
```

### 3. Tests Completos (Backend + Frontend)

```bash
# Desde la raíz del proyecto

# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend tests
cd frontend
npm test  # Si existe script de test

# O ejecutar ambos con script de automatización
# (A implementar)
```

## 🧪 Fixtures de Datos

Los tests usan datos anonimizados predefinidos:

**3 Pacientes:**
- Juan Pérez (CI: 12345678)
- María González (CI: 23456789)
- Pedro Rodríguez (CI: 34567890)

**2 Casos de Trasplante:**
- Caso 1: Juan Pérez (trasplante sin complicaciones)
- Caso 2: María González (retrasplante hepato-renal)

**20 Snapshots Intraoperatorios:**
- 10 snapshots por caso
- Distribuidos en 7 fases quirúrgicas
- Valores fisiológicos realistas

📁 Ubicación: `backend/tests/fixtures/testData.js`

## 📊 Scripts de Test Disponibles

### Backend

```json
{
  "test": "jest --coverage",
  "test:watch": "jest --watch",
  "test:int": "jest --testPathPattern=tests/integration",
  "test:unit": "jest --testPathPattern=__tests__"
}
```

### Frontend

```json
{
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:debug": "playwright test --debug"
}
```

## 🚀 CI/CD con GitHub Actions

El workflow `.github/workflows/ci.yml` ejecuta automáticamente:

### Jobs del Pipeline

1. **lint** - Validación de código con ESLint
2. **test-backend** - Tests unitarios e integración
3. **test-frontend** - Tests E2E con Playwright
4. **build-backend** - Verificación de build
5. **build-frontend** - Build de Next.js
6. **deploy-check** - Verificación final

### Triggers

- Push a `main` o `develop`
- Pull Requests a `main` o `develop`

### Base de Datos en CI

El workflow usa PostgreSQL en Docker:

```yaml
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: txh_registro_test
```

### Variables de Entorno en CI

```yaml
env:
  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/txh_registro_test
  NODE_ENV: test
  JWT_SECRET: test-secret-for-ci
```

## ✅ Criterios de Aceptación

### Para que el CI pase:

1. ✅ `npm run lint` sin errores
2. ✅ `npm test` (backend) - todos los tests en verde
3. ✅ `npx playwright test` - todos los tests E2E pasan
4. ✅ `npm run build` (frontend) - build exitoso
5. ✅ Cobertura de código > 70% (recomendado)

### Métricas de Calidad

- **Backend Tests**: 50+ tests
- **Frontend E2E**: 8+ tests
- **Cobertura**: Reportada en cada PR
- **Performance**: Tests completan en < 5 min

## 🔍 Debugging de Tests

### Backend (Jest)

```bash
# Ejecutar un test específico
npm test -- intraopService.test.js

# Modo watch
npm run test:watch

# Ver solo failures
npm test -- --onlyFailures

# Verbose output
npm test -- --verbose
```

### Frontend (Playwright)

```bash
# Modo UI interactivo
npx playwright test --ui

# Modo debug paso a paso
npx playwright test --debug

# Ejecutar un test específico
npx playwright test tests/smoke.spec.js

# Ver trace de un test fallido
npx playwright show-trace
```

## 🐛 Troubleshooting

### Error: "Database connection failed"

**Causa**: PostgreSQL no está corriendo o credenciales incorrectas

**Solución**:
```bash
# Verificar que PostgreSQL está corriendo
pg_isready

# Verificar que la BD de test existe
psql -l | grep txh_registro_test

# Si no existe, crearla
createdb txh_registro_test
```

### Error: "Prisma Client not generated"

**Causa**: Falta generar el cliente de Prisma

**Solución**:
```bash
cd backend
npx prisma generate
```

### Error: "Port 4000 already in use"

**Causa**: Backend ya está corriendo en otro proceso

**Solución**:
```bash
# Encontrar y matar el proceso
lsof -ti:4000 | xargs kill -9

# O usar otro puerto en .env.test
PORT=4001 npm test
```

### Tests E2E fallan con timeout

**Causa**: Backend no está corriendo o tarda en iniciar

**Solución**:
```bash
# Aumentar timeout en playwright.config.js
timeout: 120000,  // 2 minutos

# O iniciar backend manualmente antes de tests
cd backend && npm run dev
```

## 📈 Roadmap de Testing

### Corto Plazo
- [x] Tests unitarios de intraop
- [x] Tests de integración API
- [x] Tests E2E básicos
- [x] CI/CD con GitHub Actions

### Mediano Plazo
- [ ] Tests de otros servicios (patients, cases, preop, postop)
- [ ] Tests de autenticación real (JWT)
- [ ] Tests de performance/load
- [ ] Visual regression testing

### Largo Plazo
- [ ] Tests de mutación (Stryker)
- [ ] Contract testing (Pact)
- [ ] Chaos engineering
- [ ] Performance budgets

## 📚 Recursos

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Playwright Documentation](https://playwright.dev/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)

## 🤝 Contribuir con Tests

Al agregar nuevas funcionalidades:

1. **Escribir tests primero** (TDD recomendado)
2. **Mantener cobertura > 70%**
3. **Documentar casos edge**
4. **Actualizar fixtures si es necesario**
5. **Verificar que CI pase** antes de merge

---

**Última actualización**: 2025-01-13
**Mantenido por**: William Baptista
