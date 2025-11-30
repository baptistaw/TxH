# Plan de Extensión: Programas de Trasplante Renal y Pancreático

> **Estado**: Pendiente - Retomar cuando el módulo hepático esté 100% validado
> **Fecha de creación**: 2025-11-30
> **Última actualización**: 2025-11-30

---

## Índice

1. [Diagnóstico del Estado Actual](#diagnóstico-del-estado-actual)
2. [Arquitectura Multi-Programa](#arquitectura-multi-programa)
3. [Programa de Trasplante Renal](#programa-de-trasplante-renal)
4. [Programa de Trasplante Pancreático](#programa-de-trasplante-pancreático)
5. [Trasplantes Combinados](#trasplantes-combinados)
6. [Plan de Implementación Unificado](#plan-de-implementación-unificado)
7. [Estimaciones y Cronograma](#estimaciones-y-cronograma)

---

## Diagnóstico del Estado Actual

El sistema está diseñado específicamente para trasplante hepático, pero la arquitectura multi-tenancy ya implementada facilita la extensión a otros programas.

### Puntos clave del análisis:

| Aspecto | Estado | Comentario |
|---------|--------|------------|
| Multi-tenancy | ✅ Implementado | `organizationId` en todas las tablas |
| Catálogos dinámicos | ✅ Implementado | Por organización |
| Audit log | ✅ Implementado | Funciona para cualquier programa |
| Firma digital | ✅ Implementado | Agnóstico al tipo de trasplante |
| Soft delete | ✅ Implementado | En modelos críticos |
| Fases intraoperatorias | ⚠️ Específico hepático | Requiere extensión |
| Evaluación preoperatoria | ⚠️ Parcialmente genérico | Requiere campos adicionales |

---

## Arquitectura Multi-Programa

### Enum Central de Tipos de Trasplante

```prisma
/// Tipo de trasplante - Central para todo el sistema
enum TransplantType {
  // Trasplantes simples
  HEPATICO              // Hígado
  RENAL                 // Riñón
  PANCREAS              // Páncreas aislado (raro)

  // Trasplantes combinados
  HEPATO_RENAL          // Hígado + Riñón simultáneo
  PANCREAS_RENAL        // Páncreas + Riñón (SPK - más común)
  PANCREAS_AFTER_KIDNEY // Páncreas después de riñón (PAK)

  // Futuro
  MULTIVISCERAL         // Múltiples órganos abdominales
  INTESTINAL            // Intestino delgado
}
```

### Modelo TransplantCase Extendido

```prisma
model TransplantCase {
  // === CAMPOS EXISTENTES (sin cambios) ===
  id                 String   @id @default(cuid())
  organizationId     String
  patientId          String
  startAt            DateTime?
  endAt              DateTime?
  duration           Int?
  coldIschemiaTime   Int?
  warmIschemiaTime   Int?
  icuTransferDate    DateTime?
  dataSource         DataSource @default(APPSHEET)
  observations       String?    @db.Text
  createdAt          DateTime   @default(now())
  updatedAt          DateTime   @updatedAt
  deletedAt          DateTime?

  // === NUEVO: TIPO DE TRASPLANTE ===
  transplantType     TransplantType @default(HEPATICO)

  // === CAMPOS ESPECÍFICOS HEPÁTICO (existentes) ===
  isRetransplant     Boolean  @default(false)
  isHepatoRenal      Boolean  @default(false)  // Deprecar, usar transplantType
  optimalDonor       Boolean?
  provenance         String?

  // === CAMPOS ESPECÍFICOS RENAL ===
  renalDonorType         DonorType?
  dialysisType           DialysisType?
  dialysisDurationMonths Int?
  livingDonorId          String?
  livingDonorRelation    String?
  crossmatchResult       CrossmatchResult?
  praPercentage          Float?
  donorHLA               Json?
  recipientHLA           Json?

  // === CAMPOS ESPECÍFICOS PANCREÁTICO ===
  pancreasDonorBMI       Float?          // BMI del donante
  pancreasDonorAge       Int?            // Edad del donante
  pancreasPreservation   String?         // UW, HTK, etc.
  pancreasAnastomosis    PancreasAnastomosisType?
  exocrineManagement     ExocrineManagementType?
  inductionTherapy       String?         // ATG, Basiliximab, etc.
  pretransplantCPeptide  Float?          // C-peptide ng/mL
  pretransplantHbA1c     Float?          // HbA1c %

  // === TIEMPOS DE ISQUEMIA POR ÓRGANO ===
  // Para trasplantes combinados, cada órgano tiene sus tiempos
  renalColdIschemia      Int?            // Minutos
  renalWarmIschemia      Int?            // Minutos
  pancreasColdIschemia   Int?            // Minutos
  pancreasWarmIschemia   Int?            // Minutos

  // Relaciones existentes...
}
```

---

## Programa de Trasplante Renal

### Características Específicas

El trasplante renal tiene particularidades que lo diferencian significativamente del hepático:

1. **Donante vivo posible** - Única modalidad donde el donante puede ser una persona viva
2. **Inmunología crítica** - Crossmatch, PRA, tipaje HLA determinan viabilidad
3. **Diálisis previa** - Pacientes vienen de hemodiálisis o diálisis peritoneal
4. **Menor complejidad quirúrgica** - Pero mayor seguimiento inmunológico

### Enums Específicos de Renal

```prisma
/// Tipo de donante renal
enum DonorType {
  CADAVERICO
  VIVO_RELACIONADO
  VIVO_NO_RELACIONADO
  DONANTE_ALTRUISTA
}

/// Tipo de diálisis previa
enum DialysisType {
  HEMODIALISIS
  DIALISIS_PERITONEAL
  PREDIALISIS           // Trasplante preventivo
  SIN_DIALISIS
}

/// Resultado del crossmatch
enum CrossmatchResult {
  NEGATIVO
  POSITIVO_HISTORICO    // Fue positivo, ahora negativo
  POSITIVO_ACTUAL       // Contraindicación relativa
  NO_REALIZADO
}

/// Etiología de enfermedad renal crónica
enum RenalEtiology {
  DIABETES_TIPO_1
  DIABETES_TIPO_2
  HIPERTENSION
  GLOMERULONEFRITIS_CRONICA
  POLIQUISTOSIS_RENAL
  NEFROPATIA_IGA
  LUPUS_ERITEMATOSO
  NEFROPATIA_REFLUJO
  UROPATIA_OBSTRUCTIVA
  PIELONEFRITIS_CRONICA
  SINDROME_ALPORT
  NEFROESCLEROSIS
  NEFRITIS_INTERSTICIAL
  SINDROME_HEMOLITICO_UREMICO
  VASCULITIS
  DESCONOCIDA
  OTRA
}
```

### Modelo de Donante Vivo

```prisma
/// Donante vivo de riñón
model LivingDonor {
  id              String   @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])

  // Identificación
  ci              String
  name            String
  birthDate       DateTime?
  sex             Sex?
  bloodGroup      String?
  weight          Float?
  height          Float?

  // Relación con receptor
  recipientId     String      // CI del receptor
  relationship    LivingDonorRelationship

  // Evaluación médica
  hlaTyping       Json?       // Tipaje HLA completo
  gfr             Float?      // Filtrado glomerular mL/min/1.73m²
  gfrMethod       String?     // "CKD-EPI", "MDRD", "Creatinina 24h"
  proteinuria24h  Float?      // mg/24h
  kidneyAnatomyCT Json?       // Hallazgos del angio-TC
  selectedKidney  String?     // "IZQUIERDO", "DERECHO"
  numberOfArteries Int?       // Arterias renales del riñón seleccionado

  // Evaluación psicosocial
  psychologicalEval Boolean @default(false)
  socialWorkEval    Boolean @default(false)
  informedConsent   Boolean @default(false)
  consentDate       DateTime?

  // Estado
  approvedForDonation Boolean @default(false)
  approvalDate    DateTime?
  rejectionReason String?

  // Resultado de la donación
  donationDate    DateTime?
  surgeryDuration Int?        // Minutos
  complications   String?     @db.Text
  hospitalDays    Int?

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@unique([organizationId, ci])
  @@index([organizationId])
  @@index([recipientId])
  @@map("living_donors")
}

/// Relación del donante vivo con el receptor
enum LivingDonorRelationship {
  PADRE
  MADRE
  HIJO_HIJA
  HERMANO_HERMANA
  CONYUGE
  TIO_TIA
  PRIMO_PRIMA
  ABUELO_ABUELA
  AMIGO
  DONANTE_ALTRUISTA
  OTRO
}
```

### Fases Intraoperatorias de Renal

```prisma
// Agregar al enum IntraopPhase existente:

// === FASES TRASPLANTE RENAL ===
NEFRECTOMIA_DONANTE       // Solo en donante vivo - extracción del riñón
BANCO_PREPARACION_RENAL   // Preparación del injerto en banco
INCISION_RECEPTOR         // Incisión en fosa ilíaca
DISECCION_VASOS_ILIACOS   // Exposición de vasos ilíacos
ANASTOMOSIS_VENOSA_RENAL  // Anastomosis a vena ilíaca
ANASTOMOSIS_ARTERIAL_RENAL // Anastomosis a arteria ilíaca
REPERFUSION_RENAL         // Desclampeo y reperfusión
ANASTOMOSIS_URETERAL      // Reimplante urétero-vesical
HEMOSTASIA_RENAL          // Control de hemostasia
```

### Campos PreopEvaluation para Renal

```prisma
// Agregar a PreopEvaluation:

// === DIÁLISIS ===
dialysisAccessType      String?   // "FAV_RADIO_CEFALICA", "FAV_BRAQUIO_CEFALICA", "CATETER_TUNELIZADO"
dialysisAccessSide      String?   // "DERECHO", "IZQUIERDO"
dialysisAccessStatus    String?   // "FUNCIONAL", "DISFUNCIONAL", "TROMBOSADO"
residualUrineOutput     Int?      // ml/día
lastDialysisDate        DateTime?
nextDialysisDate        DateTime?
dryWeight               Float?    // kg
interdialyticWeightGain Float?    // kg promedio

// === LABORATORIOS ESPECÍFICOS ===
potassiumPreDialysis    Float?    // mEq/L
potassiumPostDialysis   Float?    // mEq/L
phosphorus              Float?    // mg/dL
calcium                 Float?    // mg/dL
pth                     Float?    // pg/mL (paratohormona)
vitaminD                Float?    // ng/mL
ferritin                Float?    // ng/mL
transferrinSaturation   Float?    // %
epo                     Boolean   @default(false) // Recibe EPO

// === INMUNOLOGÍA ===
praClass1               Float?    // PRA Clase I %
praClass2               Float?    // PRA Clase II %
peakPRA                 Float?    // PRA histórico máximo %
hasAntiHLA              Boolean   @default(false)
antiHLASpecificities    Json?     // ["A2", "B27", "DR4", ...]
previousTransplants     Int       @default(0)
previousTransfusions    Int       @default(0)
previousPregnancies     Int       @default(0)

// === CARDIOVASCULAR (más detallado para renales) ===
calcificationScore      String?   // "AUSENTE", "LEVE", "MODERADO", "SEVERO"
coronaryAngiography     Boolean   @default(false)
coronaryAngiographyDate DateTime?
coronaryAngiographyResult String? // "NORMAL", "LESIONES_NO_SIGNIFICATIVAS", "REVASCULARIZADO"
```

---

## Programa de Trasplante Pancreático

### Características Específicas

El trasplante pancreático es uno de los más complejos técnicamente:

1. **Diabetes tipo 1** - Indicación principal
2. **Casi siempre combinado con riñón** (SPK) - 80% de los casos
3. **Alta complejidad técnica** - Manejo de drenaje exocrino
4. **Monitoreo metabólico intensivo** - C-péptido, glicemia, HbA1c

### Tipos de Trasplante Pancreático

| Tipo | Sigla | Descripción | Frecuencia |
|------|-------|-------------|------------|
| Simultaneous Pancreas-Kidney | **SPK** | Páncreas + Riñón simultáneo | **85-90%** |
| Pancreas After Kidney | PAK | Páncreas después de riñón previo | 5-10% |
| Pancreas Transplant Alone | PTA | Páncreas aislado | 2-5% |

> **NOTA IMPORTANTE**: En Uruguay y la mayoría de los centros, el trasplante de páncreas se realiza casi exclusivamente como **SPK (reno-pancreático)**. Por lo tanto, el diseño del sistema debe priorizar este flujo combinado como el principal, no como excepción.

### Enums Específicos de Páncreas

```prisma
/// Tipo de anastomosis del drenaje exocrino pancreático
enum PancreasAnastomosisType {
  ENTERICO_DUODENO_YEYUNAL   // Drenaje a yeyuno (más común actualmente)
  VESICAL                     // Drenaje a vejiga (histórico, permite monitoreo)
}

/// Manejo del drenaje exocrino
enum ExocrineManagementType {
  DRENAJE_ENTERICO           // A intestino
  DRENAJE_VESICAL            // A vejiga
  INYECCION_POLIMERO         // Oclusión del conducto
}

/// Tipo de trasplante pancreático
enum PancreasTransplantType {
  SPK     // Simultaneous Pancreas-Kidney
  PAK     // Pancreas After Kidney
  PTA     // Pancreas Transplant Alone
}

/// Etiología de la diabetes
enum DiabetesEtiology {
  TIPO_1
  TIPO_2_INSULINODEPENDIENTE
  MODY
  PANCREATITIS_CRONICA
  PANCREATECTOMIA
  FIBROSIS_QUISTICA
  OTRA
}

/// Complicaciones crónicas de la diabetes
enum DiabeticComplication {
  RETINOPATIA
  NEFROPATIA
  NEUROPATIA_PERIFERICA
  NEUROPATIA_AUTONOMICA
  GASTROPARESIA
  ENFERMEDAD_CARDIOVASCULAR
  ENFERMEDAD_VASCULAR_PERIFERICA
}
```

### Campos Específicos de Páncreas en TransplantCase

```prisma
// Agregar a TransplantCase:

// === PÁNCREAS - DATOS DEL DONANTE ===
pancreasDonorAge            Int?      // Edad ideal: 10-45 años
pancreasDonorBMI            Float?    // BMI ideal: <30
pancreasDonorCauseOfDeath   String?   // TCE, ACV, etc.
pancreasDonorAmylase        Float?    // Amilasa sérica del donante
pancreasDonorLipase         Float?    // Lipasa sérica del donante
pancreasDonorGlucose        Float?    // Glicemia del donante
pancreasDonorHbA1c          Float?    // Si disponible

// === PÁNCREAS - PRESERVACIÓN ===
pancreasPreservationSolution String?  // "UW", "HTK", "IGL-1"
pancreasBackTableTime       Int?      // Minutos en banco

// === PÁNCREAS - TÉCNICA QUIRÚRGICA ===
pancreasTransplantType      PancreasTransplantType?
pancreasAnastomosis         PancreasAnastomosisType?
exocrineManagement          ExocrineManagementType?
venousDrainage              String?   // "SISTEMICO" (cava), "PORTAL"
arterialAnastomosis         String?   // Descripción técnica

// === PÁNCREAS - INDUCCIÓN ===
inductionTherapy            String?   // "ATG", "BASILIXIMAB", "ALEMTUZUMAB"
inductionDose               String?

// === PÁNCREAS - VALORES PRE-TX ===
pretransplantCPeptide       Float?    // C-péptido ng/mL (típicamente <0.5)
pretransplantHbA1c          Float?    // HbA1c %
pretransplantInsulinDose    Float?    // UI/día
hypoglycemiaUnawareness     Boolean   @default(false)  // Hipoglicemia inadvertida
brittleDiabetes             Boolean   @default(false)  // Diabetes lábil
```

### Campos PreopEvaluation para Páncreas

```prisma
// Agregar a PreopEvaluation:

// === DIABETES ===
diabetesDuration            Int?      // Años desde diagnóstico
diabetesEtiology            DiabetesEtiology?
currentInsulinRegimen       String?   // "MDI", "BOMBA_INSULINA", "NPH+RAPIDA"
totalDailyInsulin           Float?    // UI/día
cPeptideFasting             Float?    // ng/mL
cPeptideStimulated          Float?    // ng/mL post-glucagón
hbA1c                       Float?    // %
hypoglycemicEpisodesMonth   Int?      // Episodios/mes
severeHypoglycemiaYear      Int?      // Episodios severos/año
hypoglycemiaUnawareness     Boolean   @default(false)

// === COMPLICACIONES CRÓNICAS ===
diabeticComplications       Json?     // Array de DiabeticComplication
retinopatyhyStage           String?   // "NO_RETINOPATIA", "NPDR_LEVE", "NPDR_MODERADA", "PDR"
neuropathyScore             Int?      // Michigan Neuropathy Score
gastroparesisGrade          String?   // "LEVE", "MODERADA", "SEVERA"
autonomicNeuropathy         Boolean   @default(false)

// === CARDIOVASCULAR (crítico en diabéticos) ===
cardiacStressTest           Boolean   @default(false)
stressTestDate              DateTime?
stressTestResult            String?   // "NEGATIVO", "POSITIVO", "INCONCLUSO"
coronaryCTA                 Boolean   @default(false)
coronaryCTAResult           String?
carotidDoppler              Boolean   @default(false)
carotidStenosis             String?   // "SIN_ESTENOSIS", "<50%", "50-69%", ">=70%"
ankleIndex                  Float?    // Índice tobillo-brazo

// === EVALUACIÓN UROLÓGICA (para SPK) ===
urologicEvaluation          Boolean   @default(false)
bladderCapacity             Int?      // ml
residualVolume              Int?      // ml
urodinamicStudy             Boolean   @default(false)
```

### Fases Intraoperatorias de Páncreas

```prisma
// Agregar al enum IntraopPhase:

// === FASES TRASPLANTE PANCREÁTICO ===
BANCO_PREPARACION_PANCREAS    // Preparación en banco (separar de hígado si procede)
INCISION_PANCREAS             // Incisión abdominal
DISECCION_VASOS_PANCREAS      // Exposición de vasos ilíacos
ANASTOMOSIS_ARTERIAL_PANCREAS // Arteria del injerto a ilíaca
ANASTOMOSIS_VENOSA_PANCREAS   // Vena porta del injerto (a ilíaca o porta)
REPERFUSION_PANCREAS          // Desclampeo del páncreas
ANASTOMOSIS_EXOCRINA          // Drenaje exocrino (entérico o vesical)
HEMOSTASIA_PANCREAS           // Control de hemostasia

// === SI ES SPK (combinado) ===
// Se realizan las fases de renal después de páncreas
```

### Monitoreo Postoperatorio Específico

```prisma
/// Seguimiento postoperatorio de páncreas
model PancreasPostopFollowup {
  id              String   @id @default(cuid())
  caseId          String
  case            TransplantCase @relation(fields: [caseId], references: [id])

  followupDate    DateTime
  dayPostTransplant Int

  // === FUNCIÓN DEL INJERTO ===
  fastingGlucose  Float?    // mg/dL
  cPeptide        Float?    // ng/mL
  hbA1c           Float?    // % (mensual)
  insulinRequired Boolean   @default(false)
  insulinDose     Float?    // UI/día si requiere

  // === SI DRENAJE VESICAL ===
  urineAmylase    Float?    // U/L

  // === LABORATORIOS ===
  serumAmylase    Float?    // U/L
  serumLipase     Float?    // U/L
  creatinine      Float?    // mg/dL (importante en SPK)

  // === COMPLICACIONES ===
  rejection       Boolean   @default(false)
  rejectionType   String?   // "CELULAR", "HUMORAL", "MIXTO"
  pancreatitis    Boolean   @default(false)
  thrombosis      Boolean   @default(false)
  leakAnastomosis Boolean   @default(false)

  createdAt       DateTime  @default(now())

  @@index([caseId, followupDate])
  @@map("pancreas_postop_followup")
}
```

---

## Trasplantes Combinados

### Reno-Pancreático (SPK) - PRIORIDAD ALTA

> **Este es el tipo de trasplante pancreático más común (85-90%)** y debe diseñarse como flujo principal, no como variante.

**Características del SPK:**
- Paciente diabético tipo 1 con nefropatía diabética terminal
- Se trasplantan ambos órganos del mismo donante cadavérico
- **Secuencia quirúrgica**: Páncreas primero, luego riñón
- Misma incisión abdominal para ambos órganos
- Tiempos de isquemia separados (el riñón tolera más isquemia fría)

**Ventajas del SPK sobre PAK/PTA:**
- Una sola cirugía y hospitalización
- Un solo donante = mejor compatibilidad
- Mejores resultados a largo plazo
- El riñón "protege" al páncreas (marcador de rechazo)

**Diseño del Sistema para SPK:**
```
┌─────────────────────────────────────────────────────────────┐
│  CASO SPK (Reno-Pancreático)                                │
├─────────────────────────────────────────────────────────────┤
│  Datos comunes:                                             │
│  - Paciente, Donante, Fechas, Equipo quirúrgico            │
├─────────────────────────────────────────────────────────────┤
│  Datos Páncreas:           │  Datos Riñón:                  │
│  - Isquemia fría/caliente  │  - Isquemia fría/caliente     │
│  - Técnica anastomosis     │  - Crossmatch, HLA            │
│  - Drenaje exocrino        │  - Diálisis previa            │
│  - C-péptido pre-Tx        │  - PRA                        │
├─────────────────────────────────────────────────────────────┤
│  Fases Intraoperatorias:                                    │
│  1. Inducción (común)                                       │
│  2. Fases Páncreas (primero)                               │
│  3. Fases Riñón (después)                                  │
│  4. Cierre (común)                                         │
├─────────────────────────────────────────────────────────────┤
│  Seguimiento PostOp:                                        │
│  - Función pancreática (C-péptido, glicemia, HbA1c)        │
│  - Función renal (creatinina, diuresis)                    │
│  - Inmunosupresión compartida                              │
└─────────────────────────────────────────────────────────────┘
```

### Hepato-Renal

Pacientes con insuficiencia hepática + renal:
- Síndrome hepatorrenal
- Poliquistosis hepatorrenal
- Hiperoxaluria primaria
- Nefropatía por oxalato

### PAK y PTA (minoritarios)

- **PAK**: Para diabéticos que ya tienen riñón trasplantado funcionante
- **PTA**: Casos excepcionales de diabetes lábil sin nefropatía severa

### Consideraciones Técnicas para Combinados

```prisma
model TransplantCase {
  // Para trasplantes combinados, registrar datos de cada órgano

  // === PRIMER ÓRGANO ===
  primaryOrgan          String?   // "PANCREAS", "HIGADO"
  primaryOrganStartTime DateTime?
  primaryOrganEndTime   DateTime?

  // === SEGUNDO ÓRGANO ===
  secondaryOrgan          String?   // "RENAL"
  secondaryOrganStartTime DateTime?
  secondaryOrganEndTime   DateTime?

  // === TIEMPOS SEPARADOS ===
  // Los tiempos de isquemia ya están definidos por órgano arriba
}
```

---

## Plan de Implementación Unificado

### Fase 0: Preparación (Pre-requisito)

- [ ] Validar módulo hepático al 100%
- [ ] Documentar lecciones aprendidas
- [ ] Definir equipo de validación clínica (nefrólogos, diabetólogos)

### Fase 1: Arquitectura Base Multi-Programa

| Tarea | Esfuerzo | Prioridad |
|-------|----------|-----------|
| Agregar enum `TransplantType` | Bajo | Alta |
| Migrar casos existentes a `HEPATICO` | Bajo | Alta |
| Crear sistema de feature flags por programa | Medio | Alta |
| Actualizar UI para selector de programa | Medio | Alta |

### Fase 2: Módulo Renal

| Tarea | Esfuerzo | Prioridad |
|-------|----------|-----------|
| Enums específicos de renal | Bajo | Alta |
| Campos en TransplantCase | Bajo | Alta |
| Campos en PreopEvaluation | Medio | Alta |
| Modelo LivingDonor | Medio | Media |
| Fases intraoperatorias | Bajo | Alta |
| Formularios frontend | Alto | Alta |
| Template PDF renal | Medio | Media |
| Analytics renal | Medio | Media |

### Fase 3: Módulo Pancreático

| Tarea | Esfuerzo | Prioridad |
|-------|----------|-----------|
| Enums específicos de páncreas | Bajo | Alta |
| Campos en TransplantCase | Medio | Alta |
| Campos en PreopEvaluation | Medio | Alta |
| Modelo PancreasPostopFollowup | Medio | Media |
| Fases intraoperatorias | Bajo | Alta |
| Formularios frontend | Alto | Alta |
| Template PDF páncreas | Medio | Media |
| Analytics páncreas | Medio | Media |

### Fase 4: Trasplantes Combinados

| Tarea | Esfuerzo | Prioridad |
|-------|----------|-----------|
| Soporte para múltiples órganos | Medio | Media |
| Tiempos de isquemia por órgano | Bajo | Alta |
| UI para registro secuencial | Alto | Media |
| Templates PDF combinados | Medio | Media |

### Fase 5: Testing y Validación

| Tarea | Esfuerzo | Prioridad |
|-------|----------|-----------|
| Tests unitarios por programa | Medio | Alta |
| Tests E2E por programa | Alto | Alta |
| Validación con usuarios clínicos | Alto | Crítica |
| Ajustes post-feedback | Variable | Alta |

---

## Estimaciones y Cronograma

### Tiempo Estimado por Módulo

| Módulo | Backend | Frontend | Testing | Total |
|--------|---------|----------|---------|-------|
| Base Multi-Programa | 3 días | 2 días | 1 día | **1 semana** |
| Renal | 5 días | 7 días | 3 días | **3 semanas** |
| Pancreático | 5 días | 7 días | 3 días | **3 semanas** |
| Combinados | 3 días | 4 días | 2 días | **2 semanas** |
| **Total** | | | | **9 semanas** |

### Cronograma Sugerido

```
Semana 1-2:   Base Multi-Programa + Inicio Renal
Semana 3-5:   Módulo Renal completo
Semana 6-8:   Módulo Pancreático completo
Semana 9:     Trasplantes combinados
Semana 10-11: Testing integral y validación clínica
Semana 12:    Ajustes finales y documentación
```

---

## Consideraciones Técnicas

### Lo que ya funciona sin cambios:

- ✅ Multi-tenancy (organizationId)
- ✅ Autenticación y roles (Clerk)
- ✅ Audit log completo
- ✅ Firma digital de actos médicos
- ✅ Soft delete en modelos críticos
- ✅ Backup/restore de base de datos
- ✅ Sistema de catálogos dinámicos

### Requiere ajustes menores:

- 🔄 Enum de especialidades (agregar NEFROLOGO, UROLOGO, DIABETOLOGO)
- 🔄 Enum de roles (agregar si es necesario)
- 🔄 Validaciones condicionales en formularios

### Requiere desarrollo nuevo:

- 🆕 Selector de programa en UI
- 🆕 Formularios condicionales por tipo
- 🆕 Modelo de donante vivo
- 🆕 Fases intraoperatorias extendidas
- 🆕 Templates PDF por programa
- 🆕 Métricas y KPIs específicos
- 🆕 Seguimiento postoperatorio de páncreas

---

## Referencias Clínicas

### Trasplante Renal
- Guías KDIGO 2009 - Cuidado del receptor de trasplante renal
- ERBP Guidelines - European Renal Best Practice
- Protocolos PNTH Uruguay - Trasplante Renal

### Trasplante Pancreático
- IPITA/TTS/ESOT Guidelines 2021
- ADA Standards of Care - Trasplante de páncreas
- UNOS Policies - Pancreas Allocation

### Uruguay
- Ley 18.968 - Instituto Nacional de Donación y Trasplante
- Protocolos INDT
- Protocolos Hospital de Clínicas

---

## Notas para el Equipo de Desarrollo

1. **Mantener retrocompatibilidad** - Los casos hepáticos existentes deben seguir funcionando sin cambios
2. **Feature flags** - Implementar sistema para habilitar programas por organización
3. **Migración gradual** - Cada programa puede habilitarse independientemente
4. **Validación clínica** - Involucrar especialistas de cada área desde el diseño
5. **Documentación** - Mantener actualizada la documentación técnica y de usuario

---

*Documento creado: 2025-11-30*
*Próxima revisión: Al completar validación del módulo hepático*
