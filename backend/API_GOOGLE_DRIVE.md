# 📁 API de Archivos - Google Drive

## ✅ Endpoints Disponibles

Los archivos de estudios preoperatorios almacenados en Google Drive ahora están accesibles a través de la API.

---

## 🔐 Autenticación

Todos los endpoints requieren autenticación mediante JWT:

```http
Authorization: Bearer <token>
```

---

## 📋 Endpoints

### 1. Obtener Archivo de Estudio Preoperatorio

**Descarga directa del archivo desde Google Drive**

```http
GET /api/files/preop/:attachmentId
```

**Parámetros:**
- `attachmentId` - ID del `PreopAttachment` en la base de datos

**Respuesta:**
- Stream del archivo (imagen, PDF, etc.)
- Headers:
  - `Content-Type`: Tipo MIME del archivo
  - `Content-Disposition`: inline; filename="..."
  - `Content-Length`: Tamaño del archivo

**Ejemplo:**
```javascript
// En el frontend
const response = await fetch('/api/files/preop/cm123abc456', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const blob = await response.blob();
const url = URL.createObjectURL(blob);

// Mostrar imagen
<img src={url} alt="Estudio" />

// O descargar
const a = document.createElement('a');
a.href = url;
a.download = 'estudio.jpg';
a.click();
```

---

### 2. Obtener Información del Archivo (Metadata)

**Retorna metadata sin descargar el archivo**

```http
GET /api/files/preop/:attachmentId/info
```

**Respuesta:**
```json
{
  "id": "cm123abc456",
  "type": "Ecocardiograma",
  "fileName": "Preoperatorio_Images/1363601210-22-2019.Informe Eco.043354.jpg",
  "description": "Informe Ecocardiograma",
  "uploadedAt": "2025-11-20T04:00:00.000Z",
  "patient": {
    "name": "Ariel Estella",
    "ci": "13636012"
  },
  "drive": {
    "id": "1oyuSMcyzeWPHioG_YwFoYohJg_pesBlz",
    "name": "1363601210-22-2019.Informe Eco.043354.jpg",
    "mimeType": "image/jpeg",
    "size": "95432",
    "viewUrl": "https://drive.google.com/file/d/1oyuSMcyzeWPHioG_YwFoYohJg_pesBlz/view",
    "downloadUrl": "/api/files/preop/cm123abc456"
  }
}
```

**Uso:**
- Mostrar preview/thumbnails
- Verificar tamaño antes de descargar
- Obtener link de Google Drive

---

### 3. Descargar Archivo Directamente por Drive ID

**Para casos especiales donde ya tienes el Drive ID**

```http
GET /api/files/gdrive/:fileId
```

**Parámetros:**
- `fileId` - ID del archivo en Google Drive

**Respuesta:**
- Stream del archivo

**Ejemplo:**
```javascript
// Si tienes el drive ID directamente
fetch('/api/files/gdrive/1oyuSMcyzeWPHioG_YwFoYohJg_pesBlz', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

---

## 🎯 Casos de Uso Comunes

### Caso 1: Mostrar Lista de Estudios

```javascript
// 1. Obtener evaluación preoperatoria con estudios
const response = await fetch('/api/preop/:preopId', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const preop = await response.json();

// 2. Mostrar lista de estudios
preop.attachments.forEach(attachment => {
  console.log({
    type: attachment.type,
    description: attachment.description,
    downloadUrl: `/api/files/preop/${attachment.id}`
  });
});
```

### Caso 2: Viewer de Imágenes

```javascript
// Componente React
function ImageViewer({ attachmentId }) {
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    async function loadImage() {
      const response = await fetch(`/api/files/preop/${attachmentId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
    }

    loadImage();

    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [attachmentId]);

  return imageUrl ? <img src={imageUrl} /> : <p>Cargando...</p>;
}
```

### Caso 3: Descargar Archivo

```javascript
async function downloadFile(attachmentId, fileName) {
  const response = await fetch(`/api/files/preop/${attachmentId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}
```

### Caso 4: Previsualización con Metadata

```javascript
async function showPreview(attachmentId) {
  // Primero obtener metadata
  const infoResponse = await fetch(`/api/files/preop/${attachmentId}/info`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const info = await infoResponse.json();

  // Mostrar información
  console.log(`Tipo: ${info.type}`);
  console.log(`Tamaño: ${(info.drive.size / 1024).toFixed(2)} KB`);
  console.log(`Paciente: ${info.patient.name}`);

  // Decidir si descargar basado en tamaño
  if (info.drive.size < 5000000) { // < 5MB
    // Descargar y mostrar
    const fileResponse = await fetch(info.drive.downloadUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    // ...
  } else {
    // Ofrecer link a Drive
    window.open(info.drive.viewUrl, '_blank');
  }
}
```

---

## 🔒 Seguridad

✅ **Archivos Privados:**
- Solo usuarios autenticados pueden acceder
- Los archivos NO son públicos en Google Drive
- Backend actúa como proxy seguro

✅ **Control de Acceso:**
- JWT requerido en todos los endpoints
- Logs de acceso a archivos
- Auditoría de quién accede qué archivo

✅ **HTTPS:**
- En producción, todo debe ser HTTPS
- Las credenciales de Google nunca se exponen al cliente

---

## ⚡ Rendimiento

**Streaming:**
- Los archivos se transmiten (stream) desde Drive
- No se cargan completamente en memoria
- Eficiente para archivos grandes

**Caching (opcional):**
- El navegador puede cachear archivos
- Headers `Cache-Control` pueden agregarse si es necesario

**CDN (futuro):**
- Si el tráfico aumenta, considerar CloudFlare en front

---

## 🐛 Manejo de Errores

### 404 - Archivo no encontrado

```json
{
  "error": "Estudio no encontrado"
}
```

### 400 - URL inválida

```json
{
  "error": "Archivo no disponible en Drive"
}
```

### 403 - Sin permisos en Drive

```json
{
  "error": "No permission to access file"
}
```

### 500 - Error de Drive

```json
{
  "error": "Error downloading file"
}
```

---

## 📝 Notas para el Frontend

### URLs de Archivos

En la BD, las URLs están guardadas como:
```
gdrive://1oyuSMcyzeWPHioG_YwFoYohJg_pesBlz
```

**NO uses estas URLs directamente en `<img>` o `<a>`**

En su lugar:
```javascript
// ❌ NO HACER
<img src={attachment.url} />

// ✅ HACER
<img src={`/api/files/preop/${attachment.id}`} />
```

### Tipos de Archivos

Los estudios pueden ser:
- Imágenes: `image/jpeg`, `image/png`
- PDFs: `application/pdf`
- Otros documentos

Verifica el `mimeType` en la metadata para mostrar el viewer apropiado.

---

## 🚀 En Producción (Render)

### Variables de Entorno

Asegúrate de configurar en Render:

```bash
GOOGLE_DRIVE_FOLDER_ID=122t1N5J3OJY1luatU0V4B5T7Ig3kkRMc
GOOGLE_DRIVE_CREDENTIALS_PATH=./google-credentials.json
```

### Subir Credenciales

En Render:
1. Ve a tu servicio → **Environment** → **Secret Files**
2. Agrega archivo: `google-credentials.json`
3. Contenido: Pega el contenido del archivo JSON

---

## ✅ Testing

Endpoints de prueba:

```bash
# Obtener info de un archivo
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/files/preop/ATTACHMENT_ID/info

# Descargar archivo
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/files/preop/ATTACHMENT_ID \
  --output test.jpg
```

---

**¿Dudas?** Los endpoints están documentados en el código con JSDoc.
