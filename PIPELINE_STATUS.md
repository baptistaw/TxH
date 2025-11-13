# 🔍 Guía para Revisar el Pipeline de GitHub Actions

**Fecha**: 2025-01-13
**Repositorio**: https://github.com/baptistaw/TxH
**Commit**: 37f9884 - "feat: Add complete testing infrastructure with CI/CD pipeline"

---

## 📍 Cómo Acceder al Pipeline

### Opción 1: Interfaz Web de GitHub

1. **Ir al repositorio**:
   ```
   https://github.com/baptistaw/TxH
   ```

2. **Clic en la pestaña "Actions"** (arriba, junto a Pull Requests)

3. **Ver el workflow ejecutándose**:
   - Nombre: "CI Pipeline"
   - Trigger: Push a main
   - Commit: "feat: Add complete testing infrastructure..."

### Opción 2: URL Directa

```
https://github.com/baptistaw/TxH/actions
```

---

## 🎯 Estado Esperado del Pipeline

### Workflow: "CI Pipeline"

El pipeline tiene **6 jobs** que se ejecutarán en este orden:

```
┌─────────────────────────────────────────────────┐
│  Job 1: lint                                    │
│  ✓ ESLint en backend                           │
│  ⏱️  Duración estimada: ~1 minuto               │
└─────────────────────────────────────────────────┘
         │
         ├──────────────────────────────────────┐
         │                                      │
         ▼                                      ▼
┌──────────────────────┐        ┌──────────────────────┐
│  Job 2: test-backend │        │ Job 3: test-frontend │
│  ✓ PostgreSQL 15     │        │ ✓ PostgreSQL 15      │
│  ✓ Migraciones       │        │ ✓ Backend en bg      │
│  ✓ 57 tests          │        │ ✓ Playwright         │
│  ⏱️  ~3-4 min         │        │ ⏱️  ~4-5 min          │
└──────────────────────┘        └──────────────────────┘
         │                                      │
         ▼                                      ▼
┌──────────────────────┐        ┌──────────────────────┐
│ Job 4: build-backend │        │ Job 5: build-frontend│
│  ✓ Prisma generate   │        │ ✓ Next.js build      │
│  ⏱️  ~1 min           │        │ ⏱️  ~2-3 min          │
└──────────────────────┘        └──────────────────────┘
         │                                      │
         └──────────────┬───────────────────────┘
                        ▼
         ┌──────────────────────────┐
         │ Job 6: deploy-check      │
         │  ✓ Verificación final    │
         │  ⏱️  ~10 segundos         │
         └──────────────────────────┘

Total: ~7-10 minutos
```

---

## ✅ Job 1: lint

### Pasos del Job
```yaml
1. Checkout code               ✓
2. Setup Node.js 18            ✓
3. Install dependencies        ✓
4. Run ESLint                  ✓
```

### Estado Esperado
✅ **PASS** - 0 errores, 3 warnings

### Salida Esperada
```
✖ 3 problems (0 errors, 3 warnings)

/backend/src/lib/prisma.js
  48:7  warning  Don't use process.exit()

/backend/src/server.js
  22:3  warning  Don't use process.exit()
  49:3  warning  Don't use process.exit()
```

### Si falla
- Revisar errores de sintaxis
- Verificar reglas de ESLint
- Warnings no causan fallo

---

## ✅ Job 2: test-backend

### Configuración del Job
```yaml
PostgreSQL Service:
  Image: postgres:15
  User: postgres
  Password: postgres
  Database: txh_registro_test
  Port: 5432
  Health Check: Activo ✓
```

### Pasos del Job
```yaml
1. Checkout code               ✓
2. Setup Node.js 18            ✓
3. Install dependencies        ✓
4. Generate Prisma Client      ✓
5. Run Prisma migrations       ⚠️ Requiere migrations/
6. Run tests                   ✓
7. Upload coverage             ✓
```

### Estado Esperado

#### ✅ Si hay migraciones:
```
PASS  src/__tests__/app.test.js
  ✓ Health check (45ms)
  ✓ API root (12ms)
  ✓ Cases API (234ms)
  ...

PASS  src/services/__tests__/intraopService.test.js
  ✓ should list intraop records (67ms)
  ✓ should create with auto-calculated MAP (89ms)
  ...

PASS  src/routes/__tests__/intraop.test.js
  ✓ should create intraop record (123ms)
  ✓ should validate FC range (45ms)
  ...

Tests: 57 passed, 57 total
Coverage: ~70%
```

#### ⚠️ Si NO hay migraciones:
```
Error: P3009

migrate could not find a Prisma Migrate database.
```

**Solución**: Necesitas crear migraciones con:
```bash
cd backend
npx prisma migrate dev --name init
git add prisma/migrations/
git commit -m "feat: Add initial Prisma migrations"
git push
```

---

## ✅ Job 3: test-frontend

### Configuración del Job
```yaml
PostgreSQL Service: ✓
Backend Server: Background process
Playwright: Chromium browser
```

### Pasos del Job
```yaml
1. Checkout code               ✓
2. Setup Node.js 18            ✓
3. Install backend deps        ✓
4. Generate Prisma Client      ✓
5. Run migrations              ⚠️
6. Start backend server        ✓
7. Install frontend deps       ✓
8. Install Playwright          ✓
9. Run Playwright tests        ✓
10. Upload reports             ✓
```

### Estado Esperado
```
Running 8 tests using 1 worker

✓ tests/smoke.spec.js:6:5 › debe cargar la página de login
✓ tests/smoke.spec.js:20:5 › debe mostrar error con credenciales incorrectas
✓ tests/intraop.spec.js:10:5 › debe mostrar página con 7 fases
✓ tests/intraop.spec.js:24:5 › debe crear 2 snapshots
✓ tests/intraop.spec.js:45:5 › debe editar snapshot existente
✓ tests/intraop.spec.js:68:5 › debe validar campos
✓ tests/intraop.spec.js:89:5 › debe duplicar última fila
✓ tests/intraop.spec.js:110:5 › debe eliminar registro

8 passed (45s)
```

---

## ✅ Job 4-6: Build & Deploy Check

### Estados Esperados

**Job 4: build-backend**
```
✓ Dependencies installed
✓ Prisma Client generated
✓ Backend build verification passed
```

**Job 5: build-frontend**
```
Route (app)                Size
┌ ○ /                      1.2 kB
├ ○ /cases                 2.3 kB
├ ○ /cases/[id]            4.5 kB
├ ○ /cases/[id]/intraop    8.7 kB
└ ○ /login                 1.8 kB

✓ Build completed successfully
```

**Job 6: deploy-check**
```
✅ All checks passed!
🚀 Application is ready for deployment
```

---

## 🔴 Posibles Problemas y Soluciones

### Problema 1: "migrate could not find database"

**Causa**: Faltan archivos de migración en `prisma/migrations/`

**Solución**:
```bash
cd backend
npx prisma migrate dev --name init
git add prisma/migrations/
git commit -m "feat: Add initial Prisma migrations"
git push
```

### Problema 2: Tests timeout

**Causa**: Backend tarda en iniciar o tests muy lentos

**Solución**: Ya configurado con timeout de 30 segundos

### Problema 3: Frontend tests fallan

**Causa**: Backend no está disponible o datos no existen

**Solución**: Verificar que seed data se carga correctamente

### Problema 4: Lint falla

**Causa**: Errores de sintaxis o violaciones de estilo

**Solución**: Ejecutar `npm run lint` localmente y arreglar

---

## 📊 Interpretación de Resultados

### ✅ Pipeline PASS (Verde)

```
✓ CI Pipeline
  ├─ ✓ lint (1m 23s)
  ├─ ✓ test-backend (3m 45s)
  ├─ ✓ test-frontend (4m 12s)
  ├─ ✓ build-backend (1m 05s)
  ├─ ✓ build-frontend (2m 34s)
  └─ ✓ deploy-check (8s)

Total: 8m 47s
```

**Significado**:
- ✅ Código sin errores de lint
- ✅ 57 tests backend pasando
- ✅ 8 tests E2E pasando
- ✅ Builds exitosos
- ✅ Listo para deployment

### 🟡 Pipeline PENDING (Amarillo)

```
🟡 CI Pipeline (Running...)
  ├─ ✓ lint (1m 23s)
  ├─ 🔄 test-backend (running...)
  ├─ ⏸️ test-frontend (queued)
  ├─ ⏸️ build-backend (queued)
  ├─ ⏸️ build-frontend (queued)
  └─ ⏸️ deploy-check (queued)
```

**Significado**: Pipeline ejecutándose, esperar...

### ❌ Pipeline FAIL (Rojo)

```
❌ CI Pipeline
  ├─ ✓ lint (1m 23s)
  ├─ ❌ test-backend (2m 15s)
  ├─ ⏸️ test-frontend (skipped)
  ├─ ⏸️ build-backend (skipped)
  ├─ ⏸️ build-frontend (skipped)
  └─ ⏸️ deploy-check (skipped)
```

**Significado**:
- ❌ Hay un error que necesita corrección
- Jobs dependientes se saltaron
- Revisar logs del job fallido

---

## 📸 Cómo Leer los Logs

### En la interfaz de GitHub Actions

1. **Clic en el workflow fallido**
2. **Clic en el job con ❌**
3. **Expandir el step que falló**
4. **Leer el error**

### Ejemplo de Log de Error

```
Run npm test

FAIL src/services/__tests__/intraopService.test.js
  ● IntraopService › create › should validate required fields

    expect(received).rejects.toThrow()

    Received promise resolved instead of rejected
    Resolved to value: {"id": 1, "caseId": null, ...}

      112 |       };
      113 |
    > 114 |       await expect(intraopService.create(data)).rejects.toThrow();
          |             ^
      115 |     });

Error: exit code 1
```

**Interpretación**:
- Test esperaba un error pero pasó
- Validación no está funcionando
- Arreglar en `src/services/intraopService.js`

---

## 🎯 Checklist de Verificación

Al revisar el pipeline, verifica:

- [ ] **Status general**: ✅ Verde, 🟡 Amarillo, o ❌ Rojo
- [ ] **Job lint**: Debe pasar siempre
- [ ] **Job test-backend**: Verificar cobertura >70%
- [ ] **Job test-frontend**: 8 tests deben pasar
- [ ] **Duración total**: < 15 minutos es normal
- [ ] **Artifacts**: Coverage reports disponibles
- [ ] **Badges**: Actualizar README con badges

---

## 📱 Notificaciones

GitHub te notificará automáticamente si:
- ✅ Pipeline pasa exitosamente
- ❌ Pipeline falla
- 🔄 Alguien hace push que afecta tus PRs

### Configurar Notificaciones

1. GitHub > Settings > Notifications
2. Actions > ✓ Enable

---

## 🚀 Próximos Pasos

### Si el Pipeline Pasa ✅

1. **Añadir badge al README**:
   ```markdown
   ![CI Pipeline](https://github.com/baptistaw/TxH/actions/workflows/ci.yml/badge.svg)
   ```

2. **Crear PR para features nuevas**
3. **Monitorear coverage** en Codecov (si está configurado)

### Si el Pipeline Falla ❌

1. **Leer los logs** del job fallido
2. **Reproducir localmente** si es posible
3. **Arreglar el error**
4. **Push de nuevo** (pipeline se re-ejecuta)

---

## 📞 Comandos Útiles

### Ver estado del último workflow (CLI)

```bash
# Con GitHub CLI (gh)
gh workflow view "CI Pipeline"
gh run list --workflow=ci.yml
gh run view --log
```

### Re-ejecutar un workflow fallido

```bash
gh run rerun <run-id>
```

---

## 📊 Resumen

| Aspecto | Estado | Acción |
|---------|--------|--------|
| Workflow configurado | ✅ | Ninguna |
| 6 jobs definidos | ✅ | Ninguna |
| PostgreSQL service | ✅ | Ninguna |
| Triggers activos | ✅ | Ninguna |
| Migraciones | ⚠️ | Crear si es necesario |
| Tests escritos | ✅ | 65 tests listos |

---

**URL para revisar ahora**:
https://github.com/baptistaw/TxH/actions

**Tiempo estimado de ejecución**: 7-10 minutos

**Estado esperado**:
- ✅ Si hay migraciones: Todo pasa
- ⚠️ Si NO hay migraciones: test-backend falla (crear migraciones)

---

**Última actualización**: 2025-01-13
