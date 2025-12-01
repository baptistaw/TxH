/**
 * Servicio de OCR con Google Cloud Vision
 * Sistema de Registro Anestesiologico TxH
 *
 * Extrae texto de imagenes utilizando Google Cloud Vision API
 * Mucho mas economico que usar Claude Vision directamente
 */

const vision = require('@google-cloud/vision');

// Cliente de Google Cloud Vision
let visionClient = null;

/**
 * Inicializa el cliente de Google Cloud Vision
 * Soporta autenticacion por:
 * 1. Variable de entorno GOOGLE_APPLICATION_CREDENTIALS (ruta al archivo JSON)
 * 2. Variable de entorno GOOGLE_CLOUD_CREDENTIALS (JSON como string)
 * 3. Credenciales por defecto de la maquina (ADC)
 */
function getVisionClient() {
  if (!visionClient) {
    // Opcion 1: Credenciales como JSON string o Base64 en variable de entorno
    if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
      try {
        let credentialsString = process.env.GOOGLE_CLOUD_CREDENTIALS;

        // Detectar si es Base64 (no empieza con {)
        if (!credentialsString.trim().startsWith('{')) {
          console.log('[Google Vision] Detectado formato Base64, decodificando...');
          credentialsString = Buffer.from(credentialsString, 'base64').toString('utf8');
        }

        const credentials = JSON.parse(credentialsString);
        visionClient = new vision.ImageAnnotatorClient({ credentials });
        console.log('[Google Vision] Cliente inicializado con credenciales JSON');
      } catch (error) {
        console.error('[Google Vision] Error parseando GOOGLE_CLOUD_CREDENTIALS:', error.message);
        throw new Error('GOOGLE_CLOUD_CREDENTIALS no es un JSON valido (ni texto ni Base64)');
      }
    }
    // Opcion 2: Ruta al archivo de credenciales
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      visionClient = new vision.ImageAnnotatorClient();
      console.log('[Google Vision] Cliente inicializado con archivo de credenciales');
    }
    // Opcion 3: Credenciales por defecto (ADC)
    else {
      try {
        visionClient = new vision.ImageAnnotatorClient();
        console.log('[Google Vision] Cliente inicializado con credenciales por defecto (ADC)');
      } catch (error) {
        throw new Error(
          'No se encontraron credenciales de Google Cloud. ' +
          'Configura GOOGLE_APPLICATION_CREDENTIALS o GOOGLE_CLOUD_CREDENTIALS'
        );
      }
    }
  }
  return visionClient;
}

/**
 * Extrae texto de una imagen usando DOCUMENT_TEXT_DETECTION
 * Optimizado para documentos con texto estructurado (mejor para equipos medicos)
 *
 * @param {Buffer|string} imageInput - Buffer de imagen o base64 string
 * @returns {Promise<{text: string, blocks: Array, confidence: number}>}
 */
async function extractTextFromImage(imageInput) {
  const client = getVisionClient();

  // Convertir base64 a buffer si es necesario
  let imageBuffer;
  if (typeof imageInput === 'string') {
    // Remover prefijo data:image/... si existe
    const base64Data = imageInput.replace(/^data:image\/\w+;base64,/, '');
    imageBuffer = Buffer.from(base64Data, 'base64');
  } else {
    imageBuffer = imageInput;
  }

  console.log(`[Google Vision] Procesando imagen de ${(imageBuffer.length / 1024).toFixed(1)} KB`);

  try {
    // Usar DOCUMENT_TEXT_DETECTION para mejor precision en documentos
    const [result] = await client.documentTextDetection({
      image: { content: imageBuffer },
    });

    const fullTextAnnotation = result.fullTextAnnotation;

    if (!fullTextAnnotation) {
      console.log('[Google Vision] No se encontro texto en la imagen');
      return {
        text: '',
        blocks: [],
        confidence: 0,
        raw: result,
      };
    }

    // Extraer texto completo
    const text = fullTextAnnotation.text || '';

    // Extraer bloques de texto con posiciones (util para debug)
    const blocks = [];
    if (fullTextAnnotation.pages) {
      for (const page of fullTextAnnotation.pages) {
        for (const block of page.blocks || []) {
          const blockText = block.paragraphs
            ?.map(p => p.words?.map(w => w.symbols?.map(s => s.text).join('')).join(' ')).join('\n') || '';

          blocks.push({
            text: blockText,
            confidence: block.confidence,
            boundingBox: block.boundingBox,
          });
        }
      }
    }

    // Calcular confianza promedio
    const avgConfidence = blocks.length > 0
      ? blocks.reduce((sum, b) => sum + (b.confidence || 0), 0) / blocks.length
      : 0;

    console.log(`[Google Vision] Texto extraido: ${text.length} caracteres, confianza: ${(avgConfidence * 100).toFixed(1)}%`);

    return {
      text,
      blocks,
      confidence: avgConfidence,
      raw: result,
    };
  } catch (error) {
    console.error('[Google Vision] Error en OCR:', error.message);
    throw error;
  }
}

/**
 * Extrae texto de una imagen usando TEXT_DETECTION
 * Mejor para texto disperso o no estructurado
 *
 * @param {Buffer|string} imageInput - Buffer de imagen o base64 string
 * @returns {Promise<{text: string, words: Array, confidence: number}>}
 */
async function extractTextSimple(imageInput) {
  const client = getVisionClient();

  let imageBuffer;
  if (typeof imageInput === 'string') {
    const base64Data = imageInput.replace(/^data:image\/\w+;base64,/, '');
    imageBuffer = Buffer.from(base64Data, 'base64');
  } else {
    imageBuffer = imageInput;
  }

  try {
    const [result] = await client.textDetection({
      image: { content: imageBuffer },
    });

    const detections = result.textAnnotations || [];

    if (detections.length === 0) {
      return {
        text: '',
        words: [],
        confidence: 0,
      };
    }

    // El primer resultado es el texto completo
    const fullText = detections[0]?.description || '';

    // Los siguientes son palabras individuales con posiciones
    const words = detections.slice(1).map(d => ({
      text: d.description,
      boundingBox: d.boundingPoly,
    }));

    return {
      text: fullText,
      words,
      confidence: 0.9, // TEXT_DETECTION no retorna confianza individual
    };
  } catch (error) {
    console.error('[Google Vision] Error en OCR simple:', error.message);
    throw error;
  }
}

/**
 * Detecta el tipo de equipo medico basado en el texto extraido
 * @param {string} text - Texto extraido de la imagen
 * @returns {string} - Tipo de equipo detectado
 */
function detectEquipmentFromText(text) {
  const textLower = text.toLowerCase();

  // LABORATORIO - Detectar PRIMERO porque tiene muchas palabras clave distintivas
  // que no deben confundirse con otros equipos
  if (
    textLower.includes('mantenimiento de peticiones') ||
    textLower.includes('hemograma') ||
    textLower.includes('serie plaquetaria') ||
    textLower.includes('plaquetas') ||
    textLower.includes('leucocitos') ||
    textLower.includes('eritroblastos') ||
    textLower.includes('trombocitopenia') ||
    textLower.includes('coagulación') ||
    textLower.includes('coagulacion') ||
    textLower.includes('crasis') ||
    textLower.includes('analitica en sangre') ||
    textLower.includes('analítica en sangre') ||
    textLower.includes('ionograma') ||
    textLower.includes('sodio en suero') ||
    textLower.includes('potasio en suero') ||
    textLower.includes('calcio ionico') ||
    textLower.includes('calcio iónico') ||
    textLower.includes('cloro en suero') ||
    textLower.includes('perfil indices') ||
    textLower.includes('inr') ||
    textLower.includes('fibrinogeno') ||
    textLower.includes('fibrinógeno') ||
    (textLower.includes('tp') && textLower.includes('aptt')) ||
    (textLower.includes('glucosa') && textLower.includes('mg/dl')) ||
    (textLower.includes('creatinina') && textLower.includes('mg/dl'))
  ) {
    return 'lab_platform';
  }

  // Gasometria - ABL90, pH, pCO2, pO2, etc.
  if (
    textLower.includes('abl') ||
    (textLower.includes('ph') && textLower.includes('pco2')) ||
    (textLower.includes('pao2') || textLower.includes('po2')) ||
    textLower.includes('base excess') ||
    textLower.includes('hco3') ||
    textLower.includes('cthb')
  ) {
    return 'gasometry';
  }

  // ROTEM - EXTEM, FIBTEM, INTEM, APTEM, HEPTEM
  // Usar palabras MUY especificas de ROTEM que no aparecen en otros contextos
  // IMPORTANTE: APTT y TP NUNCA aparecen en ROTEM (son de laboratorio)
  const hasRotemKeywords = (
    textLower.includes('extem') ||
    textLower.includes('fibtem') ||
    textLower.includes('heptem') ||
    textLower.includes('rotem') ||
    textLower.includes('tromboelastometria') ||
    textLower.includes('tromboelastometría') ||
    // Solo detectar como ROTEM si tiene MCF (firmeza coagulo) Y A5/A10 (amplitudes)
    (textLower.includes('mcf') && (textLower.includes('a5') || textLower.includes('a10')))
  );
  // APTT y TP son exclusivos de laboratorio, nunca de ROTEM
  const hasLabOnlyKeywords = textLower.includes('aptt') || textLower.includes('tp-');

  if (hasRotemKeywords && !hasLabOnlyKeywords) {
    return 'rotem';
  }

  // BIS - indice biespectral
  if (
    textLower.includes('bis') ||
    textLower.includes('biespectral') ||
    (textLower.includes('emg') && textLower.includes('sqi'))
  ) {
    return 'bis';
  }

  // Ventilador - modos ventilatorios, volumenes
  if (
    textLower.includes('peep') ||
    textLower.includes('vt ') ||
    textLower.includes('tidal') ||
    textLower.includes('fio2') ||
    textLower.includes('ventil') ||
    textLower.includes('ppeak') ||
    textLower.includes('plateau')
  ) {
    return 'ventilator';
  }

  // Monitor hemodinamico - FC, PA, SpO2
  if (
    (textLower.includes('fc') || textLower.includes('hr')) &&
    (textLower.includes('spo2') || textLower.includes('sat'))
  ) {
    return 'hemodynamic_monitor';
  }

  return 'unknown';
}

module.exports = {
  getVisionClient,
  extractTextFromImage,
  extractTextSimple,
  detectEquipmentFromText,
};
