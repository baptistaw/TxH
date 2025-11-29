# Configuración de Google Sheets API

## 📋 Objetivo

Conectarnos directamente a Google Sheets para extraer los datos completos de laboratorios y exámenes complementarios.

---

## 🔑 Paso 1: Crear Proyecto en Google Cloud Console

### 1. Ve a Google Cloud Console
- Abre https://console.cloud.google.com/

### 2. Crea un Nuevo Proyecto
- Haz clic en el menú desplegable del proyecto (arriba a la izquierda)
- Haz clic en "New Project" o "Nuevo Proyecto"
- Nombre: **"TxH-Registro-Migration"**
- Haz clic en "Create" / "Crear"

---

## 🔧 Paso 2: Habilitar Google Sheets API

### 1. Habilitar la API
- Ve a https://console.cloud.google.com/apis/library
- Busca "Google Sheets API"
- Haz clic en "Google Sheets API"
- Haz clic en "Enable" / "Habilitar"

### 2. Habilitar Google Drive API (opcional pero recomendado)
- Busca "Google Drive API"
- Haz clic en "Google Drive API"
- Haz clic en "Enable" / "Habilitar"

---

## 🔐 Paso 3: Crear Service Account (Cuenta de Servicio)

### 1. Crear Service Account
- Ve a https://console.cloud.google.com/iam-admin/serviceaccounts
- Haz clic en "Create Service Account" / "Crear cuenta de servicio"
- Nombre: **"txh-sheets-reader"**
- ID: txh-sheets-reader (se genera automático)
- Descripción: "Lectura de datos de Google Sheets para migración"
- Haz clic en "Create and Continue" / "Crear y continuar"

### 2. Otorgar Permisos (Skip - no necesario para esta tarea)
- Haz clic en "Continue" / "Continuar"

### 3. Finalizar
- Haz clic en "Done" / "Listo"

---

## 🔑 Paso 4: Crear Credenciales (JSON Key)

### 1. Crear Clave
- En la lista de Service Accounts, haz clic en la cuenta recién creada
- Ve a la pestaña "Keys" / "Claves"
- Haz clic en "Add Key" / "Agregar clave"
- Selecciona "Create new key" / "Crear clave nueva"
- Tipo: **JSON**
- Haz clic en "Create" / "Crear"

### 2. Descargar el Archivo
- Se descargará automáticamente un archivo `.json`
- Ejemplo: `txh-registro-migration-abc123def456.json`
- **Guarda este archivo en un lugar seguro**

---

## 📂 Paso 5: Configurar el Proyecto

### 1. Copiar el Archivo de Credenciales
Copia el archivo JSON descargado al proyecto:

```bash
# Desde donde esté el archivo descargado, cópialo a:
/home/william-baptista/TxH/anestesia-trasplante/backend/google-credentials.json
```

### 2. Actualizar .gitignore
El archivo `.gitignore` ya debería tener esta línea (verificar):
```
google-credentials.json
*.json
```

### 3. Configurar Variables de Entorno
Edita el archivo `.env` y agrega:
```bash
GOOGLE_SHEETS_CREDENTIALS_PATH=./google-credentials.json
GOOGLE_SHEETS_SPREADSHEET_ID=tu-spreadsheet-id-aqui
```

---

## 🔗 Paso 6: Obtener el Spreadsheet ID

### 1. Abre tu Google Sheet
- Abre la hoja de cálculo que contiene tus datos en Google Sheets

### 2. Copia el ID de la URL
La URL tiene este formato:
```
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=0
```

Ejemplo:
```
https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
```
El Spreadsheet ID es: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

### 3. Actualizar .env
Pega el ID en el archivo `.env`:
```bash
GOOGLE_SHEETS_SPREADSHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
```

---

## 🔓 Paso 7: Compartir el Sheet con la Service Account

### 1. Copiar el Email de la Service Account
Del archivo JSON descargado, busca el campo `client_email`:
```json
{
  "client_email": "txh-sheets-reader@txh-registro-migration.iam.gserviceaccount.com",
  ...
}
```

### 2. Compartir el Google Sheet
- Abre tu Google Sheet
- Haz clic en "Share" / "Compartir" (botón arriba a la derecha)
- Pega el email de la service account
- Permisos: **Viewer** / **Lector** (solo lectura es suficiente)
- Haz clic en "Send" / "Enviar"
- **IMPORTANTE**: Desmarca "Notify people" para no enviar email

---

## 📦 Paso 8: Instalar Dependencias

```bash
cd /home/william-baptista/TxH/anestesia-trasplante/backend
npm install googleapis
```

---

## 🧪 Paso 9: Probar Conexión

Una vez configurado todo, ejecuta:

```bash
node scripts/google-sheets-test-connection.js
```

Este script:
- ✅ Verificará que las credenciales estén configuradas
- 🔍 Listará todas las hojas (sheets/tabs) disponibles
- 📊 Mostrará las columnas de cada hoja
- 💾 Imprimirá registros de ejemplo

---

## 📖 Estructura del Archivo de Credenciales

El archivo JSON tiene este formato:
```json
{
  "type": "service_account",
  "project_id": "txh-registro-migration",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "txh-sheets-reader@txh-registro-migration.iam.gserviceaccount.com",
  "client_id": "123456789...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
}
```

---

## 🔗 Referencias

- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [Google Sheets API Node.js Quickstart](https://developers.google.com/sheets/api/quickstart/nodejs)
- [Service Account Authentication](https://cloud.google.com/iam/docs/service-accounts)

---

## 🐛 Troubleshooting

### Error: "Permission denied"
- Verifica que hayas compartido el Google Sheet con el email de la service account
- Asegúrate de que el email sea exactamente el mismo del archivo JSON

### Error: "File not found"
- Verifica que el archivo `google-credentials.json` esté en la ruta correcta
- Verifica que la variable `GOOGLE_SHEETS_CREDENTIALS_PATH` apunte al archivo

### Error: "Invalid credentials"
- Verifica que el archivo JSON no esté corrupto
- Re-descarga el archivo desde Google Cloud Console si es necesario

### Error: "Spreadsheet not found"
- Verifica que el Spreadsheet ID sea correcto
- Verifica que el sheet esté compartido con la service account

---

## ✅ Checklist

Antes de probar la conexión, verifica:

- [ ] Proyecto creado en Google Cloud Console
- [ ] Google Sheets API habilitada
- [ ] Service Account creada
- [ ] Archivo JSON de credenciales descargado
- [ ] Archivo copiado a `google-credentials.json` en el proyecto
- [ ] Spreadsheet ID obtenido y configurado en `.env`
- [ ] Google Sheet compartido con el email de la service account
- [ ] Dependencias instaladas (`npm install googleapis`)
