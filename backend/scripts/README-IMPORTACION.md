# Importación de Datos Históricos

Este documento explica el proceso de importación de datos desde el Excel histórico al sistema de registro anestesiológico.

## 📋 Requisitos

- Excel con datos históricos: `Tablas Sistema Registro.xlsx`
- Base de datos PostgreSQL configurada
- Prisma Client generado

## 🚀 Importación Completa (Recomendado)

Para ejecutar la importación completa de todos los datos:

```bash
node scripts/full-import.js
```

Este script ejecuta automáticamente todos los pasos en el orden correcto:

1. **Limpieza**: Elimina datos existentes
2. **Clínicos**: Importa el equipo médico
3. **Pacientes y casos**: Importa datos demográficos, casos de trasplante, evaluaciones preop, líneas y monitoreo
4. **Registros intraoperatorios**: Importa todos los registros de las 7 fases quirúrgicas
5. **Corrección de fechas**: Ajusta fechas de finalización usando último registro CIERRE
6. **Corrección overnight**: Corrige casos que cruzaron medianoche
7. **Verificación**: Muestra resumen de datos importados

## 📂 Scripts Individuales

### 1. `cleanup-all-data.js`
Elimina todos los datos de la base de datos en el orden correcto para evitar violaciones de llaves foráneas.

```bash
node scripts/cleanup-all-data.js
```

### 2. `import-clinicians.js`
Importa clínicos desde la hoja `DatosTrasplante` del Excel.

```bash
node scripts/import-clinicians.js
```

**Datos importados:**
- CP (Código Personal)
- Nombre
- Especialidad (ANESTESIOLOGO, CIRUJANO, INTENSIVISTA, HEPATOLOGO, COORDINADORA)
- Email (generado automáticamente)

### 3. `import-complete-data.js`
Importa los 25 pacientes más recientes con todos sus datos asociados.

```bash
node scripts/import-complete-data.js
```

**Datos importados:**
- **Pacientes**: Datos demográficos, ASA, lugar de procedencia
- **Casos de trasplante**: Fechas, duración, procedencia, tiempos de isquemia
- **Equipo clínico**: Asignaciones de anestesistas, cirujanos, intensivistas, etc.
- **Líneas y monitoreo**: VVCs, líneas arteriales, Swan-Ganz, vía aérea, equipamiento
- **Evaluación preoperatoria**: MELD, Child-Pugh, etiología, comorbilidades
- **Datos postoperatorios**: Días en CTI, complicaciones, reintervenciones

### 4. `import-intraop-records.js`
Importa registros intraoperatorios de las 7 fases quirúrgicas.

```bash
node scripts/import-intraop-records.js
```

**Fases importadas:**
- INDUCCION
- DISECCION
- ANHEPATICA
- PRE_REPERFUSION
- POST_REPERFUSION
- VIA_BILIAR
- CIERRE

**Datos por registro:**
- Hemodinamia (FC, PA, PVC, SatO2, temperatura)
- Ventilación (modo, FiO2, volumen tidal, FR, PEEP)
- Laboratorio completo (hematología, coagulación, electrolitos, gases, función renal/hepática)
- Fármacos (anestésicos, vasopresores, inotrópicos)
- Fluidos y hemoderivados (cristaloides, coloides, GR, plasma, plaquetas)
- Pérdidas (ascitis, aspirador, gasas, pérdidas insensibles)
- Diuresis

### 5. `fix-end-times.js`
Corrige las fechas de finalización usando el último registro de la fase CIERRE.

```bash
node scripts/fix-end-times.js
```

**Lógica:**
- Para cada caso, busca el último registro intraoperatorio de fase CIERRE
- Asigna esa fecha/hora como `endAt`
- Calcula `duration` = (endAt - startAt) en minutos

### 6. `fix-overnight-cases.js`
Corrige casos que comenzaron en la noche y terminaron en la madrugada del día siguiente.

```bash
node scripts/fix-overnight-cases.js
```

**Lógica:**
- Identifica casos con duración negativa
- Agrega 1 día a la fecha de finalización
- Recalcula la duración

## 📊 Reglas de Importación

### Fechas de Inicio y Fin

1. **Fecha de inicio (`startAt`)**:
   - Se toma del campo `FechaHoraInicio` del Excel
   - Si no está disponible, se usa el timestamp del primer registro de fase INDUCCION

2. **Fecha de fin (`endAt`)**:
   - Se toma del timestamp del **último registro de fase CIERRE**
   - Esta es la regla definitiva aplicada por `fix-end-times.js`

3. **Duración (`duration`)**:
   - Se calcula siempre como `(endAt - startAt)` en minutos
   - Nunca se confía en el campo `Duracion` del Excel

### Datos con Valores por Defecto

- **Fluidos y hemoderivados**: Los campos Int usan `0` como valor por defecto en lugar de `null`
- **Grupo sanguíneo**: Acepta valores como "NO clasificada" (hasta 50 caracteres)
- **Clínicos sin email**: Se genera automáticamente a partir del nombre

## 🔍 Verificación

Después de la importación, verifica los datos:

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  const cases = await prisma.transplantCase.count();
  const negativeDurations = await prisma.transplantCase.count({
    where: { duration: { lt: 0 } }
  });

  console.log(\`Total casos: \${cases}\`);
  console.log(\`Casos con duración negativa: \${negativeDurations}\`);

  await prisma.\$disconnect();
}

verify();
"
```

## ⚠️ Problemas Comunes

### Duración = 0
**Causa**: No hay registros de fase CIERRE para ese paciente
**Solución**: Verificar que el paciente tenga registros intraoperatorios en el Excel

### Duración negativa
**Causa**: Caso que cruzó medianoche pero no se corrigió
**Solución**: Ejecutar `node scripts/fix-overnight-cases.js`

### Datos faltantes
**Causa**: CI del paciente no coincide entre hojas del Excel
**Solución**: Verificar que el CI esté escrito consistentemente en todas las hojas

## 📝 Notas

- El script de importación completa solo importa los **25 pacientes más recientes** con fecha de trasplante
- Los registros intraoperatorios solo se importan para pacientes que ya existen en la base de datos
- Los clínicos deben importarse **antes** que los casos de trasplante
- El equipo clínico se asigna automáticamente al crear cada caso
