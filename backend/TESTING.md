# Testing - Backend TxH

## 🧪 Configuración de Testing

El backend utiliza:
- **Jest** - Framework de testing
- **Supertest** - Tests de integración de API
- **Fixtures** - Datos anonimizados para tests

## 📋 Estructura de Tests

```
backend/
├── src/
│   ├── services/
│   │   └── __tests__/
│   │       └── intraopService.test.js    # Tests unitarios de servicios
│   ├── routes/
│   │   └── __tests__/
│   │       └── intraop.test.js           # Tests de integración de API
│   └── __tests__/
│       └── app.test.js                   # Tests de integración generales
├── tests/
│   ├── setup.js                          # Configuración de Jest
│   ├── fixtures/
│   │   └── testData.js                   # Datos de prueba anonimizados
│   └── helpers/
│       └── dbHelper.js                   # Helpers para tests de BD
└── jest.config.js                        # Configuración de Jest
```

## 🚀 Ejecutar Tests

### Todos los tests

```bash
npm test
```

### Con watch mode

```bash
npm run test:watch
```

### Solo tests de integración

```bash
npm run test:int
```

### Con coverage detallado

```bash
npm test -- --verbose
```

## 📊 Fixtures de Datos

Los tests utilizan datos anonimizados:
- **3 pacientes** de prueba
- **2 casos** de trasplante
- **20 snapshots** intraoperatorios
- **3 clínicos**
- Evaluaciones preop y postop

### Datos de Ejemplo

**Pacientes:**
- Juan Pérez (CI: 12345678) - Trasplante sin complicaciones
- María González (CI: 23456789) - Retrasplante hepato-renal
- Pedro Rodríguez (CI: 34567890)

**Casos:**
1. Caso 1: Juan Pérez, 15/03/2024, 6.5h, 10 snapshots
2. Caso 2: María González, 20/06/2024, 7h, 10 snapshots (retrasplante)

## ✅ Tests Implementados

### Unit Tests - IntraopService

**Tests de listado:**
- ✅ Listar registros intraop por caso
- ✅ Filtrar por fase
- ✅ Retornar array vacío para caso inexistente

**Tests de creación:**
- ✅ Crear registro con cálculo automático de PAm
- ✅ Usar PAm manual si se provee
- ✅ Validar campos requeridos
- ✅ Validar rangos fisiológicos

**Tests de actualización:**
- ✅ Actualizar registro existente
- ✅ Recalcular PAm cuando se actualizan PAS/PAD
- ✅ Error para registro inexistente

**Tests de eliminación:**
- ✅ Eliminar registro correctamente
- ✅ Error para registro inexistente

**Tests especiales:**
- ✅ Duplicar último registro de una fase
- ✅ Obtener estadísticas por fase
- ✅ Cálculo correcto de PAm: `(PAS + 2×PAD) / 3`

### Integration Tests - Intraop API

**Endpoints GET:**
- ✅ `GET /api/intraop` - Listar con filtros
- ✅ `GET /api/intraop/:id` - Obtener por ID
- ✅ `GET /api/intraop/stats/:caseId/:phase` - Estadísticas

**Endpoints POST:**
- ✅ `POST /api/intraop` - Crear registro
- ✅ `POST /api/intraop/duplicate` - Duplicar último

**Endpoints PUT/DELETE:**
- ✅ `PUT /api/intraop/:id` - Actualizar
- ✅ `DELETE /api/intraop/:id` - Eliminar

**Validaciones:**
- ✅ FC: 20-250 bpm
- ✅ PAS: 40-300 mmHg
- ✅ PAD: 20-200 mmHg
- ✅ PEEP: 0-30 cmH₂O
- ✅ FiO₂: 21-100%

### Integration Tests - App

**General:**
- ✅ Health check endpoint
- ✅ API root info
- ✅ 404 handler
- ✅ CORS headers
- ✅ Error handling

**Endpoints principales:**
- ✅ GET /api/cases - Listar casos
- ✅ GET /api/cases/:id - Detalle de caso
- ✅ GET /api/patients - Listar pacientes
- ✅ GET /api/patients/:ci - Paciente por CI
- ✅ Paginación

## 🎯 Cobertura de Tests

El objetivo es mantener **>80% de cobertura** en:
- Servicios (business logic)
- Controladores (API handlers)
- Rutas (endpoints)

### Ver reporte de cobertura

```bash
npm test
# Abre: coverage/lcov-report/index.html
```

## 🔧 Configuración de Jest

**jest.config.js:**
```javascript
{
  testEnvironment: 'node',
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 10000,
  verbose: true
}
```

**tests/setup.js:**
- Mock de logger (evita cluttering de console)
- Variables de entorno para tests
- Timeout global: 10s

## 📝 Escribir Nuevos Tests

### Test Unitario

```javascript
// src/services/__tests__/myService.test.js
const myService = require('../myService');
const { seedTestData, cleanDatabase, closeDatabase } = require('../../../tests/helpers/dbHelper');

describe('MyService', () => {
  let testData;

  beforeAll(async () => {
    testData = await seedTestData();
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  it('should do something', async () => {
    const result = await myService.doSomething();
    expect(result).toBeDefined();
  });
});
```

### Test de Integración

```javascript
// src/routes/__tests__/myRoute.test.js
const request = require('supertest');
const app = require('../../app');

describe('My API Endpoints', () => {
  it('GET /api/my-endpoint should return 200', async () => {
    const response = await request(app).get('/api/my-endpoint');
    expect(response.status).toBe(200);
  });
});
```

## 🐛 Debugging Tests

### Ejecutar test específico

```bash
npx jest intraopService.test.js
```

### Ejecutar con node inspector

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Logs detallados

```bash
npm test -- --verbose --no-coverage
```

## 🔍 Troubleshooting

### "Cannot find module"

```bash
# Regenerar Prisma client
npx prisma generate
```

### "Database connection failed"

```bash
# Verificar DATABASE_URL en .env
echo $DATABASE_URL

# Verificar que PostgreSQL está corriendo
pg_isready
```

### "Tests hang indefinitely"

```bash
# Forzar salida después de tests
npm test -- --forceExit
```

### "Port already in use"

Los tests usan Supertest que no requiere puerto. Si hay conflicto, verificar que no haya proceso del backend corriendo:

```bash
lsof -ti:4000 | xargs kill -9
```

## 🚀 CI/CD

Los tests se ejecutan automáticamente en GitHub Actions en cada push/PR:

```yaml
jobs:
  test:
    - Instala dependencias
    - Genera Prisma client
    - Ejecuta migraciones
    - Corre npm test
    - Sube coverage
```

Ver: `.github/workflows/ci.yml`

## 📚 Mejores Prácticas

1. **Tests independientes**: Cada test debe poder ejecutarse solo
2. **Cleanup**: Siempre limpiar datos después de tests
3. **Fixtures reutilizables**: Usar fixtures compartidos
4. **Descriptivos**: Nombres claros de tests
5. **Aislamiento**: No depender del orden de ejecución
6. **Mocks mínimos**: Preferir integración real cuando sea posible
7. **Fast**: Tests rápidos (<10s total)

## 🔗 Referencias

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing/integration-testing)

---

**¿Problemas con los tests?** Revisa este documento o contacta al equipo de desarrollo.
