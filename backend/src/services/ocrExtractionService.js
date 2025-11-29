/**
 * Servicio de Extraccion OCR con Google Cloud (Vision + Gemini)
 * Sistema de Registro Anestesiologico TxH
 *
 * Estrategia 100% Google Cloud:
 * 1. Google Cloud Vision extrae el texto de la imagen (OCR)
 * 2. Google Gemini interpreta el texto y lo estructura en JSON
 *
 * Todo en Google Cloud = una sola factura, mas eficiente.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const {
  EQUIPMENT_TYPES,
  getPromptForEquipment,
  mapToIntraopFields,
} = require('../prompts/ocrPrompts');
const {
  extractTextFromImage,
  detectEquipmentFromText,
} = require('./googleVisionService');

// Modelo Gemini para interpretacion de texto
// Usar gemini-2.5-flash (rapido y economico) por defecto
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Cliente de Gemini
let geminiClient = null;

/**
 * Inicializa el cliente de Gemini
 * Usa la misma API key de Google Cloud
 */
function getGeminiClient() {
  if (!geminiClient) {
    // Gemini usa una API key diferente (Google AI Studio)
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GOOGLE_AI_API_KEY o GEMINI_API_KEY no esta configurada. ' +
        'Obtener en: https://aistudio.google.com/app/apikey'
      );
    }
    geminiClient = new GoogleGenerativeAI(apiKey);
    console.log('[Gemini] Cliente inicializado');
  }
  return geminiClient;
}

/**
 * Rangos fisiologicos para validacion de valores extraidos
 */
const PHYSIOLOGICAL_RANGES = {
  pH: { min: 6.8, max: 7.8 },
  paCO2: { min: 10, max: 120 },
  paO2: { min: 20, max: 600 },
  sO2Gas: { min: 0, max: 100 },
  hb: { min: 3, max: 25 },
  hto: { min: 10, max: 70 },
  sodium: { min: 100, max: 180 },
  potassium: { min: 1, max: 10 },
  chloride: { min: 70, max: 140 },
  ionicCalcium: { min: 0.5, max: 2.0 },
  glucose: { min: 20, max: 800 },
  lactate: { min: 0, max: 30 },
  baseExcess: { min: -30, max: 30 },
  hco3: { min: 5, max: 50 },
  heartRate: { min: 20, max: 300 },
  satO2: { min: 50, max: 100 },
  pas: { min: 40, max: 300 },
  pad: { min: 20, max: 200 },
  pam: { min: 30, max: 200 },
  cvp: { min: -10, max: 40 },
  temp: { min: 25, max: 45 },
  bis: { min: 0, max: 100 },
  emg: { min: 0, max: 100 },
  respRate: { min: 4, max: 60 },
  tidalVolume: { min: 100, max: 1500 },
  peep: { min: 0, max: 30 },
  peakPressure: { min: 5, max: 60 },
  plateauPressure: { min: 5, max: 50 },
  fio2: { min: 0.21, max: 1 },
  etCO2: { min: 10, max: 80 },
  // ROTEM
  rotemCtExtem: { min: 0, max: 1000 },
  rotemCftExtem: { min: 0, max: 1200 },
  rotemA5Extem: { min: 0, max: 100 },
  rotemA10Extem: { min: 0, max: 100 },
  rotemMcfExtem: { min: 0, max: 100 },
  rotemMl: { min: 0, max: 100 },
  rotemCli30: { min: 0, max: 100 },
  rotemCli60: { min: 0, max: 100 },
  rotemA5Fibtem: { min: 0, max: 100 },
  rotemA10Fibtem: { min: 0, max: 100 },
  rotemMcfFibtem: { min: 0, max: 100 },
  rotemCtFibtem: { min: 0, max: 1000 },
  rotemCtIntem: { min: 0, max: 1000 },
  rotemCftIntem: { min: 0, max: 1200 },
  rotemA5Intem: { min: 0, max: 100 },
  rotemA10Intem: { min: 0, max: 100 },
  rotemMcfIntem: { min: 0, max: 100 },
  rotemA5Aptem: { min: 0, max: 100 },
  rotemMcfAptem: { min: 0, max: 100 },
  rotemMlAptem: { min: 0, max: 100 },
  rotemCtHeptem: { min: 0, max: 1000 },
};

/**
 * Valida un valor contra su rango fisiologico
 */
function validatePhysiologicalRange(field, value) {
  if (value === null || value === undefined) {
    return { valid: true, warning: null };
  }

  const range = PHYSIOLOGICAL_RANGES[field];
  if (!range) {
    return { valid: true, warning: null };
  }

  if (value < range.min || value > range.max) {
    return {
      valid: false,
      warning: `${field}: ${value} esta fuera del rango fisiologico esperado (${range.min}-${range.max})`,
    };
  }

  return { valid: true, warning: null };
}

/**
 * Valida todos los campos extraidos
 */
function validateExtractedData(data) {
  const warnings = [];
  const criticalErrors = [];

  for (const [field, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;

    const validation = validatePhysiologicalRange(field, value);
    if (!validation.valid) {
      const criticalFields = ['pH', 'potassium', 'heartRate'];
      if (criticalFields.includes(field)) {
        criticalErrors.push(validation.warning);
      } else {
        warnings.push(validation.warning);
      }
    }
  }

  return { warnings, criticalErrors };
}

/**
 * Extrae JSON de la respuesta de Gemini
 */
function extractJsonFromResponse(text) {
  // Intentar extraer de bloque de codigo
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch {
      // Continuar buscando
    }
  }

  // Intentar extraer JSON directo
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // No se pudo parsear
    }
  }

  return null;
}

/**
 * Genera prompt para interpretar texto extraido por OCR
 */
function getTextInterpretationPrompt(equipmentType, extractedText) {
  const basePrompt = getPromptForEquipment(equipmentType);

  // Instrucciones especiales para lab_platform
  let specialInstructions = '';
  if (equipmentType === 'lab_platform') {
    specialInstructions = `
INSTRUCCIONES CRITICAS PARA LABORATORIO:

FORMATO DE LA PANTALLA:
El texto tiene este formato para cada parametro:
"NombreParametro VALOR_MEDIDO unidad RANGO_REFERENCIA"
Ejemplo: "Sodio en Suero 132 mmol/L 132 - 146"
- Valor medido: 132 (el PRIMER numero)
- Rango referencia: 132-146 (los numeros con guion al final - IGNORAR)

COMO IDENTIFICAR EL VALOR MEDIDO:
1. Es el PRIMER numero que aparece despues del nombre del parametro
2. Esta ANTES de las unidades (mg/dL, mmol/L, etc.)
3. NO tiene guion ("-") al lado

COMO IDENTIFICAR EL RANGO DE REFERENCIA (NO EXTRAER):
1. Son DOS numeros separados por guion: "132 - 146", "3.5 - 5.5", "8.5 - 10.5"
2. Aparecen AL FINAL de la linea
3. Si ves algo como "valor1 - valor2", es el rango, NO el valor medido

CALCIO IONICO - CRITICO:
- SOLO buscar "Calcio ionico" o "Calcio iónico" o "Ca++"
- Valor en mmol/L, tipicamente entre 0.9 y 1.5 mmol/L
- NUNCA mayor a 2.0 mmol/L
- IGNORAR "Calcio total" o "Calcio en suero" (son mg/dL, valores ~8-10)

EJEMPLO CORRECTO:
Texto: "Calcio ionico 1.15 mmol/l 1.15 - 1.33"
→ calcioIonico = 1.15 (valor medido)

SI NO VES "Calcio ionico" ESPECIFICAMENTE:
→ calcioIonico = null (NO usar calcio total)

`;
  }

  return `El siguiente texto fue extraido de una imagen de ${getEquipmentLabel(equipmentType)} usando OCR.
Analiza el texto y extrae los valores medicos solicitados.

TEXTO EXTRAIDO POR OCR:
"""
${extractedText}
"""

IMPORTANTE:
- Los valores pueden estar desordenados o en diferentes lineas
- Busca patrones como "parametro: valor" o "parametro valor unidad"
- Ignora texto irrelevante (fechas, nombres de hospital, etc.)
- Si no encuentras un valor claramente, usa null
${specialInstructions}
${basePrompt}`;
}

function getEquipmentLabel(type) {
  const labels = {
    gasometry: 'gasometria arterial',
    bis: 'monitor BIS',
    hemodynamic_monitor: 'monitor hemodinamico',
    ventilator: 'ventilador/maquina de anestesia',
    rotem: 'ROTEM (tromboelastometria)',
    lab_platform: 'sistema de laboratorio',
  };
  return labels[type] || 'equipo medico';
}

/**
 * Extrae datos usando Google Vision + Gemini (100% Google Cloud)
 */
async function extractWithGoogleCloud(imageBase64, equipmentType, mediaType) {
  console.log(`[OCR] Usando Google Vision + Gemini para ${equipmentType}`);

  // Paso 1: Extraer texto con Google Vision
  let ocrResult;
  try {
    ocrResult = await extractTextFromImage(imageBase64);
  } catch (error) {
    console.error('[OCR] Error en Google Vision:', error.message);
    throw new Error(`Error en Google Vision OCR: ${error.message}`);
  }

  if (!ocrResult.text || ocrResult.text.trim().length === 0) {
    return {
      success: false,
      equipmentType,
      error: 'No se pudo extraer texto de la imagen. Asegúrate de que la imagen sea clara y tenga buena iluminación.',
      rawExtraction: null,
      mappedFields: {},
      confidence: 0,
      validation: { warnings: [], criticalErrors: ['No se encontró texto legible en la imagen'] },
    };
  }

  console.log(`[OCR] Texto extraido (${ocrResult.text.length} chars):`, ocrResult.text.substring(0, 300));

  // Paso 1.5: Detectar tipo de equipo real y comparar con seleccionado
  const detectedType = detectEquipmentFromText(ocrResult.text);
  console.log(`[OCR] Tipo detectado en imagen: ${detectedType}, tipo seleccionado: ${equipmentType}`);

  if (detectedType !== 'unknown' && detectedType !== equipmentType) {
    const selectedLabel = getEquipmentLabel(equipmentType);
    const detectedLabel = getEquipmentLabel(detectedType);
    return {
      success: false,
      equipmentType,
      detectedEquipmentType: detectedType,
      error: `La imagen parece ser de ${detectedLabel}, pero seleccionaste "${selectedLabel}". Por favor, selecciona el tipo de equipo correcto o sube otra imagen.`,
      rawExtraction: null,
      mappedFields: {},
      confidence: 0,
      ocrText: ocrResult.text,
      validation: {
        warnings: [],
        criticalErrors: [`Tipo de equipo incorrecto: imagen de ${detectedLabel}, seleccionado ${selectedLabel}`],
      },
    };
  }

  // Paso 2: Interpretar texto con Gemini
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const prompt = getTextInterpretationPrompt(equipmentType, ocrResult.text);

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    console.log(`[OCR ${equipmentType}] Respuesta de Gemini:`, responseText.substring(0, 500));

    const extractedData = extractJsonFromResponse(responseText);
    if (!extractedData) {
      console.error(`[OCR ${equipmentType}] No se pudo parsear JSON. Respuesta:`, responseText);
      throw new Error('No se pudo extraer JSON valido de la respuesta');
    }

    console.log(`[OCR ${equipmentType}] Datos extraidos:`, JSON.stringify(extractedData, null, 2));

    let mappedFields = mapToIntraopFields(equipmentType, extractedData);

    // Validación especial para lab_platform: detectar errores comunes
    if (equipmentType === 'lab_platform') {
      // Detectar si calcio iónico tiene valor de calcio total (>2.0 mmol/L es fisiológicamente imposible para Ca++)
      if (mappedFields.ionicCalcium && mappedFields.ionicCalcium > 2.0) {
        console.log(`[OCR] Detectado error: Ca iónico=${mappedFields.ionicCalcium} mmol/L es imposible (max fisiológico ~1.5). Probablemente es calcio total. Descartando.`);
        mappedFields.ionicCalcium = null;
      }

      // Detectar valores que son claramente rangos de referencia (patrones comunes)
      // Sodio: rango típico 132-146, si el valor es exactamente un límite común, puede ser el rango
      // Solo descartar si parece ser límite inferior Y hay un patrón sospechoso
      const suspiciousValues = {
        sodium: [132, 135, 136, 145, 146], // Límites comunes de rango
        potassium: [3.5, 5.0, 5.1, 5.5], // Límites comunes de rango
        chloride: [98, 99, 108, 109], // Límites comunes de rango
      };

      // Log para debug
      console.log(`[OCR lab_platform] Valores antes de validación:`, JSON.stringify(mappedFields, null, 2));
    }

    console.log(`[OCR ${equipmentType}] Campos mapeados:`, JSON.stringify(mappedFields, null, 2));

    const validation = validateExtractedData(mappedFields);
    const confidence = extractedData.confidence || calculateConfidence(mappedFields);

    // Verificar si se extrajeron valores útiles
    const nonNullValues = Object.values(mappedFields).filter(v => v !== null && v !== undefined);
    if (nonNullValues.length === 0) {
      const label = getEquipmentLabel(equipmentType);

      // Generar mensaje de error descriptivo
      let errorMessage = `No se pudieron extraer valores de ${label}.`;
      let suggestions = [];

      // Detectar posibles causas
      if (ocrResult.text.length < 100) {
        suggestions.push('La imagen tiene muy poco texto legible. Intenta con una foto más nítida.');
      }

      if (extractedData.notes) {
        // Gemini dejó una nota explicativa
        errorMessage += ` Observación del análisis: ${extractedData.notes}`;
      }

      // Sugerencias según el tipo de equipo
      if (equipmentType === 'lab_platform') {
        suggestions.push('Asegúrate de que la imagen muestre la columna de resultados con los valores numéricos.');
        suggestions.push('Los valores deben tener un círculo verde (●) al lado para ser reconocidos.');
      } else if (equipmentType === 'rotem') {
        suggestions.push('Asegúrate de que la imagen muestre la tabla de valores (CT, CFT, A5, A10, MCF).');
        suggestions.push('Los tests EXTEM, FIBTEM, INTEM deben estar visibles.');
      } else if (equipmentType === 'gasometry') {
        suggestions.push('Asegúrate de que el ticket de gasometría muestre los valores numéricos claramente.');
      }

      if (suggestions.length > 0) {
        errorMessage += '\n\nSugerencias:\n• ' + suggestions.join('\n• ');
      }

      return {
        success: false,
        equipmentType,
        error: errorMessage,
        rawExtraction: extractedData,
        mappedFields: {},
        confidence: 0,
        ocrMethod: 'google_cloud',
        ocrText: ocrResult.text,
        validation: {
          warnings: [],
          criticalErrors: [`No se encontraron valores legibles de ${label}`],
        },
      };
    }

    return {
      success: true,
      equipmentType,
      rawExtraction: extractedData,
      mappedFields,
      confidence,
      validation,
      notes: extractedData.notes || null,
      ocrMethod: 'google_cloud',
      ocrText: ocrResult.text,
      ocrConfidence: ocrResult.confidence,
    };
  } catch (error) {
    console.error('[OCR] Error en interpretacion Gemini:', error);
    return {
      success: false,
      equipmentType,
      error: error.message,
      rawExtraction: null,
      mappedFields: {},
      confidence: 0,
      ocrMethod: 'google_cloud',
      ocrText: ocrResult.text,
      validation: { warnings: [], criticalErrors: [error.message] },
    };
  }
}

/**
 * Calcula confianza basada en cantidad de campos extraidos
 */
function calculateConfidence(mappedFields) {
  const totalFields = Object.keys(mappedFields).length;
  if (totalFields === 0) return 0;

  const nonNullFields = Object.values(mappedFields).filter(
    (v) => v !== null && v !== undefined
  ).length;

  return Math.round((nonNullFields / totalFields) * 100) / 100;
}

/**
 * Extrae datos de una imagen de equipo medico
 */
async function extractFromImage(imageBase64, equipmentType, mediaType = 'image/jpeg') {
  // Validar tipo de equipo
  if (!Object.values(EQUIPMENT_TYPES).includes(equipmentType)) {
    throw new Error(`Tipo de equipo no valido: ${equipmentType}`);
  }

  const validMediaTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validMediaTypes.includes(mediaType)) {
    throw new Error(`Tipo de imagen no soportado: ${mediaType}`);
  }

  return await extractWithGoogleCloud(imageBase64, equipmentType, mediaType);
}

/**
 * Detecta automaticamente el tipo de equipo desde la imagen
 */
async function detectEquipmentType(imageBase64, mediaType = 'image/jpeg') {
  // Usar Google Vision para extraer texto y detectar tipo
  try {
    const ocrResult = await extractTextFromImage(imageBase64);
    if (ocrResult.text) {
      const detected = detectEquipmentFromText(ocrResult.text);
      if (detected !== 'unknown') {
        console.log(`[OCR] Tipo detectado: ${detected}`);
        return detected;
      }
    }
  } catch (error) {
    console.warn('[OCR] Error detectando tipo:', error.message);
  }

  // Fallback: usar Gemini para deteccion
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const detectionPrompt = `Analiza este texto extraido de una imagen de equipo medico y determina que tipo de equipo es.

TEXTO:
"""
${(await extractTextFromImage(imageBase64)).text || 'No se pudo extraer texto'}
"""

Responde UNICAMENTE con una de estas opciones exactas:
- "gasometry" si es una gasometria arterial (ABL90, ticket con pH, pO2, etc.)
- "bis" si es un monitor BIS de profundidad anestesica
- "hemodynamic_monitor" si es un monitor de signos vitales (FC, SpO2, PA)
- "ventilator" si es un ventilador o maquina de anestesia
- "rotem" si es un resultado de ROTEM (tromboelastometria)
- "lab_platform" si es una pantalla de sistema de laboratorio
- "unknown" si no puedes determinarlo

Responde solo con la palabra, sin explicacion.`;

  try {
    const result = await model.generateContent(detectionPrompt);
    const response = await result.response;
    const detectedType = response.text().trim().toLowerCase();

    if (Object.values(EQUIPMENT_TYPES).includes(detectedType)) {
      return detectedType;
    }
    return 'unknown';
  } catch (error) {
    console.error('Error detectando tipo de equipo:', error);
    return 'unknown';
  }
}

/**
 * Extrae datos con deteccion automatica de tipo de equipo
 */
async function extractWithAutoDetection(imageBase64, mediaType = 'image/jpeg') {
  const equipmentType = await detectEquipmentType(imageBase64, mediaType);

  if (equipmentType === 'unknown') {
    return {
      success: false,
      error: 'No se pudo detectar el tipo de equipo medico en la imagen',
      equipmentType: 'unknown',
      mappedFields: {},
      confidence: 0,
    };
  }

  return extractFromImage(imageBase64, equipmentType, mediaType);
}

module.exports = {
  EQUIPMENT_TYPES,
  extractFromImage,
  extractWithAutoDetection,
  detectEquipmentType,
  validateExtractedData,
  validatePhysiologicalRange,
  PHYSIOLOGICAL_RANGES,
};
