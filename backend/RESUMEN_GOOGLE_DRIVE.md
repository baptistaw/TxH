# 📁 Resumen: Google Drive como Almacenamiento

## ✅ ¿Por qué Google Drive?

Has decidido usar **Google Drive** como almacenamiento porque:

1. ✅ **Los 287 archivos ya están ahí** - no hay que migrarlos
2. ✅ **Sin costo adicional** - 15GB gratis (suficiente para tus archivos)
3. ✅ **Archivos médicos privados** - acceso controlado por API
4. ✅ **Fácil de administrar** - puedes subir/borrar archivos manualmente
5. ✅ **Funciona en Render** - sin problema con almacenamiento efímero

---

## 📊 Estado Actual

### Archivos Importados en BD:
- **640 referencias** a exámenes complementarios
- **287 con archivos físicos** (en Google Drive)
- **241 solo descripciones** (texto, sin archivo)
- **112 marcados "Normal"** (sin archivo adjunto)

### Ubicación de Archivos:
- **Google Drive**: https://drive.google.com/drive/folders/122t1N5J3OJY1luatU0V4B5T7Ig3kkRMc
- **Carpeta**: `Preoperatorio_Images/`
- **Formato**: Principalmente JPG y PDF

---

## 🚀 Pasos para Activar

### 1. Configurar Google Cloud (15 minutos)

Sigue la guía completa en: **`GOOGLE_DRIVE_SETUP.md`**

**Resumen:**
1. Crear Service Account en Google Cloud Console
2. Descargar credenciales JSON → guardar como `google-credentials.json`
3. Habilitar Google Drive API
4. Compartir carpeta de Drive con email del Service Account

### 2. Probar Conexión

```bash
node scripts/test-google-drive.js
```

Este script verifica:
- ✅ Credenciales válidas
- ✅ Acceso a la carpeta
- ✅ Lista primeros 10 archivos

### 3. Sincronizar Archivos con BD

```bash
node scripts/sync-drive-files.js
```

Este script:
- Lista TODOS los archivos de Google Drive
- Mapea cada archivo con su registro en la BD (por nombre)
- Actualiza las URLs como `gdrive://FILE_ID`
- Muestra estadísticas de sincronización

---

## 🔗 ¿Cómo se Accederán los Archivos?

Hay **3 opciones** para servir los archivos:

### Opción 1: A través del Backend (Recomendado) 🌟

**Ventajas:**
- ✅ Archivos privados - solo usuarios autenticados
- ✅ Control total de acceso
- ✅ Puedes añadir logging/auditoría
- ✅ Puedes cambiar el storage sin cambiar el frontend

**Cómo funciona:**
1. Frontend solicita: `GET /api/files/gdrive/FILE_ID`
2. Backend valida autenticación
3. Backend descarga de Drive y sirve al frontend
4. Usuario ve el archivo

**URL en BD:** `gdrive://FILE_ID`
**Endpoint:** `/api/files/gdrive/:fileId` (pendiente crear)

### Opción 2: Enlaces Públicos de Drive

**Ventajas:**
- ✅ Muy simple
- ✅ No consume recursos del backend
- ✅ Google maneja el ancho de banda

**Desventajas:**
- ❌ Archivos deben ser públicos
- ❌ Sin control de acceso
- ❌ No recomendado para datos médicos

**URL en BD:** `https://drive.google.com/uc?id=FILE_ID`

### Opción 3: Híbrida

- Archivos frecuentes → Backend (control de acceso)
- Archivos grandes/poco frecuentes → Enlaces públicos

---

## 📝 Próximos Pasos

### Ya Completado ✅
- [x] Análisis de archivos
- [x] Configuración de .env
- [x] Script de prueba de conexión
- [x] Script de sincronización

### Pendiente 🔧

#### 1. Configurar Google Cloud (tú)
- [ ] Crear Service Account
- [ ] Descargar credenciales
- [ ] Habilitar Drive API
- [ ] Compartir carpeta

#### 2. Ejecutar Scripts (después de configurar)
```bash
# Probar conexión
node scripts/test-google-drive.js

# Sincronizar archivos
node scripts/sync-drive-files.js
```

#### 3. Crear Endpoint en Backend (yo)
- [ ] Endpoint `/api/files/gdrive/:fileId`
- [ ] Validación de autenticación
- [ ] Descarga y streaming desde Drive
- [ ] Manejo de errores

#### 4. Integrar en Frontend
- [ ] Usar URLs tipo `/api/files/gdrive/FILE_ID`
- [ ] Mostrar en visor de estudios

---

## 💰 Costos

### Google Drive:
- **15GB gratis** (cuenta personal)
- **100GB: $1.99/mes** (Google One)
- **2TB: $9.99/mes**
- **Ilimitado: Google Workspace** (~$12/usuario/mes)

Tus 287 archivos probablemente ocupan **< 5GB** → **GRATIS** ✅

### Render (hosting del backend):
- **No afecta** - Google maneja el storage
- Solo pagas por el backend (ya lo tienes)

---

## 🔒 Seguridad

### Archivos Privados
- ✅ Solo el Service Account tiene acceso
- ✅ Backend valida autenticación antes de servir
- ✅ No hay URLs públicas permanentes

### Credenciales
- ✅ `google-credentials.json` está en `.gitignore`
- ✅ En Render: subir como **Secret File**
- ✅ Nunca commitear al repositorio

### Backups
- ✅ Google Drive hace backups automáticos
- ✅ Puedes descargar todo cuando quieras
- ✅ Versionado de archivos (30 días)

---

## ❓ FAQ

### ¿Puedo cambiar de storage después?
**Sí.** Solo cambia los scripts de sincronización. El frontend no cambia porque usa `/api/files/:id`.

### ¿Qué pasa si muevo archivos en Drive?
**Nada.** Usamos el **File ID** (no la ruta), que nunca cambia.

### ¿Puedo tener archivos en Drive + S3?
**Sí.** Es fácil tener ambos. Puedes migrar gradualmente.

### ¿Cómo subo nuevos archivos?
**Opción 1:** Manualmente a Drive (arrastra y suelta)
**Opción 2:** Desde el backend (crear endpoint de upload)

### ¿Funciona sin internet?
**No.** Google Drive requiere conexión. Para offline necesitarías storage local.

---

## 📞 Siguiente Acción

**Tu turno:**
1. Lee `GOOGLE_DRIVE_SETUP.md`
2. Configura Google Cloud (15 min)
3. Ejecuta `node scripts/test-google-drive.js`
4. Avísame cuando esté listo

**Mi turno:**
1. Crear endpoint `/api/files/gdrive/:fileId`
2. Testing de descarga de archivos
3. Documentación para el frontend

---

¿Listo para empezar? 🚀
