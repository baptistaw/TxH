# Plan de Normalización de Datos

## Objetivo
Convertir campos múltiples (etiology1/2, cvc1/2/3, etc.) en relaciones normalizadas con tablas de catálogos.

## Campos Identificados para Normalización

### 1. Etiologías (PreopEvaluation)
**Estado actual:**
- `etiology1: String?`
- `etiology2: String?`

**Estado deseado:**
- Tabla `Etiology` con catálogo de etiologías
- Relación muchos-a-muchos `PreopEtiologies`

**Valores encontrados:** 65 etiologías únicas

### 2. Líneas Vasculares y Arteriales (LinesAndMonitoring)
**Estado actual:**
- `cvc1: String?`
- `cvc2: String?`
- `cvc3: String?`
- `arterialLine1: String?`
- `arterialLine2: String?`

**Estado deseado:**
- Tabla `VascularLine` relacionada con LinesAndMonitoring
- Tipos: CVC, ARTERIAL, PERIPHERAL

### 3. Campos que YA ESTÁN normalizados ✓
- **TeamAssignment**: Ya usa roles (ANEST1, ANEST2, CIRUJANO1, CIRUJANO2)
- No requiere cambios

## Nuevas Estructuras Propuestas

### Tabla: Etiology (Catálogo)
```prisma
model Etiology {
  id          String @id @default(cuid())
  code        String @unique // Código normalizado (ej: "HVC", "NASH")
  name        String         // Nombre completo
  category    String?        // Categoría: viral, autoinmune, metabólica, etc.
  description String?        // Descripción adicional
  active      Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  preopEtiologies PreopEtiology[]

  @@map("etiologies")
}

model PreopEtiology {
  id        String @id @default(cuid())
  preopId   String
  preop     PreopEvaluation @relation(fields: [preopId], references: [id], onDelete: Cascade)

  etiologyId String
  etiology   Etiology @relation(fields: [etiologyId], references: [id])

  isPrimary Boolean @default(true) // true para etiology1, false para secundarias
  order     Int @default(0)        // orden de prioridad

  createdAt DateTime @default(now())

  @@unique([preopId, etiologyId])
  @@index([preopId])
  @@map("preop_etiologies")
}
```

### Tabla: VascularLine
```prisma
enum LineType {
  CVC       // Catéter venoso central
  ARTERIAL  // Línea arterial
  PERIPHERAL // Vía periférica
}

model VascularLine {
  id          String @id @default(cuid())
  linesMonId  String
  linesMonitoring LinesAndMonitoring @relation(fields: [linesMonId], references: [id], onDelete: Cascade)

  lineType    LineType
  location    String  // Ej: "yugular derecha 3 lúmenes", "radial derecha"
  lumens      Int?    // Número de lúmenes (para CVC)

  createdAt   DateTime @default(now())

  @@index([linesMonId])
  @@map("vascular_lines")
}
```

## Catálogos Adicionales Recomendados

### Para campos que actualmente son String libres:

1. **Procedencia** (provenance)
   - Domicilio, CTI, Sala, Otro

2. **Destino** (destination)
   - CTI, Sala, Block quirúrgico, Otro

3. **Posición** (position)
   - DD (Decúbito dorsal), DL (Decúbito lateral), etc.

4. **Antibióticos Profilácticos** (prophylacticATB)
   - Catálogo de antibióticos comunes

5. **Grupo Sanguíneo** (bloodGroup)
   - A+, A-, B+, B-, AB+, AB-, O+, O-

## Proceso de Migración

### Fase 1: Crear catálogos
1. Crear tabla Etiology con valores únicos
2. Crear tabla VascularLine
3. Crear otras tablas de catálogo

### Fase 2: Migrar datos históricos
1. Para cada PreopEvaluation:
   - Buscar/crear Etiology para etiology1
   - Buscar/crear Etiology para etiology2
   - Crear PreopEtiology para cada una

2. Para cada LinesAndMonitoring:
   - Migrar cvc1, cvc2, cvc3 → VascularLine (type: CVC)
   - Migrar arterialLine1, arterialLine2 → VascularLine (type: ARTERIAL)

### Fase 3: Actualizar schema
1. Remover campos antiguos (etiology1, etiology2, cvc1-3, arterialLine1-2)
2. Agregar relaciones a nuevas tablas

### Fase 4: Actualizar código
1. Actualizar controllers y services
2. Actualizar validaciones
3. Actualizar frontend

## Beneficios

1. **Consistencia**: Valores estandarizados sin duplicados
2. **Flexibilidad**: Agregar N etiologías en lugar de solo 2
3. **Gestión**: Panel de administración para mantener catálogos
4. **Reportes**: Mejores queries y análisis
5. **Validación**: Menos errores de entrada de datos
