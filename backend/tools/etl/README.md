# ETL - Excel a PostgreSQL

Pipeline idempotente para migrar datos desde Excel al sistema nuevo.

## 📁 Estructura

```
tools/etl/
├── sheetsToPg.js       # ETL completo (migración inicial)
├── incrementalJob.js   # ETL incremental (sincronización periódica)
├── cronScheduler.js    # Scheduler con node-cron
├── startCron.js        # CLI para iniciar scheduler automático
├── changeDetector.js   # Detecta cambios entre Excel y BD
├── helpers.js          # Funciones auxiliares (normalización, parseo)
└── README.md           # Esta documentación

data/
├── raw/                # Entrada: colocar aquí "Tablas Sistema Registro.xlsx"
└── logs/               # Salida: logs de errores y ejecuciones
```

## 🚀 Uso

### 1. Preparación

Colocar el archivo Excel en la carpeta correcta:

```bash
# Copiar Excel a la carpeta de entrada
cp "/ruta/al/Tablas Sistema Registro.xlsx" data/raw/
```

### 2. Ejecutar ETL completo (migración inicial)

```bash
npm run etl:full
```

Este comando migra **todos** los datos desde Excel a PostgreSQL. Usar para:
- Primera carga de datos
- Reset completo de la base de datos
- Después de cambios estructurales en el esquema

### 3. Ejecutar ETL incremental (sincronización manual)

```bash
npm run etl:incremental
```

Este comando procesa **solo los cambios** detectados:
- Compara Excel vs BD usando timestamps y campos clave
- Actualiza solo registros modificados
- Crea registros nuevos
- Ignora registros sin cambios (mucho más rápido)

### 4. Iniciar scheduler automático (período de coexistencia)

```bash
npm run etl:cron
```

Inicia un proceso que ejecuta el ETL incremental automáticamente cada 6-12 horas.

**Configuración en `.env`:**

```bash
# Cada 12 horas (00:00 y 12:00)
ETL_CRON_SCHEDULE="0 */12 * * *"

# Ejecutar al iniciar (opcional)
ETL_RUN_ON_START=true

# Zona horaria
TZ=America/Montevideo
```

**Monitoreo:**
- El proceso muestra las próximas 5 ejecuciones programadas
- Logs guardados en `data/logs/etl-incremental-TIMESTAMP.json`
- Presionar Ctrl+C para detener el scheduler

## 🔄 Funcionamiento

### Orden de procesamiento

1. **Equipo** → `Clinician` (con deduplicación)
2. **DatosPaciente** → `Patient`
3. **DatosTrasplante** → `TransplantCase`
4. **Preoperatorio** → `PreopEvaluation` + `PreopLabs` (TODO)
5. **Intraop*** → `IntraopRecord`, `FluidsAndBlood`, `DrugsGiven` (TODO)
6. **PostOp** → `PostOpOutcome` (TODO)
7. **Mortalidad** → `Mortality` (TODO)

### Transformaciones aplicadas

#### CI (Cédula de Identidad)

- Normalización: remover puntos, guiones, ceros iniciales
- Preservar original en `ci_raw`
- Ejemplo: `1.234.567` → `1234567`

#### Fechas

- Parseo flexible: `dd/mm/yyyy`, `d/m/yyyy`, `dd/mm/yy`
- Conversión: `America/Montevideo` → `UTC`
- Ejemplo: `18/9/2011` (MVD) → `2011-09-18T03:00:00.000Z` (UTC)

#### Booleanos

- Conversión: `SI`/`NO` → `true`/`false`
- También reconoce: `SÍ`, `YES`, `1`, `0`, `TRUE`, `FALSE`

#### Equipo (formato "CP: Nombre")

- Parseo: `"70203: William Baptista"` → `{ cp: 70203, name: "William Baptista" }`
- Extracción del CP como FK a `Clinician`

### Detección de cambios (ETL incremental)

El `changeDetector.js` determina qué registros necesitan actualización usando una estrategia de prioridad:

#### Prioridad 1: Timestamps

Si el Excel tiene columna `lastUpdated` o similar:

```javascript
if (excelRow.lastUpdated > dbRecord.updatedAt) {
  // Actualizar
}
```

#### Prioridad 2: Campos clave

Si no hay timestamps, comparar campos críticos:

- **Pacientes**: nombre, FNR, fecha de nacimiento
- **Casos**: fecha fin, duración, tiempos de isquemia
- **Preops**: MELD, Child, etiología

#### Resultado

```javascript
{
  needsUpdate: true/false,
  isNew: true/false,
  existing: dbRecord | null
}
```

**Ventajas:**
- ETL incremental es ~10x más rápido que ETL completo
- Solo actualiza lo necesario
- Registros sin cambios se ignoran (skip)
- Logs detallados de qué cambió

## 🔧 Idempotencia

El ETL es **idempotente**: ejecutarlo múltiples veces NO duplica datos.

### Estrategias por entidad

- **Clinician**: `upsert` por `id` (CP)
- **Patient**: `upsert` por `id` (CI normalizado)
- **TransplantCase**: buscar por `patientId` + `startAt`, crear solo si no existe

### Re-ejecutar

Es seguro re-ejecutar el ETL después de:

- Correcciones en Excel
- Fallos parciales
- Agregar registros nuevos

## 📊 Reporte

### ETL Completo

Al finalizar, muestra:

```
═══════════════════════════════════════════════════════════
RESUMEN ETL
═══════════════════════════════════════════════════════════
Clínicos:  38/38 insertados
Pacientes: 412/428 insertados
Casos:     282/282 insertados
Errores:   16
```

### ETL Incremental

Muestra estadísticas detalladas por entidad:

```
═══════════════════════════════════════════════════════════
RESUMEN ETL INCREMENTAL
═══════════════════════════════════════════════════════════
Duración: 3.45s

Pacientes: 2 nuevos, 5 actualizados, 421 sin cambios
Casos: 1 nuevo, 3 actualizados, 278 sin cambios
Preops: 0 nuevos, 2 actualizados, 318 sin cambios

Errores: 0
```

### Logs

**ETL completo:**
```
data/logs/etl-errors-YYYY-MM-DD.json
```

**ETL incremental:**
```
data/logs/etl-incremental-YYYY-MM-DDTHH-MM-SS.json
```

Formato del log incremental:

```json
{
  "stats": {
    "patients": {
      "checked": 428,
      "updated": 5,
      "created": 2,
      "skipped": 421
    },
    "cases": { "..." },
    "startTime": "2025-01-13T12:00:00.000Z",
    "endTime": "2025-01-13T12:00:03.450Z"
  },
  "errors": [
    {
      "sheet": "DatosPaciente",
      "row": 15,
      "error": "CI inválido",
      "ci": "ABC123"
    }
  ]
}
```

## 🗺️ Mapa manual de clínicos

Para resolver duplicados por variaciones de nombre, crear:

```
docs/clinicians-map.csv
```

Formato:

```csv
nombreVariante,cpCanónico
"Dr. William Baptista",70203
"W. Baptista",70203
"Karina M. Rando",111
```

El ETL usará este mapa para consolidar nombres similares al mismo CP.

## ⚠️ Manejo de errores

El ETL continúa procesando aunque encuentre errores en filas individuales.

### Errores comunes

1. **CI inválido**: fila sin CI o formato incorrecto
   - Solución: verificar formato en Excel

2. **Paciente no existe**: caso referencia CI que no está en DatosPaciente
   - Solución: completar datos del paciente primero

3. **Fecha inválida**: formato no reconocido
   - Solución: usar formato `dd/mm/yyyy`

4. **FK inválida**: referencia a Clinician que no existe
   - Solución: agregar clínico en hoja Equipo

## 🧪 Validación post-ETL

Después del ETL, verificar con Prisma Studio:

```bash
npm run prisma:studio
```

O con queries SQL:

```sql
-- Conteos
SELECT 'Clinician' as tabla, COUNT(*) as total FROM clinicians
UNION ALL
SELECT 'Patient', COUNT(*) FROM patients
UNION ALL
SELECT 'TransplantCase', COUNT(*) FROM transplant_cases;

-- Pacientes sin casos
SELECT p.id, p.name
FROM patients p
LEFT JOIN transplant_cases tc ON tc."patientId" = p.id
WHERE tc.id IS NULL;

-- Casos huérfanos (sin paciente)
SELECT tc.id, tc."patientId"
FROM transplant_cases tc
LEFT JOIN patients p ON p.id = tc."patientId"
WHERE p.id IS NULL;
```

## 📝 TODOs

- [x] Agregar modo incremental (solo registros nuevos/modificados)
- [x] Agregar scheduler automático con node-cron
- [x] Agregar detección de cambios con timestamps y campos clave
- [ ] Implementar procesamiento completo de Preoperatorio (labs)
- [ ] Implementar procesamiento de Intraop* (todas las fases)
- [ ] Implementar procesamiento de PostOp
- [ ] Implementar procesamiento de Mortalidad
- [ ] Agregar validación de integridad referencial
- [ ] Agregar cálculo de campos derivados (balance, PAm, etc.)

## 🤝 Soporte

Si el ETL falla:

1. Revisar log de errores en `data/logs/`
2. Verificar que el Excel esté en `data/raw/`
3. Verificar conexión a PostgreSQL (`.env`)
4. Verificar que existan las tablas (ejecutar migraciones)
