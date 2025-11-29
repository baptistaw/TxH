/**
 * Prompts especializados para extracción OCR de equipos médicos
 * Sistema de Registro Anestesiológico TxH
 *
 * Cada prompt está diseñado para un tipo específico de equipo/monitor
 * y retorna un JSON estructurado con los valores extraídos.
 */

const EQUIPMENT_TYPES = {
  GASOMETRY: 'gasometry',
  BIS: 'bis',
  HEMODYNAMIC_MONITOR: 'hemodynamic_monitor',
  VENTILATOR: 'ventilator',
  ROTEM: 'rotem',
  LAB_PLATFORM: 'lab_platform',
};

/**
 * Prompt para gasometría arterial ABL90
 */
const GASOMETRY_PROMPT = `Analiza esta imagen de un resultado de gasometría arterial (ABL90 o similar).
Extrae TODOS los valores numéricos visibles con sus unidades.

IMPORTANTE:
- Busca valores en formato "parámetro: valor unidad" o en tablas
- Los valores pueden estar en columnas o filas
- Algunos parámetros pueden tener múltiples valores (actual, calculado)
- Presta atención a signos negativos (especialmente en BE)

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "pH": number | null,
  "pCO2": number | null,
  "pO2": number | null,
  "sO2": number | null,
  "ctHb": number | null,
  "hct": number | null,
  "sodium": number | null,
  "potassium": number | null,
  "chloride": number | null,
  "ionicCalcium": number | null,
  "glucose": number | null,
  "lactate": number | null,
  "bilirubin": number | null,
  "baseExcess": number | null,
  "hco3": number | null,
  "anionGap": number | null,
  "osmolarity": number | null,
  "confidence": number,
  "notes": string | null
}

Reglas:
- pH: valor entre 6.8 y 7.8 (sin unidades)
- pCO2, pO2: en mmHg
- sO2: en % (0-100)
- ctHb: en g/dL (hemoglobina total)
- hct: en % (hematocrito)
- Na, K, Cl: en mEq/L o mmol/L
- ionicCalcium: en mmol/L (Ca++ ionizado)
- Glucosa: en mg/dL
- Lactato: en mmol/L
- Bilirrubina: en mg/dL o µmol/L (convertir a mg/dL si es necesario: µmol/L ÷ 17.1)
- BE: puede ser negativo, en mEq/L
- HCO3: en mEq/L o mmol/L
- confidence: 0-1 (1 = todos los valores legibles)
- notes: observaciones sobre valores dudosos o ilegibles

Si un valor NO es visible o legible, usa null. NO INVENTES valores.`;

/**
 * Prompt para monitor BIS (Covidien/Medtronic)
 */
const BIS_PROMPT = `Analiza esta imagen de un monitor BIS (Índice Biespectral).
El monitor BIS muestra el nivel de sedación/profundidad anestésica.

Extrae los valores visibles en la pantalla:

Responde ÚNICAMENTE con un JSON válido:
{
  "bis": number | null,
  "emg": number | null,
  "sqiPercent": number | null,
  "srPercent": number | null,
  "confidence": number,
  "notes": string | null
}

Valores esperados:
- BIS: 0-100 (número grande en pantalla, usualmente en color)
  - 0-40: Anestesia profunda
  - 40-60: Anestesia general adecuada
  - 60-80: Sedación
  - 80-100: Despierto
- EMG: 0-100 dB (actividad electromiográfica)
- SQI: 0-100% (Signal Quality Index)
- SR: 0-100% (Suppression Ratio)

El valor BIS suele ser el número más grande y prominente en la pantalla.
Si hay un valor grande (2-3 dígitos) destacado, ese es probablemente el BIS.`;

/**
 * Prompt para monitor hemodinámico (Carescape B450, Philips, etc.)
 */
const HEMODYNAMIC_MONITOR_PROMPT = `Analiza esta imagen de un monitor de signos vitales/hemodinámico.
Estos monitores muestran múltiples parámetros con colores diferentes.

Típicamente:
- VERDE: ECG/Frecuencia cardíaca
- AZUL/CIAN: SpO2 (saturación)
- ROJO: Presión arterial
- AMARILLO: Temperatura, PVC, otros

Extrae los valores visibles:

Responde ÚNICAMENTE con un JSON válido:
{
  "heartRate": number | null,
  "rhythmType": string | null,
  "spo2": number | null,
  "pasSystolic": number | null,
  "pasDiastolic": number | null,
  "pam": number | null,
  "cvp": number | null,
  "temperature": number | null,
  "temperatureCentral": number | null,
  "stSegment": number | null,
  "etCO2": number | null,
  "respRate": number | null,
  "confidence": number,
  "notes": string | null
}

Valores esperados:
- heartRate: 30-250 lpm
- rhythmType: "Sinusal", "FA", "Flutter", "Taquicardia", "Bradicardia", o null
- spo2: 0-100%
- PA invasiva o no invasiva: sistólica/diastólica/media (ej: 120/80 (90))
- cvp: -5 a 30 cmH2O (Presión Venosa Central)
- temperature: 30-42°C (temperatura periférica/superficial)
- temperatureCentral: 30-42°C (temperatura central/esofágica/nasofaríngea, suele indicarse como "T1" o "Tcentral")
- stSegment: -10 a +10 mm
- etCO2: 0-100 mmHg
- respRate: 0-60 rpm

La presión arterial suele mostrarse como "120/80 (90)" o "120/80/90".
El número entre paréntesis o el tercer valor es la PAM.
Si hay dos temperaturas, usa temperature para la superficial y temperatureCentral para la central/esofágica.`;

/**
 * Prompt para ventilador/máquina de anestesia
 */
const VENTILATOR_PROMPT = `Analiza esta imagen de un ventilador o máquina de anestesia.
Extrae los parámetros ventilatorios visibles.

Los ventiladores muestran:
- Modo ventilatorio (VCV, PCV, SIMV, PSV, etc.)
- Parámetros configurados (set) y medidos (actual)
- Curvas de presión, flujo, volumen

Responde ÚNICAMENTE con un JSON válido:
{
  "ventMode": string | null,
  "tidalVolume": number | null,
  "respRate": number | null,
  "ieRatio": string | null,
  "peep": number | null,
  "peakPressure": number | null,
  "plateauPressure": number | null,
  "compliance": number | null,
  "minuteVolume": number | null,
  "fio2": number | null,
  "etCO2": number | null,
  "inhalAgent": string | null,
  "inhalAgentFi": number | null,
  "inhalAgentEt": number | null,
  "inhalAgentMAC": number | null,
  "confidence": number,
  "notes": string | null
}

Valores esperados:
- ventMode: "VCV", "PCV", "SIMV", "PSV", "CPAP", "Manual", etc.
- tidalVolume (VT): 200-1000 mL
- respRate (FR): 6-40 rpm
- ieRatio: "1:1", "1:1.5", "1:2", "1:2.5", "1:3", etc.
- peep: 0-20 cmH2O
- peakPressure (Ppico): 10-50 cmH2O
- plateauPressure (Pplateau): 10-40 cmH2O
- compliance: 20-100 mL/cmH2O
- minuteVolume (VM): 3-15 L/min
- fio2: 21-100% (o 0.21-1.0)
- etCO2: 20-60 mmHg
- inhalAgent: "Sevoflurano", "Isoflurano", "Desflurano", null
- Fi/Et del agente: concentración inspirada/espirada en %
- MAC: valor de MAC (0.5-2.0 típicamente)

Si el valor de FiO2 está entre 0 y 1, multiplícalo por 100 para reportar en %.`;

/**
 * Prompt para ROTEM (Instrumentation Laboratory)
 */
const ROTEM_PROMPT = `Analiza esta imagen de un resultado de ROTEM (tromboelastometría rotacional).

IMPORTANTE - FORMATO DE PANTALLA ROTEM:
La pantalla ROTEM típicamente muestra:
1. GRÁFICOS en forma de "copa de vino" o "huevo" - curvas TEMgram para cada test
2. TABLA de valores numéricos organizada por columnas (tests) y filas (parámetros)
3. Los tests están en columnas: EXTEM | FIBTEM | INTEM | APTEM | HEPTEM
4. Los parámetros están en filas: CT | CFT | A5 | A10 | A20 | MCF | ML | LI30 | LI60

UBICACIÓN DE VALORES:
- Los valores numéricos suelen estar en una TABLA debajo o al lado de los gráficos
- Busca números junto a abreviaturas como CT, CFT, A5, A10, MCF, ML
- Los valores pueden estar coloreados (verde=normal, amarillo=advertencia, rojo=crítico)
- Algunos valores pueden mostrar "*" o estar fuera de rango

PARÁMETROS A EXTRAER:
- CT (Clotting Time): segundos, típicamente 38-240 seg según test
- CFT (Clot Formation Time): segundos, típicamente 34-159 seg
- A5: amplitud a 5 minutos en mm (muy importante para decisión rápida)
- A10: amplitud a 10 minutos en mm
- A20: amplitud a 20 minutos en mm (si disponible)
- MCF (Maximum Clot Firmness): mm, firmeza máxima
- ML (Maximum Lysis): % de lisis máxima
- LI30/CLI30: índice de lisis a 30 min, %
- LI60/CLI60: índice de lisis a 60 min, %

Responde ÚNICAMENTE con un JSON válido con esta estructura:
{
  "extem": {
    "ct": <número en segundos o null>,
    "cft": <número en segundos o null>,
    "a5": <número en mm o null>,
    "a10": <número en mm o null>,
    "a20": <número en mm o null>,
    "mcf": <número en mm o null>,
    "ml": <número en % o null>,
    "li30": <número en % o null>,
    "li60": <número en % o null>
  },
  "fibtem": {
    "ct": <número o null>,
    "a5": <número o null>,
    "a10": <número o null>,
    "a20": <número o null>,
    "mcf": <número o null>
  },
  "intem": {
    "ct": <número o null>,
    "cft": <número o null>,
    "a5": <número o null>,
    "a10": <número o null>,
    "mcf": <número o null>
  },
  "aptem": {
    "ct": <número o null>,
    "a5": <número o null>,
    "a10": <número o null>,
    "mcf": <número o null>,
    "ml": <número o null>
  },
  "heptem": {
    "ct": <número o null>,
    "cft": <número o null>,
    "mcf": <número o null>
  },
  "confidence": <0.0 a 1.0>,
  "notes": "<observaciones sobre valores dudosos o ilegibles>"
}

VALORES DE REFERENCIA (para contexto, NO para filtrar):
- CT EXTEM: 38-79 seg (vía extrínseca)
- CFT EXTEM: 34-159 seg
- A5 EXTEM: 34-55 mm
- A10 EXTEM: 43-65 mm
- MCF EXTEM: 50-72 mm
- A5 FIBTEM: 8-24 mm (CRÍTICO: <8mm = hipofibrinogenemia severa)
- A10 FIBTEM: 9-25 mm
- MCF FIBTEM: 9-25 mm
- CT INTEM: 100-240 seg (vía intrínseca)
- CT HEPTEM: similar a INTEM (si CT INTEM >> CT HEPTEM = efecto heparina)

REGLAS DE EXTRACCIÓN:
1. Extrae TODOS los valores numéricos visibles, incluso si parecen fuera de rango
2. Los valores patológicos son válidos - NO los descartes
3. Si un valor está marcado con "*" o color, extráelo igual
4. Si no puedes leer un valor claramente, usa null
5. Presta especial atención a A5 FIBTEM - es el más importante clínicamente
6. Los valores de CT suelen ser números de 2-3 dígitos (ej: 65, 156, 234)
7. Los valores de amplitud (A5, A10, MCF) suelen ser números de 1-2 dígitos (ej: 8, 45, 62)
8. Si solo ves algunos tests (ej: solo EXTEM y FIBTEM), extrae solo esos`;

/**
 * Prompt para plataforma de laboratorio hospitalario
 */
const LAB_PLATFORM_PROMPT = `Analiza esta imagen de una pantalla del sistema de laboratorio hospitalario.

IMPORTANTE - DIFERENCIA ENTRE VALORES MEDIDOS Y RANGOS DE REFERENCIA:
Los sistemas de laboratorio muestran DOS tipos de información:
1. VALORES MEDIDOS (resultado del paciente): Son los que debes extraer
2. RANGOS DE REFERENCIA: Son intervalos normales (ej: "70-100", "3.5-5.0") - IGNORAR

CÓMO IDENTIFICAR VALORES MEDIDOS:
- Están marcados con un CÍRCULO VERDE (●) o icono de verificación
- Son valores ÚNICOS (no rangos como "70-100")
- Están en una columna "Resultado" a la izquierda, con el rango a la derecha
- El formato típico es: "Parámetro | ●valor | unidad | rango-referencia"

CÓMO IDENTIFICAR RANGOS DE REFERENCIA (NO EXTRAER):
- Son INTERVALOS con formato "min - max" (ej: "135 - 145", "3.5 - 5.1")
- Aparecen DESPUÉS del valor medido y las unidades
- NO tienen círculo verde

NOMBRES DE PARÁMETROS A BUSCAR (en español):
IONOGRAMA / ELECTROLITOS:
- "Sodio en Suero" o "Na" → sodio (rango normal: 135-145 mmol/L)
- "Potasio en suero" o "K" → potasio (rango normal: 3.5-5.5 mmol/L)
- "Cloro en Suero" o "Cl" → cloro (rango normal: 98-108 mmol/L)
- "Magnesio en Suero" o "Mg" → magnesio

CALCIO IONICO - MUY IMPORTANTE:
- SOLO extraer "Calcio ionico" o "Calcio iónico" o "Ca++" → calcioIonico
- Unidad: mmol/L, rango normal: 1.0-1.35 mmol/L
- ¡NUNCA puede ser mayor a 2.0 mmol/L! Valores típicos: 0.9-1.5 mmol/L
- IGNORAR COMPLETAMENTE "Calcio total" o "Calcio en suero" (son mg/dL, valores ~8-10)
- Si solo ves "Calcio total" sin "Calcio ionico", dejar calcioIonico = null

BIOQUÍMICA:
- "Glucosa" o "Glucemia" o "Glicemia" → glucosa
- "Creatinina en Suero" o "Creatininemia" → creatinina
- "Urea en Suero" o "Uremia" o "BUN" → urea

HEMOGRAMA:
- "Hemoglobina" o "Hb" → hemoglobina
- "Hematocrito" o "Hto" → hematocrito
- "Plaquetas" o "Recuento de plaquetas" → plaquetas
- "Leucocitos" o "Glóbulos blancos" → leucocitos

Responde ÚNICAMENTE con un JSON válido:
{
  "hemograma": {
    "hemoglobina": number | null,
    "hematocrito": number | null,
    "plaquetas": number | null,
    "leucocitos": number | null
  },
  "coagulacion": {
    "tp": number | null,
    "inr": number | null,
    "aptt": number | null,
    "fibrinogeno": number | null
  },
  "bioquimica": {
    "glucosa": number | null,
    "creatinina": number | null,
    "urea": number | null,
    "sodio": number | null,
    "potasio": number | null,
    "cloro": number | null,
    "calcioIonico": number | null,
    "magnesio": number | null,
    "fosforo": number | null
  },
  "funcionHepatica": {
    "bilirrubinaTotal": number | null,
    "bilirrubinaDirecta": number | null,
    "tgo": number | null,
    "tgp": number | null,
    "albumina": number | null,
    "proteinasTotales": number | null,
    "fosfatasaAlcalina": number | null,
    "ggt": number | null
  },
  "otros": {
    "lactato": number | null,
    "amonio": number | null,
    "pcr": number | null
  },
  "confidence": number,
  "notes": string | null
}

EJEMPLO DE EXTRACCIÓN:
Texto OCR: "Sodio en Suero 132 mmol/L 132 - 146"
→ sodio: 132 (el PRIMER numero despues del nombre es 132, ese es el valor medido)

Texto OCR: "Potasio en suero 4.6 mmol/L 3.5 - 5.5"
→ potasio: 4.6 (el PRIMER numero despues del nombre es 4.6)

Texto OCR: "Calcio ionico 1.15 mmol/l 1.15 - 1.33"
→ calcio: 1.15 (AUNQUE 1.15 coincide con el limite del rango, ES el valor medido - EXTRAERLO)

Texto OCR: "Cloro en Suero 105 mmol/L 99 - 109"
→ cloro: 105 (el PRIMER numero es 105)

REGLAS CRÍTICAS:
1. El valor medido es SIEMPRE el PRIMER numero que aparece despues del nombre del parametro
2. AUNQUE el valor sea IGUAL al limite del rango de referencia, ES VALIDO y debes extraerlo
3. El rango de referencia (formato min-max con guion) aparece DESPUES - ignorarlo
4. NUNCA uses null si hay un numero visible para ese parametro
5. Los electrolitos (Na, K, Cl, Ca) son CRÍTICOS - asegúrate de extraerlos SIEMPRE

Unidades esperadas:
- Hb: g/dL | Hto: % | Plaquetas: x10³/µL | Leucocitos: x10³/µL
- TP: segundos | INR: ratio | APTT: segundos | Fibrinógeno: mg/dL
- Glucosa: mg/dL | Creatinina: mg/dL | Urea: mg/dL
- Sodio, Potasio, Cloro: mmol/L o mEq/L
- Calcio iónico: mmol/L (valores 0.9-1.5, NUNCA >2.0)
- Bilirrubinas: mg/dL | Transaminasas: U/L | Albúmina: g/dL`;

/**
 * Obtiene el prompt apropiado según el tipo de equipo
 */
function getPromptForEquipment(equipmentType) {
  const prompts = {
    [EQUIPMENT_TYPES.GASOMETRY]: GASOMETRY_PROMPT,
    [EQUIPMENT_TYPES.BIS]: BIS_PROMPT,
    [EQUIPMENT_TYPES.HEMODYNAMIC_MONITOR]: HEMODYNAMIC_MONITOR_PROMPT,
    [EQUIPMENT_TYPES.VENTILATOR]: VENTILATOR_PROMPT,
    [EQUIPMENT_TYPES.ROTEM]: ROTEM_PROMPT,
    [EQUIPMENT_TYPES.LAB_PLATFORM]: LAB_PLATFORM_PROMPT,
  };

  return prompts[equipmentType] || null;
}

/**
 * Mapea los campos extraídos a los campos del modelo IntraopRecord
 */
function mapToIntraopFields(equipmentType, extractedData) {
  switch (equipmentType) {
    case EQUIPMENT_TYPES.GASOMETRY:
      return {
        pH: extractedData.pH,
        paCO2: extractedData.pCO2,
        paO2: extractedData.pO2,
        sO2Gas: extractedData.sO2,
        hb: extractedData.ctHb,
        hto: extractedData.hct,
        sodium: extractedData.sodium,
        potassium: extractedData.potassium,
        chloride: extractedData.chloride,
        ionicCalcium: extractedData.ionicCalcium,
        glucose: extractedData.glucose,
        lactate: extractedData.lactate,
        bilirubinGas: extractedData.bilirubin,
        baseExcess: extractedData.baseExcess,
        hco3: extractedData.hco3,
        anionGap: extractedData.anionGap,
        osmolarity: extractedData.osmolarity,
      };

    case EQUIPMENT_TYPES.BIS:
      return {
        bis: extractedData.bis,
        emg: extractedData.emg,
      };

    case EQUIPMENT_TYPES.HEMODYNAMIC_MONITOR:
      return {
        heartRate: extractedData.heartRate,
        rhythmType: extractedData.rhythmType,
        satO2: extractedData.spo2,
        pas: extractedData.pasSystolic,
        pad: extractedData.pasDiastolic,
        pam: extractedData.pam,
        cvp: extractedData.cvp,
        temp: extractedData.temperature,
        tempCentral: extractedData.temperatureCentral,
        stSegment: extractedData.stSegment,
        etCO2: extractedData.etCO2,
        respRate: extractedData.respRate,
      };

    case EQUIPMENT_TYPES.VENTILATOR:
      return {
        ventMode: mapVentMode(extractedData.ventMode),
        tidalVolume: extractedData.tidalVolume,
        respRate: extractedData.respRate,
        ieRatio: extractedData.ieRatio,
        peep: extractedData.peep,
        peakPressure: extractedData.peakPressure,
        plateauPressure: extractedData.plateauPressure,
        compliance: extractedData.compliance,
        minuteVolume: extractedData.minuteVolume,
        fio2: normalizeFio2(extractedData.fio2),
        etCO2: extractedData.etCO2,
        inhalAgent: extractedData.inhalAgent,
        inhalAgentFi: extractedData.inhalAgentFi,
        inhalAgentEt: extractedData.inhalAgentEt,
        inhalAgentMAC: extractedData.inhalAgentMAC,
      };

    case EQUIPMENT_TYPES.ROTEM:
      return {
        // EXTEM
        rotemCtExtem: extractedData.extem?.ct,
        rotemCftExtem: extractedData.extem?.cft,
        rotemA5Extem: extractedData.extem?.a5,
        rotemA10Extem: extractedData.extem?.a10,
        rotemMcfExtem: extractedData.extem?.mcf,
        rotemMl: extractedData.extem?.ml,
        rotemCli30: extractedData.extem?.li30 || extractedData.extem?.cli30,
        rotemCli60: extractedData.extem?.li60 || extractedData.extem?.cli60,
        // FIBTEM
        rotemCtFibtem: extractedData.fibtem?.ct,
        rotemA5Fibtem: extractedData.fibtem?.a5,
        rotemA10Fibtem: extractedData.fibtem?.a10,
        rotemMcfFibtem: extractedData.fibtem?.mcf,
        // INTEM
        rotemCtIntem: extractedData.intem?.ct,
        rotemCftIntem: extractedData.intem?.cft,
        rotemA5Intem: extractedData.intem?.a5,
        rotemA10Intem: extractedData.intem?.a10,
        rotemMcfIntem: extractedData.intem?.mcf,
        // APTEM
        rotemA5Aptem: extractedData.aptem?.a5,
        rotemMcfAptem: extractedData.aptem?.mcf,
        rotemMlAptem: extractedData.aptem?.ml,
        // HEPTEM
        rotemCtHeptem: extractedData.heptem?.ct,
      };

    case EQUIPMENT_TYPES.LAB_PLATFORM:
      return {
        // Hemograma
        hb: extractedData.hemograma?.hemoglobina,
        hto: extractedData.hemograma?.hematocrito,
        platelets: extractedData.hemograma?.plaquetas,
        // Coagulación
        pt: extractedData.coagulacion?.tp,
        inr: extractedData.coagulacion?.inr,
        aptt: extractedData.coagulacion?.aptt,
        fibrinogen: extractedData.coagulacion?.fibrinogeno,
        // Bioquímica
        glucose: extractedData.bioquimica?.glucosa,
        creatinine: extractedData.bioquimica?.creatinina,
        azotemia: extractedData.bioquimica?.urea,
        sodium: extractedData.bioquimica?.sodio,
        potassium: extractedData.bioquimica?.potasio,
        chloride: extractedData.bioquimica?.cloro,
        ionicCalcium: extractedData.bioquimica?.calcioIonico,
        magnesium: extractedData.bioquimica?.magnesio,
        phosphorus: extractedData.bioquimica?.fosforo,
        // Función hepática
        totalBili: extractedData.funcionHepatica?.bilirrubinaTotal,
        directBili: extractedData.funcionHepatica?.bilirrubinaDirecta,
        sgot: extractedData.funcionHepatica?.tgo,
        sgpt: extractedData.funcionHepatica?.tgp,
        albumin: extractedData.funcionHepatica?.albumina,
        proteins: extractedData.funcionHepatica?.proteinasTotales,
        // Otros
        lactate: extractedData.otros?.lactato,
      };

    default:
      return {};
  }
}

/**
 * Mapea string de modo ventilatorio al enum VentilationMode
 */
function mapVentMode(mode) {
  if (!mode) return null;
  const modeUpper = mode.toUpperCase();
  const mapping = {
    VCV: 'VC',
    'VOLUMEN CONTROLADO': 'VC',
    VC: 'VC',
    PCV: 'PC',
    'PRESION CONTROLADA': 'PC',
    PC: 'PC',
    SIMV: 'SIMV',
    PSV: 'PSV',
    CPAP: 'CPAP',
    ESPONTANEA: 'ESPONTANEA',
    MANUAL: 'ESPONTANEA',
  };
  return mapping[modeUpper] || 'OTRO';
}

/**
 * Normaliza FiO2 a fracción (0-1)
 */
function normalizeFio2(fio2) {
  if (fio2 === null || fio2 === undefined) return null;
  // Si es mayor a 1, asumimos que está en porcentaje
  if (fio2 > 1) {
    return fio2 / 100;
  }
  return fio2;
}

module.exports = {
  EQUIPMENT_TYPES,
  getPromptForEquipment,
  mapToIntraopFields,
  GASOMETRY_PROMPT,
  BIS_PROMPT,
  HEMODYNAMIC_MONITOR_PROMPT,
  VENTILATOR_PROMPT,
  ROTEM_PROMPT,
  LAB_PLATFORM_PROMPT,
};
