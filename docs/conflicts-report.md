# Reporte de Conflictos y Problemas en Datos
## Sistema Registro TxH - Análisis del Excel

**Fecha:** 2025-11-13

---

## 1. Duplicados de CI

**Total encontrados:** 8

### Casos identificados

| Hoja | CI | Ocurrencias |
|------|----|-----------|
| Preoperatorio | 1525080 | 2 |
| Preoperatorio | 1775775 | 2 |
| Preoperatorio | 1784593 | 2 |
| Preoperatorio | 3979140 | 2 |
| Preoperatorio | 4041849 | 2 |
| Preoperatorio | 4291940 | 2 |
| Preoperatorio | 4645745 | 2 |
| Preoperatorio | 5155963 | 2 |

### Plan de resolución

- **Causa probable:** Retrasplantes o múltiples evaluaciones preoperatorias
- **Acción:** 
  1. Verificar si CI duplicados en DatosTrasplante corresponden a retrasplantes (campo Retrasplante=SI)
  2. En Preoperatorio: pueden ser evaluaciones múltiples pre-lista o actualizaciones; tomar la más reciente por Fecha
  3. Crear TransplantCase con ID único (cuid) y relacionar múltiples casos al mismo patientId

---

## 2. Variaciones de Nombres en Equipo

✅ No se encontraron variaciones significativas de nombres.

---

## 3. Formatos de Fecha/Hora Inconsistentes

**Formatos únicos encontrados:** undefined

### Patrones identificados

- **dd/mm/yyyy** (ej: 18/9/2011, 6/4/2017) → formato principal
- **dd/mm/yy** (ej: 12/10/12) → años con 2 dígitos
- **dd/m/yyyy** (ej: 3/4/2017) → día/mes sin cero inicial

### Plan de resolución

1. **Parser robusto:** Usar librería `date-fns` o `dayjs` con múltiples formatos
2. **Zona horaria:** Asumir `America/Montevideo` para fechas sin hora
3. **Conversión:** Todas las fechas → UTC en PostgreSQL (tipo `timestamptz`)
4. **Validación:** Rechazar fechas fuera de rango (1990-2030)
5. **Log de errores:** Registrar filas con fechas inválidas en `/data/logs/etl_errors.json`

---

## 4. Columnas Vacías

**Total:** 95 columnas sin datos

### Listado

- `DatosTrasplante.Equipo`
- `DatosTrasplante.Datos Inic`
- `DatosTrasplante.Vias`
- `DatosTrasplante.Anestesia`
- `DatosTrasplante.Salida`
- `Preoperatorio.Pagina 0`
- `Preoperatorio.Página 1`
- `Preoperatorio.Página 2`
- `Porcedimientos.FechaP`
- `Porcedimientos.Equipo`
- `Porcedimientos.Procedimiento`
- `Porcedimientos.Preoperatorio`
- `Porcedimientos.Intraoperatorio`
- `Porcedimientos.PostOp`
- `IntraopProced.NO `
- `IntraopProced.PatronVent`
- `IntraopProced.Monitoriz`
- `IntraopProced.Farmacos`
- `IntraopProced.Reposicion`
- `IntraopProced.Perdidas`
- `IntraopProced.Paraclinica`
- `IntraopProced.Ca++`
- `IntraopProced.Phv`
- `IntraopProced.PvO2`
- `IntraopProced.PvCO2`
- `IntraopProced.Mg`
- `IntraopProced.Balance`
- `IntraopProced.Actualizar`
- `IntraopInducc.FechaT`
- `IntraopInducc.PatronVent`
- `IntraopInducc.Monitoriz`
- `IntraopInducc.Reposicion`
- `IntraopInducc.Perdidas`
- `IntraopInducc.Farmacos`
- `IntraopInducc.Paraclinica`
- `IntraopInducc.Balance`
- `IntraopInducc.Actualizar`
- `IntraopDisec.FechaT`
- `IntraopDisec.PatronVent`
- `IntraopDisec.Monitoriz`
- `IntraopDisec.Reposicion`
- `IntraopDisec.Perdidas`
- `IntraopDisec.Farmacos`
- `IntraopDisec.Paraclinica`
- `IntraopDisec.Balance`
- `IntraopDisec.Actualizar`
- `IntraopAnhep.FechaT`
- `IntraopAnhep.PatronVent`
- `IntraopAnhep.Monitoriz`
- `IntraopAnhep.Reposicion`
- `IntraopAnhep.Perdidas`
- `IntraopAnhep.Farmacos`
- `IntraopAnhep.Paraclinica`
- `IntraopAnhep.Actualizar`
- `IntraopPreReperf.FechaT`
- `IntraopPreReperf.PatronVent`
- `IntraopPreReperf.Monitoriz`
- `IntraopPreReperf.Reposicion`
- `IntraopPreReperf.Perdidas`
- `IntraopPreReperf.Farmacos`
- `IntraopPreReperf.Paraclinica`
- `IntraopPreReperf.Balance`
- `IntraopPreReperf.Actualizar`
- `IntraopPostRepef.FechaT`
- `IntraopPostRepef.PatronVent`
- `IntraopPostRepef.Monitoriz`
- `IntraopPostRepef.Reposicion`
- `IntraopPostRepef.Perdidas`
- `IntraopPostRepef.Farmacos`
- `IntraopPostRepef.Paraclinica`
- `IntraopPostRepef.Balance`
- `IntraopPostRepef.Actualizar`
- `IntropFinVB.FechaT`
- `IntropFinVB.PatronVent`
- `IntropFinVB.Monitoriz`
- `IntropFinVB.Reposicion`
- `IntropFinVB.Perdidas`
- `IntropFinVB.Farmacos`
- `IntropFinVB.Paraclinica`
- `IntropFinVB.Phv`
- `IntropFinVB.PvO2`
- `IntropFinVB.PvCO2`
- `IntropFinVB.SatVMixta`
- `IntropFinVB.Balance`
- `IntropFinVB.Actualizar`
- `IntraopCierre.FechaT`
- `IntraopCierre.PatronVent`
- `IntraopCierre.Monitoriz`
- `IntraopCierre.Reposicion`
- `IntraopCierre.Perdidas`
- `IntraopCierre.Farmacos`
- `IntraopCierre.Paraclinica`
- `IntraopCierre.Balance`
- `IntraopCierre.Actualizar`
- `PostOp.DiasIntSala`

### Plan de resolución

- ✅ **Incluir en schema como nullable:** Pueden ser campos planificados para futuro
- ⚠️ **No indexar:** Evitar índices en campos siempre NULL
- 📋 **Documentar:** Indicar en diccionario que están vacías actualmente

---

## 5. Campos Calculados en Sheets

**Total:** 20 campos identificados como calculados

### Listado

- `DatosTrasplante.Duracion`
- `DatosTrasplante.Actualizar`
- `Preoperatorio.Actualizar`
- `Porcedimientos.Actualizar`
- `IntraopProced.Balance`
- `IntraopProced.Actualizar`
- `IntraopInducc.Balance`
- `IntraopInducc.Actualizar`
- `IntraopDisec.Balance`
- `IntraopDisec.Actualizar`
- `IntraopAnhep.Balance`
- `IntraopAnhep.Actualizar`
- `IntraopPreReperf.Balance`
- `IntraopPreReperf.Actualizar`
- `IntraopPostRepef.Balance`
- `IntraopPostRepef.Actualizar`
- `IntropFinVB.Balance`
- `IntropFinVB.Actualizar`
- `IntraopCierre.Balance`
- `IntraopCierre.Actualizar`

### Fórmulas identificadas

| Campo | Fórmula | Decisión |
|-------|---------|----------|
| Balance | Reposiciones - Pérdidas | Calcular en backend |
| Duracion | FechaHoraFin - FechaHoraInicio | Calcular en backend |
| PAm | (PAS + 2*PAD) / 3 | Calcular en frontend/backend |
| Edad | FechaTrasplante - FNac | Calcular en queries |
| Actualizar | Trigger de update | Ignorar (usar updatedAt de Prisma) |

### Plan de resolución

1. **No almacenar** valores calculados en BD (principio DRY)
2. **Implementar** cálculos en:
   - Backend: endpoints de API con campos computados
   - Frontend: componentes de visualización
3. **Prisma computed fields** (si disponible en versión futura)
4. **Views de PostgreSQL** para reportes complejos

---

## 6. Problemas Adicionales Detectados

### 6.1 Formato de teléfonos

- **Problema:** Algunos teléfonos en notación científica: `5.98992E+11`
- **Causa:** Excel interpreta números largos como notación científica
- **Solución:** Leer columna Telefono como String y normalizar formato

### 6.2 Campos de equipo en formato "CP: Nombre"

- **Problema:** Campos como `Anestesista 1` contienen: `"70203: William Baptista"`
- **Solución:** Parsear con regex `/^(\d+):\s*(.+)$/` y extraer CP como FK

### 6.3 Unidades implícitas

- **Problema:** Columnas como `FIO2` sin unidad clara (¿0.5 o 50%?)
- **Análisis:** Revisar muestras para determinar si es fracción (0-1) o porcentaje
- **Decisión:** Mantener como fracción (0-1) en BD, mostrar como % en UI

### 6.4 Valores mixtos en columnas numéricas

- **Ejemplo:** Columna puede tener `123`, `N/A`, `---`, `?`
- **Solución:** Normalizar a NULL durante ETL, log de valores inválidos

---

## 7. Recomendaciones Generales

### Prioridad Alta

1. ✅ **Validar duplicados de CI** → verificar retrasplantes
2. ✅ **Parser robusto de fechas** → crítico para integridad temporal
3. ✅ **Normalización de equipo** → evitar FK inválidas

### Prioridad Media

4. ⚠️ **Validación de rangos** → rechazar valores fuera de dominio clínico
5. ⚠️ **Unidades explícitas** → documentar en diccionario
6. ⚠️ **Audit log** → registrar todas las transformaciones del ETL

### Prioridad Baja

7. 📋 **Fuzzy matching nombres** → puede hacerse manualmente inicial
8. 📋 **Columnas vacías** → evaluar eliminarlas en versión futura

---

## 8. Checklist de Validación Post-ETL

- [ ] Conteo de pacientes: 428 en DatosPaciente
- [ ] Conteo de casos: 282 en DatosTrasplante
- [ ] Conteo de equipo: 38 en Clinician
- [ ] CI únicos en Patient: ~412 (algunos duplicados esperados)
- [ ] Todos los CI en TransplantCase existen en Patient
- [ ] Todas las FK de team assignment apuntan a Clinician válidos
- [ ] Fechas en rango 2011-2024
- [ ] Balance calculado = reposiciones - pérdidas (±5ml tolerancia)
- [ ] Campos SI/NO convertidos correctamente a boolean
- [ ] Ningún campo obligatorio (not null) con valores NULL

---

*Documento generado automáticamente. Revisar manualmente antes de implementar ETL.*
