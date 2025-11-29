# 🔐 Cómo Crear Service Account para Google Drive

## ⚠️ Importante
**API Keys NO funcionan** para acceder a Google Drive con archivos privados.
Necesitas un **Service Account** (archivo JSON con credenciales completas).

---

## 📝 Pasos Detallados

### 1. Ve a Google Cloud Console
👉 https://console.cloud.google.com/

### 2. Selecciona tu Proyecto "HcenTxH"
- Arriba a la izquierda, verifica que esté seleccionado **"HcenTxH"**

### 3. Ir a Service Accounts
**Opción A - Menú de navegación:**
1. Click en ☰ (menú hamburguesa)
2. **IAM & Admin** → **Service Accounts**

**Opción B - Búsqueda rápida:**
1. Presiona `/` o click en la barra de búsqueda
2. Escribe: "service accounts"
3. Click en **Service Accounts**

### 4. Crear Service Account
1. Click en **+ CREATE SERVICE ACCOUNT** (arriba)

2. **Service account details:**
   - Service account name: `txh-drive-backend`
   - Service account ID: (se genera automático)
   - Description: `Backend access to Google Drive for medical files`
   - Click **CREATE AND CONTINUE**

3. **Grant this service account access to project (opcional):**
   - **SKIP** este paso (no asignar roles)
   - Click **CONTINUE**

4. **Grant users access to this service account (opcional):**
   - **SKIP** este paso
   - Click **DONE**

### 5. Crear Clave JSON (lo más importante)

1. En la lista de Service Accounts, busca `txh-drive-backend`
2. Click en los **tres puntos** (⋮) a la derecha
3. Click en **Manage keys**
4. Click **ADD KEY** → **Create new key**
5. Selecciona **JSON**
6. Click **CREATE**

📥 **Se descargará un archivo JSON** (ejemplo: `hcentxh-1234567890ab.json`)

⚠️ **MUY IMPORTANTE:**
- Este archivo es **muy secreto** - como una contraseña
- Guárdalo en un lugar seguro
- **NUNCA** lo compartas públicamente
- **NUNCA** lo subas a GitHub

### 6. Copiar Email del Service Account

1. En la lista de Service Accounts
2. Busca `txh-drive-backend`
3. **Copia el email** (ejemplo: `txh-drive-backend@hcentxh.iam.gserviceaccount.com`)
4. Lo necesitarás en el siguiente paso

---

## ✅ Verificar que Tienes Todo

Antes de continuar, asegúrate de tener:

- [ ] Archivo JSON descargado (nombre: `hcentxh-*.json`)
- [ ] Email del Service Account copiado
- [ ] Google Drive API habilitada (próximo paso)

---

## 📍 Siguiente Paso

Una vez que tengas el archivo JSON, necesitas:

1. **Renombrarlo** a `google-credentials.json`
2. **Copiarlo** al backend
3. **Habilitar Google Drive API**
4. **Compartir carpeta de Drive** con el Service Account

Avísame cuando tengas el archivo JSON descargado y te guío en los siguientes pasos.
