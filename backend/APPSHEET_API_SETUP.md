# Configuración de AppSheet API para Migración de Datos

## 📋 Objetivo

Conectarnos a la API de AppSheet para extraer los datos completos de laboratorios y exámenes complementarios que no están en el archivo Excel.

---

## 🔑 Paso 1: Obtener Credenciales de AppSheet

### Opción A: API Keys (Recomendado)

1. Ve a [AppSheet Account](https://www.appsheet.com/account/apps)
2. Selecciona tu aplicación de "Registro Anestesiológico TxH"
3. Haz clic en "Manage" > "Integrations"
4. Ve a la sección "IN: from cloud services"
5. Habilita "Enable API"
6. Copia las credenciales:
   - **Application ID** (App ID)
   - **Application Access Key** (API Key)

### Opción B: OAuth 2.0 (Avanzado)

Si tu aplicación requiere OAuth:
1. Ve a "Settings" > "Security"
2. Configura OAuth 2.0
3. Obtén Client ID y Client Secret

---

## ⚙️ Paso 2: Configurar Variables de Entorno

Edita el archivo `.env` y agrega tus credenciales:

```bash
# AppSheet API
APPSHEET_APP_ID=tu-application-id-aqui
APPSHEET_API_KEY=tu-api-key-aqui
APPSHEET_API_URL=https://api.appsheet.com/api/v2
```

**⚠️ IMPORTANTE:**
- Nunca commitees el archivo `.env` al repositorio
- Las credenciales son sensibles - manténlas seguras

---

## 🧪 Paso 3: Probar Conexión

Una vez configuradas las credenciales, ejecuta el script de prueba:

```bash
node scripts/appsheet-test-connection.js
```

Este script:
- ✅ Verifica que las credenciales estén configuradas
- 🔍 Explora las tablas disponibles en AppSheet
- 📊 Muestra las columnas de cada tabla
- 💾 Imprime un registro de ejemplo

---

## 📚 Paso 4: Identificar Tablas

El script de prueba intentará conectarse a estas tablas comunes:

- `Preoperatorio`
- `PreOp`
- `Laboratorios`
- `Labs`
- `DatosLaboratorio`
- `ExamenesComplementarios`
- `Examenes`
- `Estudios`

Una vez que identifiques las tablas correctas, actualiza el `.env`:

```bash
APPSHEET_TABLE_LABS=Laboratorios
APPSHEET_TABLE_EXAMS=ExamenesComplementarios
```

---

## 📖 Documentación Adicional

### Endpoints de AppSheet API

**Find (Buscar registros):**
```javascript
POST /api/v2/apps/{appId}/tables/{tableName}/Action
{
  "Action": "Find",
  "Properties": {
    "Locale": "es-UY",
    "Selector": "Filter(, true)"  // Obtiene todos los registros
  }
}
```

**Add (Agregar registro):**
```javascript
POST /api/v2/apps/{appId}/tables/{tableName}/Action
{
  "Action": "Add",
  "Properties": {},
  "Rows": [
    {
      "campo1": "valor1",
      "campo2": "valor2"
    }
  ]
}
```

**Edit (Editar registro):**
```javascript
POST /api/v2/apps/{appId}/tables/{tableName}/Action
{
  "Action": "Edit",
  "Properties": {},
  "Rows": [
    {
      "_RowNumber": 123,
      "campo1": "nuevo_valor"
    }
  ]
}
```

### Selectores (Filtros)

- `Filter(, true)` - Todos los registros
- `Filter([CI]="12345678")` - Filtrar por CI específico
- `Filter([Fecha]>DATE(2020,1,1))` - Filtrar por fecha
- `Top(Filter(, true), 10)` - Primeros 10 registros

### Headers Requeridos

```javascript
headers: {
  'ApplicationAccessKey': APPSHEET_API_KEY,
  'Content-Type': 'application/json'
}
```

---

## 🔗 Referencias

- [AppSheet API Documentation](https://support.google.com/appsheet/answer/10105769)
- [AppSheet API v2 Reference](https://api.appsheet.com/Documentation/APIv2)
- [AppSheet Expressions](https://help.appsheet.com/en/articles/961695-expressions)

---

## 🐛 Troubleshooting

### Error: "Invalid ApplicationAccessKey"
- Verifica que `APPSHEET_API_KEY` esté correctamente configurado
- Asegúrate de que la API esté habilitada en AppSheet

### Error: "Table not found"
- Verifica el nombre exacto de la tabla en AppSheet
- Los nombres son case-sensitive
- Usa el nombre de la tabla, no el nombre de la vista

### Error: "Rate limit exceeded"
- AppSheet tiene límites de requests por minuto
- Agrega pausas entre peticiones (500ms - 1000ms)

### Error: "Authentication failed"
- Verifica que tu aplicación AppSheet esté publicada
- Verifica que tengas permisos de API en tu cuenta

---

## 📝 Notas

- La API de AppSheet usa POST para todas las operaciones
- Los datos se envían en formato JSON
- Las fechas deben estar en formato ISO 8601 o número serial de Excel
- Los nombres de columnas deben coincidir exactamente con los de AppSheet
