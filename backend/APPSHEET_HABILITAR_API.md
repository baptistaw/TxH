# 🚀 Cómo Habilitar la API de AppSheet (3 pasos - 2 minutos)

## ⚠️ Problema Actual

La API está configurada pero **no habilitada**. Solo necesitas activar un switch.

Error actual:
```
"The API is not enabled for the called application on the
Editor's Settings > Integrations > In tab."
```

---

## ✅ Solución (2 minutos)

### Paso 1: Abrir tu aplicación en AppSheet

**Opción A** - URL directa:
```
https://www.appsheet.com/start/f51e9707-1bb2-4ac4-bf31-fff6a88327ce
```

**Opción B** - Desde el inicio:
1. Ve a https://www.appsheet.com/
2. Haz login con tu cuenta (baptistaw@gmail.com)
3. Verás tu lista de apps
4. Haz clic en tu app "Registro Anestesiológico" (o el nombre que tenga)

---

### Paso 2: Ir a Settings > Integrations

Una vez dentro del editor de tu app:

1. **En la barra lateral IZQUIERDA**, busca el ícono de engranaje ⚙️ **"Settings"**
   - Haz clic en **Settings**

2. Dentro de Settings, verás varias opciones en la parte superior:
   - General
   - Security
   - **Integrations** ← HAZ CLIC AQUÍ
   - etc.

3. En la página de Integrations, hay 3 pestañas:
   - **"IN: from other platforms, apps, and services"** ← ESTA ES LA QUE NECESITAS
   - "OUT: to other platforms, apps, and services"
   - "Webhooks"

4. Haz clic en la pestaña **"IN: from other platforms, apps, and services"**

---

### Paso 3: Habilitar la API

Dentro de la pestaña "IN":

1. Busca una sección que diga **"Enable API"** o **"API for cloud services"**

2. Verás un **SWITCH/TOGGLE** (botón deslizable):
   ```
   [ ] Enable    o    [X] Enable
   ```

3. **ACTIVA EL SWITCH** (muévelo a la posición "ON" o marcado)

4. Una vez activado, deberías ver:
   - ✅ Un mensaje de "API enabled" o similar
   - 📋 Tus credenciales:
     - **Application ID**: `f51e9707-1bb2-4ac4-bf31-fff6a88327ce`
     - **Application Access Key**: `nMPJR-AYgYZ-9JYi1-R2BTm-WONTJ-iKWSY-GiB7K-5XlIB`

5. **GUARDA** (si hay botón de Save) o simplemente cierra (se guarda automático)

---

## 🧪 Verificar que Funcionó

Después de habilitar la API, ejecuta:

```bash
cd /home/william-baptista/TxH/anestesia-trasplante/backend
node scripts/appsheet-test-connection.js
```

**Resultado esperado:**
- ✅ Conexión exitosa
- 📋 Lista de tablas disponibles
- 📊 Columnas de cada tabla
- 💾 Datos de ejemplo

---

## 🐛 Si No Encuentras la Opción

### Caso 1: No ves "Settings" en la barra lateral

Es posible que estés en la vista de usuario (no en el editor).

**Solución:**
- Haz clic en "Edit" o "Customize"
- Deberías entrar al editor de la app
- Ahí verás Settings en la barra lateral

### Caso 2: No ves la pestaña "IN: from other platforms..."

Algunas versiones de AppSheet tienen la interfaz diferente.

**Busca:**
- "API"
- "Cloud services"
- "Integrations"
- Cualquier cosa que diga "Enable" o "API Key"

### Caso 3: El switch no aparece o está deshabilitado

**Posibles razones:**
1. Tu cuenta de AppSheet no tiene permisos de API
   - Verifica que tengas una cuenta Pro o que la API esté disponible en tu plan
2. La app no está desplegada
   - Haz clic en el botón "Deploy" primero
   - Luego intenta habilitar la API

---

## 📸 Referencia Visual (Ruta de Clics)

```
1. Abrir app
   ↓
2. Settings (⚙️) en barra lateral izquierda
   ↓
3. Integrations (en el menú superior)
   ↓
4. Pestaña "IN: from other platforms..."
   ↓
5. Switch "Enable API" → ACTIVAR
   ↓
6. ✅ Listo!
```

---

## ⏱️ Tiempo Total: 2 minutos

---

## 📞 Si Tienes Problemas

**Toma un screenshot de:**
1. La página de Settings > Integrations
2. Lo que ves en la pestaña "IN"

Y compártelo para ayudarte mejor.

---

## ✅ Checklist

- [ ] Abrí mi app en AppSheet
- [ ] Fui a Settings > Integrations
- [ ] Fui a la pestaña "IN: from other platforms..."
- [ ] Activé el switch "Enable API"
- [ ] Vi mis credenciales (App ID y Access Key)
- [ ] Ejecuté el script de prueba
- [ ] El script mostró las tablas correctamente

**Una vez completado, ejecuta el script de prueba y continuamos!**
