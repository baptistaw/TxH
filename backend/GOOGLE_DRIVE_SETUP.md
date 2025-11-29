# 📁 Configuración de Google Drive como Almacenamiento

## ✅ Ventajas de usar Google Drive

- **Sin costo adicional** - ya tienes los archivos ahí
- **15GB gratis** (cuenta personal) / **Ilimitado** (Google Workspace)
- **Archivos privados y seguros** - acceso controlado por API
- **Sin migración necesaria** - los archivos ya están en Drive
- **Escalable** - añade más espacio cuando lo necesites

---

## 🔧 Pasos de Configuración

### 1. Crear Service Account en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto nuevo o selecciona uno existente
3. Ve a **APIs & Services** → **Credentials**
4. Click en **Create Credentials** → **Service Account**
5. Dale un nombre: `txh-registro-backend`
6. Click **Create and Continue**
7. No asignes roles (skip) → **Done**

### 2. Generar Credenciales JSON

1. Click en el Service Account que acabas de crear
2. Ve a la pestaña **Keys**
3. Click **Add Key** → **Create new key**
4. Selecciona **JSON**
5. Click **Create** - se descargará un archivo JSON

### 3. Guardar Credenciales

1. Renombra el archivo descargado a: `google-credentials.json`
2. Cópialo a la carpeta del backend:
   ```bash
   cp ~/Downloads/txh-registro-*.json /home/william-baptista/TxH/anestesia-trasplante/backend/google-credentials.json
   ```
3. **IMPORTANTE**: Verifica que esté en `.gitignore` (ya debería estar)

### 4. Habilitar Google Drive API

1. En [Google Cloud Console](https://console.cloud.google.com/)
2. Ve a **APIs & Services** → **Library**
3. Busca: **Google Drive API**
4. Click **Enable**

### 5. Compartir Carpeta de Drive con el Service Account

1. Abre el archivo `google-credentials.json`
2. Copia el valor de `client_email` (ejemplo: `txh-registro-backend@proyecto.iam.gserviceaccount.com`)
3. Ve a tu carpeta de Google Drive: [Preoperatorio_Images](https://drive.google.com/drive/folders/122t1N5J3OJY1luatU0V4B5T7Ig3kkRMc)
4. Click derecho → **Compartir**
5. Pega el email del Service Account
6. Permisos: **Lector** (o **Editor** si planeas subir archivos desde el backend)
7. **Desactiva** "Notificar a las personas"
8. Click **Compartir**

### 6. Agregar ID de carpeta al .env

Abre `.env` y agrega:

```bash
# ------------------------------------------------------------------------------
# GOOGLE DRIVE API (ALMACENAMIENTO DE ARCHIVOS)
# ------------------------------------------------------------------------------

# ID de la carpeta donde están los archivos
# Se obtiene de la URL: https://drive.google.com/drive/folders/FOLDER_ID
GOOGLE_DRIVE_FOLDER_ID=122t1N5J3OJY1luatU0V4B5T7Ig3kkRMc

# Ruta a las credenciales (mismas que Google Sheets)
GOOGLE_DRIVE_CREDENTIALS_PATH=./google-credentials.json
```

---

## ✅ Verificar Configuración

Una vez completados los pasos anteriores, ejecuta:

```bash
node scripts/test-google-drive.js
```

Este script verificará:
- ✅ Credenciales válidas
- ✅ Acceso a la carpeta
- ✅ Listar archivos

---

## 🚀 Próximos Pasos

Una vez configurado, ejecutaremos:

1. **Sincronizar archivos** - Mapear archivos de Drive con registros en BD
2. **Actualizar URLs** - Guardar IDs de Drive en la base de datos
3. **Crear endpoint** - Servir archivos desde el backend con autenticación
4. **Testing** - Verificar que todo funcione

---

## 📝 Notas Importantes

- Las credenciales **NUNCA** deben commitearse al repositorio
- El Service Account solo tiene acceso a las carpetas que compartas con él
- Los archivos siguen siendo privados - solo el backend puede accederlos
- Para producción en Render, sube las credenciales como secret en Render

---

## ❓ Troubleshooting

### Error: "The caller does not have permission"
→ Verifica que compartiste la carpeta con el email del Service Account

### Error: "API has not been used"
→ Habilita Google Drive API en Google Cloud Console

### Error: "Invalid credentials"
→ Verifica que el archivo JSON esté en la ruta correcta

---

**¿Listo para continuar?**

Avísame cuando hayas completado estos pasos y probaremos la conexión.
