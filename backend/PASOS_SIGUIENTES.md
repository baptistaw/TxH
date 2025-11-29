# 📋 Pasos Siguientes - Migración de Datos desde Google Sheets

## ✅ Lo que ya está hecho

1. ✅ Script de test de conexión creado (`scripts/google-sheets-test-connection.js`)
2. ✅ Variables de entorno configuradas en `.env`
3. ✅ `.gitignore` actualizado para proteger credenciales
4. ✅ Dependencia `googleapis` instalada
5. ✅ Documentación completa en `GOOGLE_SHEETS_API_SETUP.md`

---

## 🎯 Lo que TÚ debes hacer ahora

### Paso 1: Crear Service Account en Google Cloud (10 minutos)

#### 1.1 Crear proyecto
- Ve a: https://console.cloud.google.com/
- Clic en "Select a project" → "New Project"
- Nombre: **"TxH-Registro-Migration"**
- Clic en "Create"

#### 1.2 Habilitar Google Sheets API
- Ve a: https://console.cloud.google.com/apis/library
- Busca: **"Google Sheets API"**
- Clic en "Google Sheets API" → "Enable"

#### 1.3 Crear Service Account
- Ve a: https://console.cloud.google.com/iam-admin/serviceaccounts
- Clic en "Create Service Account"
- Nombre: **"txh-sheets-reader"**
- Clic en "Create and Continue"
- Skip permisos (clic en "Continue")
- Clic en "Done"

#### 1.4 Crear y descargar credenciales JSON
- En la lista de service accounts, clic en **txh-sheets-reader**
- Pestaña "Keys" → "Add Key" → "Create new key"
- Tipo: **JSON**
- Clic en "Create"
- Se descargará un archivo `.json` → **Guárdalo**

---

### Paso 2: Configurar el proyecto (2 minutos)

#### 2.1 Copiar archivo de credenciales
```bash
# Desde donde esté tu archivo descargado (ejemplo):
cp ~/Downloads/txh-registro-migration-abc123.json \
   /home/william-baptista/TxH/anestesia-trasplante/backend/google-credentials.json
```

#### 2.2 Obtener ID del Google Sheet
- Abre tu Google Sheet de AppSheet
- Copia el ID de la URL:
  ```
  https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_AQUI/edit
  ```

#### 2.3 Actualizar archivo .env
Edita: `/home/william-baptista/TxH/anestesia-trasplante/backend/.env`

Busca la sección **GOOGLE SHEETS API** y agrega:
```bash
GOOGLE_SHEETS_SPREADSHEET_ID=pega-aqui-el-spreadsheet-id
```

#### 2.4 Compartir el Google Sheet
- Abre el archivo JSON `google-credentials.json`
- Busca el campo `"client_email"`, ejemplo:
  ```
  "client_email": "txh-sheets-reader@txh-registro-migration.iam.gserviceaccount.com"
  ```
- Copia ese email
- Abre tu Google Sheet
- Clic en "Compartir" (botón arriba derecha)
- Pega el email del service account
- Permisos: **Viewer** (Lector)
- **DESMARCA** "Notify people"
- Clic en "Send"

---

### Paso 3: Probar la conexión (1 minuto)

```bash
cd /home/william-baptista/TxH/anestesia-trasplante/backend
node scripts/google-sheets-test-connection.js
```

**Si todo está bien, verás:**
- ✅ Lista de todas las hojas (tabs) de tu Google Sheet
- 📊 Columnas de cada hoja
- 💾 Datos de ejemplo de cada hoja

**Si hay errores:**
- Revisa `GOOGLE_SHEETS_API_SETUP.md` para troubleshooting
- Error 403: El sheet no está compartido con el service account
- Error 404: El Spreadsheet ID es incorrecto

---

## 🚀 Después de probar la conexión

Una vez que el script funcione, te mostrará todas las hojas disponibles.

**Deberás:**
1. Identificar qué hoja tiene los datos de **laboratorios** completos
2. Identificar qué hoja tiene los **exámenes complementarios**
3. Actualizar `.env` con los nombres:
   ```bash
   GOOGLE_SHEETS_TAB_LABS=nombre_hoja_labs
   GOOGLE_SHEETS_TAB_EXAMS=nombre_hoja_exams
   ```

Luego yo crearé los scripts de importación específicos para traer:
- ✅ Hematología completa (Hb, Hto, Plaquetas)
- ✅ Coagulación (TP, INR, Fibrinógeno)
- ✅ Electrolitos (Na, K, Ca iónico, Mg)
- ✅ Función renal (Creatinina, Azotemia, IFG)
- ✅ Función hepática (TGO, TGP, Bilirrubina)
- ✅ Otros (Glicemia, TSH)
- ✅ Exámenes complementarios (ECG, Ecocardiograma, Rx, etc.)

---

## 📞 ¿Necesitas ayuda?

Si tienes dudas en algún paso:
1. Lee `GOOGLE_SHEETS_API_SETUP.md` (guía completa con screenshots conceptuales)
2. Pregúntame específicamente qué paso no te quedó claro
3. Comparte los errores exactos que veas

---

## ⏱️ Tiempo estimado total

- Paso 1 (Google Cloud): **10 minutos**
- Paso 2 (Configuración): **2 minutos**
- Paso 3 (Prueba): **1 minuto**

**Total: ~15 minutos** ⏰

---

## 📋 Checklist rápido

Antes de contactarme de nuevo, verifica que hayas hecho:

- [ ] Proyecto creado en Google Cloud Console
- [ ] Google Sheets API habilitada
- [ ] Service Account creado
- [ ] Archivo JSON descargado
- [ ] Archivo JSON copiado a `google-credentials.json`
- [ ] Spreadsheet ID agregado al `.env`
- [ ] Google Sheet compartido con email del service account
- [ ] Script ejecutado: `node scripts/google-sheets-test-connection.js`
- [ ] Script muestra las hojas correctamente

✅ **Una vez completado el checklist, avísame y continuamos con la importación!**
