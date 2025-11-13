# Guía de Testing - Frontend TxH

## 🧪 Tests E2E con Playwright

Esta guía explica cómo ejecutar los tests end-to-end del módulo Intraop y otros componentes.

## 📋 Prerrequisitos

### 1. Backend debe estar corriendo

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Verificar que responde
curl http://localhost:4000/api/health
```

Debería retornar:
```json
{
  "status": "ok",
  "db": true,
  "timestamp": "2025-01-13T...",
  "environment": "development"
}
```

### 2. Base de datos con datos

La base de datos debe tener:
- Al menos 1 caso de trasplante
- Usuario admin (admin@txh.uy / admin123)

Si no hay datos:
```bash
cd backend
npm run etl:full
```

### 3. Playwright instalado

```bash
cd frontend
npm install
npx playwright install chromium
```

## 🚀 Ejecutar Tests

### Opción 1: Script automatizado (Recomendado)

```bash
cd frontend

# Headless (sin ventana)
./tests/setup-and-run.sh

# Con ventana visible
./tests/setup-and-run.sh --headed

# UI interactiva
./tests/setup-and-run.sh --ui
```

### Opción 2: Comandos npm directos

```bash
cd frontend

# Todos los tests
npm test

# Solo smoke tests
npx playwright test smoke.spec.js

# Solo tests de intraop
npx playwright test intraop.spec.js

# Con ventana visible
npm run test:headed

# UI interactiva
npm run test:ui
```

### Opción 3: Ejecutar test específico

```bash
# Solo un test
npx playwright test -g "debe crear 2 snapshots"

# Solo smoke tests
npx playwright test smoke
```

## 📊 Tests Disponibles

### Smoke Tests (smoke.spec.js)

Tests básicos de configuración:
- ✅ Cargar página de login
- ✅ Mostrar error con credenciales incorrectas

**Tiempo estimado:** ~10 segundos

### Intraop Tests (intraop.spec.js)

Tests completos del módulo intraoperatorio:
1. ✅ Mostrar página con 7 fases
2. ✅ Crear 2 snapshots en Inducción
3. ✅ Editar 1 snapshot
4. ✅ Validar campos
5. ✅ Duplicar última fila
6. ✅ Eliminar registro

**Tiempo estimado:** ~2-3 minutos

## 📈 Ver Resultados

### Reporte HTML

Después de ejecutar los tests:

```bash
npx playwright show-report
```

Esto abrirá un navegador con el reporte completo que incluye:
- Tests pasados/fallados
- Screenshots de fallos
- Traces de ejecución
- Tiempo de cada test

### Modo UI (Interactivo)

Para debugging:

```bash
npm run test:ui
```

Permite:
- Ejecutar tests uno por uno
- Ver el navegador en vivo
- Inspeccionar elementos
- Ver logs en tiempo real

## 🐛 Troubleshooting

### Error: "Backend no está corriendo"

**Síntoma:**
```
✗ Backend NO está corriendo
```

**Solución:**
```bash
# Terminal separado
cd backend
npm run dev
```

### Error: "Timeout waiting for selector"

**Síntoma:**
```
TimeoutError: locator.waitFor: Timeout 30000ms exceeded
```

**Causa:** La página no cargó o el selector cambió.

**Solución:**
1. Verificar que el frontend se inicia automáticamente (Playwright lo hace)
2. Aumentar timeout en playwright.config.js si la máquina es lenta
3. Verificar que el selector existe en el código

### Error: "No test found matching"

**Síntoma:**
```
Error: No test found matching...
```

**Causa:** Nombre de archivo o test incorrecto.

**Solución:**
```bash
# Listar todos los tests
npx playwright test --list

# Ejecutar con nombre correcto
npx playwright test intraop.spec.js
```

### Tests muy lentos

**Causa:** Primera ejecución compila Next.js.

**Solución:**
1. La primera ejecución tarda más (~2 minutos)
2. Ejecuciones posteriores son más rápidas (~30 segundos)
3. Usar `--headed` para ver qué está pasando

### Base de datos vacía

**Síntoma:**
```
No hay casos disponibles
```

**Solución:**
```bash
cd backend
npm run etl:full
```

## 📝 Agregar Nuevos Tests

### 1. Crear archivo de test

```javascript
// tests/mi-test.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Mi Funcionalidad', () => {
  test('debe hacer algo', async ({ page }) => {
    await page.goto('/ruta');
    await expect(page.locator('selector')).toBeVisible();
  });
});
```

### 2. Ejecutar

```bash
npx playwright test mi-test.spec.js
```

### 3. Ver reporte

```bash
npx playwright show-report
```

## 🎯 Mejores Prácticas

### 1. Tests deben ser independientes

Cada test debe poder ejecutarse solo:

```javascript
test.beforeEach(async ({ page }) => {
  // Setup específico del test
  await login(page);
});
```

### 2. Usar helpers para código repetitivo

```javascript
// Helper de login
async function login(page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@txh.uy');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/cases');
}
```

### 3. Esperar elementos explícitamente

```javascript
// ❌ Mal
await page.click('button');

// ✅ Bien
await page.locator('button:has-text("Guardar")').click();
await page.waitForSelector('.success-message');
```

### 4. Usar selectores específicos

```javascript
// ❌ Mal (frágil)
await page.click('button');

// ✅ Bien (específico)
await page.click('button[title="Guardar registro"]');
```

## 📊 CI/CD

Para ejecutar en GitHub Actions:

```yaml
# .github/workflows/test.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: |
          cd frontend
          npm ci

      - name: Install Playwright
        run: |
          cd frontend
          npx playwright install --with-deps chromium

      - name: Start backend
        run: |
          cd backend
          npm ci
          npm run dev &
          sleep 5

      - name: Run tests
        run: |
          cd frontend
          npm test

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

## 📸 Screenshots y Videos

Playwright captura automáticamente:

- **Screenshots:** Solo en fallos
- **Videos:** Configurables en playwright.config.js
- **Traces:** Solo en retry

Ubicación:
```
test-results/
├── screenshots/
├── videos/
└── traces/
```

## 🔍 Debugging

### Modo debug

```bash
# Pausar antes de cada acción
npx playwright test --debug

# Pausar en un test específico
npx playwright test --debug -g "debe crear 2 snapshots"
```

### Inspector de Playwright

```bash
npx playwright test --ui
```

Permite:
- Step-by-step execution
- Inspeccionar DOM
- Ver network requests
- Editar selectores en vivo

## ⚡ Performance

### Tips para tests más rápidos

1. **Ejecutar en paralelo:**
   ```javascript
   // playwright.config.js
   workers: 3
   ```

2. **Reusar estado de autenticación:**
   ```javascript
   // global-setup.js
   await login();
   await context.storageState({ path: 'auth.json' });
   ```

3. **Usar headed solo para debugging:**
   ```bash
   npm test  # Headless (rápido)
   npm run test:headed  # Solo cuando hay problemas
   ```

## 📚 Recursos

- [Playwright Docs](https://playwright.dev/docs/intro)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging](https://playwright.dev/docs/debug)
- [Selectors](https://playwright.dev/docs/selectors)

---

**¿Problemas?** Revisa este documento o contacta al equipo de desarrollo.
