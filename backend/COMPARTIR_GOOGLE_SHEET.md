# 🔓 Cómo Compartir Google Sheet Correctamente

## El Error

Todavía no puedo acceder al Google Sheet. El error es:
```
HTTP 403: Forbidden
```

Esto significa que el sheet NO está configurado como público correctamente.

---

## ✅ Pasos Correctos para Compartir

### 1. Abre el Google Sheet
https://docs.google.com/spreadsheets/d/1H7eDq-eIPoWpLxdGCqjJUb0hJjzyYSUyqRG8YYJRWUQ/edit

### 2. Haz clic en "Compartir"
(Botón azul arriba a la derecha)

### 3. En la ventana que se abre, busca "Acceso general" o "General access"

Debe decir algo como:
```
Acceso general
Restringido - Solo las personas con acceso pueden abrir con el vínculo
```

### 4. Haz clic en "Cambiar" o el dropdown

### 5. Selecciona una de estas opciones:

**Opción A (Recomendada):**
```
✓ Cualquier persona con el vínculo
  Rol: Lector
```

**Opción B:**
```
✓ Cualquiera en Internet
  Rol: Lector
```

### 6. Haz clic en "Listo" o "Done"

### 7. IMPORTANTE: Verifica que cambió

Después de hacer clic en "Listo", deberías ver:
```
Acceso general
Cualquier persona con el vínculo - Lector
```

O un ícono de "🔗" o "🌐" indicando que es público.

---

## 🖼️ Referencia Visual

La configuración correcta se ve así:

```
┌─────────────────────────────────────┐
│  Compartir "Tablas Sistema..."      │
├─────────────────────────────────────┤
│                                     │
│  Acceso general                     │
│  ┌───────────────────────────────┐ │
│  │ Cualquier persona con el      │ │
│  │ vínculo                  [▼]  │ │
│  └───────────────────────────────┘ │
│                                     │
│  Lector  [▼]                        │
│                                     │
│         [Cancelar]  [Listo]         │
└─────────────────────────────────────┘
```

---

## ❌ Configuraciones que NO funcionan

### NO funciona:
```
❌ Restringido
   Solo las personas con acceso pueden abrir con el vínculo
```

### NO funciona:
```
❌ Solo personas específicas pueden acceder
```

---

## ✅ Verificar que Funcionó

Después de cambiar la configuración:

1. **Copia el link del sheet** (el que ya me diste)
2. **Abre una ventana de incógnito** en tu navegador (Ctrl+Shift+N o Cmd+Shift+N)
3. **Pega el link** en la ventana de incógnito
4. **¿Puedes ver el sheet?**
   - ✅ SÍ → Está público, avísame
   - ❌ NO → La configuración no se guardó, intenta de nuevo

---

## 🔄 Alternativa: Exportar a Excel

Si no puedes hacer el sheet público por políticas de tu organización:

1. En el Google Sheet, ve a **Archivo** > **Descargar** > **Microsoft Excel (.xlsx)**
2. Sube el archivo a algún lugar donde yo pueda accederlo
3. O envíamelo y lo subo al servidor

---

## ⏱️ Tiempo: 1 minuto

Una vez que hagas el sheet público correctamente, ejecutaré el script y veremos todas las hojas con sus datos.

---

**Por favor, sigue estos pasos y avísame cuando hayas verificado que funciona en modo incógnito.**
