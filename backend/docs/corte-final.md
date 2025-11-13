# Procedimiento de Corte Final - Sistema Registro TxH

## 1. Contexto

Durante el período de transición, **AppSheet** y la **nueva aplicación web** coexisten:

- **AppSheet** sigue siendo la fuente de verdad (maestro)
- **Nueva app** lee datos sincronizados desde PostgreSQL
- **ETL incremental** ejecuta cada 6–12 horas vía cron para mantener sincronizados

Este documento describe el procedimiento para el **corte final**: congelar AppSheet y hacer go-live oficial de la nueva aplicación.

---

## 2. Fase de Coexistencia

### 2.1. Configuración del ETL Automático

**Variables de entorno (.env):**

```bash
# Programar ETL cada 12 horas (00:00 y 12:00)
ETL_CRON_SCHEDULE="0 */12 * * *"

# Ejecutar al iniciar el scheduler (opcional)
ETL_RUN_ON_START=true

# Zona horaria
TZ=America/Montevideo
```

**Iniciar el scheduler:**

```bash
npm run etl:cron
```

El proceso muestra:
- Configuración del schedule
- Próximas 5 ejecuciones programadas
- Se mantiene corriendo en background

**Monitoreo:**

- Logs en `data/logs/etl-incremental-YYYY-MM-DDTHH-MM-SS.json`
- Cada log incluye:
  - Pacientes: nuevos, actualizados, sin cambios
  - Casos: nuevos, actualizados, sin cambios
  - Preops: nuevos, actualizados, sin cambios
  - Lista de errores si los hay

### 2.2. Validación Durante Coexistencia

**Después de cada corrida incremental, verificar:**

1. **Contadores razonables:**
   ```bash
   npm run etl:incremental
   ```
   Debería mostrar:
   - Mayormente "sin cambios" (skipped)
   - Pocos "actualizados" (solo lo modificado)
   - Mínimos "nuevos" (casos recién agregados)

2. **Errores mínimos:**
   - Revisar `data/logs/etl-incremental-*.json`
   - Investigar errores recurrentes

3. **Integridad referencial:**
   - Verificar que casos no tengan pacientes huérfanos
   - Confirmar que equipo clínico esté correctamente asignado

---

## 3. Preparación para Corte Final

### 3.1. Checklist Pre-Corte (1–2 semanas antes)

- [ ] **Backend funcionando establemente**
  - Servidor Express corriendo sin crashes
  - Health check responde correctamente
  - Todas las rutas API funcionan

- [ ] **Frontend implementado y testeado**
  - Vistas principales completas
  - Formularios validados
  - Permisos RBAC funcionando

- [ ] **ETL incremental probado exhaustivamente**
  - Simular modificaciones en Excel
  - Verificar que se detecten cambios correctamente
  - Confirmar que no haya duplicados

- [ ] **Usuarios capacitados**
  - Sesiones de training con anestesiólogos
  - Manuales de usuario entregados
  - Ambiente de pruebas (staging) disponible

- [ ] **Plan de rollback definido**
  - Backup completo de PostgreSQL
  - Procedimiento documentado para volver a AppSheet
  - Contactos de soporte técnico

### 3.2. Comunicación

**Avisar a usuarios con 1 semana de anticipación:**

> A partir del [FECHA], el sistema AppSheet dejará de aceptar nuevos registros.
> Todos los datos se migrarán a la nueva plataforma web.
> La nueva aplicación estará disponible en [URL] a partir de las [HORA].

---

## 4. Día del Corte Final

### 4.1. Timeline Recomendado

**Día anterior (Viernes o día no operativo):**
- Notificar usuarios que no ingresen datos nuevos después de las 18:00
- Hacer backup completo de Excel y PostgreSQL

**Día del corte (00:01 AM):**

1. **Congelar AppSheet (00:05 AM)**
   - Deshabilitar permisos de escritura en AppSheet
   - Colocar mensaje: "Sistema en migración, disponible en 2 horas"

2. **Ejecutar ETL final (00:10 AM)**
   ```bash
   npm run etl:full
   ```
   - Este proceso ejecuta una migración completa
   - Toma ~5-10 minutos dependiendo del volumen
   - Revisar logs para verificar que no haya errores críticos

3. **Validar integridad (00:20 AM)**
   ```bash
   npm run etl:validate
   ```
   - Verificar contadores vs Excel:
     ```
     Pacientes en Excel: 150 → PostgreSQL: 150 ✓
     Casos en Excel: 148 → PostgreSQL: 148 ✓
     Preops en Excel: 320 → PostgreSQL: 320 ✓
     ```
   - Si hay discrepancias, investigar antes de continuar

4. **Revisión manual (00:30 AM)**
   - Abrir Prisma Studio: `npm run prisma:studio`
   - Verificar algunos registros críticos:
     - Pacientes recientes
     - Casos con fechas futuras
     - Evaluaciones preoperatorias actualizadas

5. **Detener ETL automático (00:45 AM)**
   - Matar el proceso de `npm run etl:cron`
   - Ya no es necesario sincronizar con Excel

6. **Deploy de producción (01:00 AM)**
   - Frontend: Deploy a hosting (Vercel, Netlify, etc.)
   - Backend: Asegurar que esté corriendo en servidor de producción
   - Base de datos: PostgreSQL con configuración de producción

7. **Smoke tests (01:30 AM)**
   - Login con usuarios de diferentes roles
   - Crear un registro de prueba
   - Editar un caso existente
   - Generar reporte básico
   - Verificar permisos RBAC

8. **Go-live (02:00 AM)**
   - Enviar email a usuarios con URL y credenciales
   - Publicar anuncio en canales oficiales
   - Estar disponible para soporte durante el día

---

## 5. Monitoreo Post-Corte

### Primer día (intensivo)

- [ ] Monitorear logs del servidor cada 2 horas
- [ ] Responder consultas de usuarios inmediatamente
- [ ] Verificar que no haya errores 500
- [ ] Confirmar que autenticación funciona correctamente
- [ ] Revisar performance de queries lentas

### Primera semana

- [ ] Reunión diaria con usuarios para feedback
- [ ] Identificar bugs o UX issues
- [ ] Aplicar hotfixes si es necesario
- [ ] Documentar issues conocidos

### Primer mes

- [ ] Reunión semanal de retrospectiva
- [ ] Evaluar si hay necesidad de capacitación adicional
- [ ] Implementar mejoras prioritarias
- [ ] Planificar roadmap de funcionalidades

---

## 6. Rollback (Solo si es necesario)

**Escenario de emergencia:** Falla crítica que impide operar.

### 6.1. Decisión de Rollback

**Criterios para ejecutar rollback:**
- Sistema completamente inaccesible por >1 hora
- Pérdida de datos detectada
- Bug crítico que impide registrar casos de trasplante
- Rechazo masivo de usuarios (>70% no puede usar el sistema)

**NO hacer rollback por:**
- Bugs menores de UI
- Performance lenta (optimizable)
- Confusión de usuarios (solucionable con capacitación)

### 6.2. Procedimiento de Rollback

1. **Anunciar rollback (inmediato):**
   - Email urgente a usuarios
   - Deshabilitar acceso a nueva app

2. **Restaurar AppSheet (15 minutos):**
   - Reactivar permisos de escritura en AppSheet
   - Confirmar que todos los usuarios puedan acceder

3. **Sincronizar cambios (30 minutos):**
   - Si hubo registros en la nueva app durante el corte:
     ```bash
     # Exportar datos nuevos de PostgreSQL
     npm run export:new-records
     # Importar manualmente a Excel
     ```
   - Validar que no haya pérdida de información

4. **Post-mortem (24 horas después):**
   - Identificar causa raíz del problema
   - Planificar solución
   - Definir nueva fecha de corte

---

## 7. Respaldos

### 7.1. Antes del Corte

**Backup de Excel:**
```bash
cp data/raw/Tablas\ Sistema\ Registro.xlsx \
   data/backups/Tablas_Sistema_Registro_PRE_CORTE_$(date +%Y%m%d).xlsx
```

**Backup de PostgreSQL:**
```bash
# Dump completo
pg_dump txh_registro > backups/txh_registro_pre_corte_$(date +%Y%m%d).sql

# Dump comprimido
pg_dump txh_registro | gzip > backups/txh_registro_pre_corte_$(date +%Y%m%d).sql.gz
```

### 7.2. Durante Operación Normal

**Backups automáticos diarios:**
- PostgreSQL: Configurar pg_cron o servicio de hosting
- Retención: 30 días mínimo
- Almacenamiento: Cloud (AWS S3, Google Cloud Storage)

---

## 8. Contactos de Soporte

| Rol | Nombre | Email | Teléfono | Disponibilidad |
|-----|--------|-------|----------|----------------|
| Tech Lead | William Baptista | baptistaw@gmail.com | - | 24/7 durante corte |
| DBA | [Nombre] | [email] | [tel] | On-call |
| Product Owner | [Nombre] | [email] | [tel] | Horario laboral |
| Usuario clave (Anestesiólogo) | [Nombre] | [email] | [tel] | Horario laboral |

---

## 9. Criterios de Éxito

**El corte se considera exitoso si:**

1. ✅ Todos los datos migrados correctamente (100% de registros)
2. ✅ Usuarios pueden hacer login sin problemas
3. ✅ Se puede crear/editar/eliminar registros sin errores
4. ✅ Reportes generan datos correctos
5. ✅ No hay quejas mayores de performance
6. ✅ RBAC funciona según lo especificado
7. ✅ Cero pérdida de datos

**Métricas a monitorear:**
- Tiempo de respuesta promedio de API < 500ms
- Uptime > 99.5% primera semana
- Tasa de error < 1%
- Adopción de usuarios > 80% al final del primer mes

---

## 10. Resumen Ejecutivo

### Cronograma

| Fase | Duración | Actividades Clave |
|------|----------|-------------------|
| Coexistencia | 2–4 semanas | ETL incremental cada 12h, capacitación usuarios |
| Pre-corte | 1 semana | Checklis completado, backups, comunicación |
| Corte | 2 horas | Congelar AppSheet, ETL final, validación, go-live |
| Post-corte | 1 mes | Monitoreo intensivo, soporte, mejoras |

### Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Pérdida de datos durante migración | Baja | Crítico | Backups completos, validación exhaustiva |
| Usuarios no adoptan nueva app | Media | Alto | Capacitación previa, soporte activo |
| Bug crítico en producción | Media | Alto | Smoke tests, rollback preparado |
| Performance insuficiente | Baja | Medio | Load testing previo, optimización de queries |

---

**Última actualización:** 2025-01-13
**Versión:** 1.0
**Autor:** William Baptista
