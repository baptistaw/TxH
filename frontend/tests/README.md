# Tests E2E con Playwright

Tests end-to-end para el módulo Intraop del sistema TxH.

## 📋 Prerrequisitos

1. **Backend corriendo en puerto 4000**
   ```bash
   cd ../backend
   npm run dev
   ```

2. **Base de datos con datos de prueba**
   - Debe haber al menos un caso de trasplante
   - Usuario admin debe existir (admin@txh.uy / admin123)

3. **Playwright instalado**
   ```bash
   npm install
   npx playwright install
   ```

## 🚀 Ejecutar Tests

### Modo headless (sin ventana)
```bash
npm test
```

### Modo headed (ver el navegador)
```bash
npm run test:headed
```

### Modo UI (interfaz interactiva)
```bash
npm run test:ui
```

## 📝 Tests Implementados

### 1. Verificación de Estructura
- ✅ Muestra todas las 7 fases del intraoperatorio
- ✅ Documentación de atajos de teclado visible
- ✅ Secciones plegables funcionan correctamente

### 2. Crear 2 Snapshots
- ✅ Crear primer registro en fase Inducción
- ✅ Crear segundo registro
- ✅ Verificar que PAm se calcula automáticamente
- ✅ Conteo de registros correcto

### 3. Editar 1 Snapshot
- ✅ Abrir modo edición
- ✅ Modificar valores (FC, PAS, PAD)
- ✅ Guardar cambios
- ✅ Verificar que los cambios persisten

### 4. Validaciones
- ✅ Campos numéricos aceptan solo números
- ✅ PAm se calcula automáticamente (PAS + 2×PAD) / 3
- ✅ Backend valida rangos (20-250 FC, 40-300 PAS, etc.)

### 5. Duplicar Última Fila
- ✅ Crear registro inicial
- ✅ Duplicar última fila
- ✅ Verificar que se copia los valores

### 6. Eliminar Registro
- ✅ Crear registro
- ✅ Confirmar eliminación
- ✅ Verificar que desaparece

## 🎯 Criterios de Aceptación

### ✅ Crear/duplicar/editar/eliminar fila fluye sin errores
- Los 6 tests cubren todas las operaciones CRUD
- Inline editing funciona correctamente
- Atajos de teclado (Ctrl+N, Ctrl+D, Esc) implementados

### ✅ Reglas de validación activas y mensajes claros
- PAm se calcula automáticamente si está vacío
- Backend valida rangos con mensajes claros
- Zod schemas en backend rechazan valores inválidos

## 📊 Reporte de Tests

Después de ejecutar los tests, se genera un reporte HTML:

```bash
npx playwright show-report
```

## 🐛 Troubleshooting

### Tests fallan con "timeout"

**Causa:** Backend o frontend no están corriendo.

**Solución:**
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend (opcional, Playwright lo inicia automáticamente)
cd frontend
npm run dev

# Terminal 3: Tests
cd frontend
npm test
```

### No hay casos en la base de datos

**Causa:** Base de datos vacía.

**Solución:**
```bash
cd backend
# Ejecutar ETL para cargar datos de prueba
npm run etl:full
```

### Usuario admin no existe

**Causa:** No se ha ejecutado el seed.

**Solución:**
Crear usuario manualmente en Prisma Studio o ejecutar seed script.

## 📸 Screenshots

Playwright captura screenshots automáticamente en fallos:
- `test-results/` contiene screenshots de errores
- `playwright-report/` contiene el reporte HTML completo

## 🔄 CI/CD

Para ejecutar en CI (GitHub Actions, GitLab CI, etc.):

```yaml
# .github/workflows/test.yml
name: Playwright Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm test
```

## 📝 Agregar Nuevos Tests

1. Crear archivo `.spec.js` en `tests/`
2. Importar helpers:
   ```javascript
   const { test, expect } = require('@playwright/test');
   ```
3. Usar login helper para autenticación
4. Escribir tests con describe/it
5. Ejecutar y verificar

**Ejemplo:**
```javascript
test('debe hacer algo', async ({ page }) => {
  await page.goto('/ruta');
  await expect(page.locator('selector')).toBeVisible();
});
```

---

**Última actualización:** 2025-01-13
