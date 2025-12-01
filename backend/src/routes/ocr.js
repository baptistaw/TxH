/**
 * Rutas para Extracción OCR de Imágenes Médicas
 * POST /api/ocr/extract - Extrae datos de una imagen con tipo especificado
 * POST /api/ocr/extract-auto - Detecta tipo automáticamente y extrae
 * GET /api/ocr/equipment-types - Lista tipos de equipos soportados
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../middlewares/auth');
const {
  EQUIPMENT_TYPES,
  extractFromImage,
  extractWithAutoDetection,
  detectEquipmentType,
} = require('../services/ocrExtractionService');

// Configurar multer para recibir imágenes en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no soportado: ${file.mimetype}. Usa: ${allowedTypes.join(', ')}`));
    }
  },
});

/**
 * GET /api/ocr/health
 * Diagnóstico de la conexión con Google Cloud Vision
 * NO requiere autenticación para facilitar debugging
 */
router.get('/health', async (req, res) => {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    googleCloudCredentials: {
      GOOGLE_CLOUD_CREDENTIALS: process.env.GOOGLE_CLOUD_CREDENTIALS
        ? `SET (${process.env.GOOGLE_CLOUD_CREDENTIALS.length} chars, starts with: ${process.env.GOOGLE_CLOUD_CREDENTIALS.substring(0, 10)}...)`
        : 'NOT SET',
      GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || 'NOT SET',
    },
    visionApiTest: null,
  };

  try {
    // Intentar crear cliente y hacer una petición de prueba
    const { getVisionClient } = require('../services/googleVisionService');
    const client = getVisionClient();
    diagnostics.visionClientCreated = true;

    // Imagen de prueba mínima (1x1 pixel)
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const [result] = await client.textDetection({
      image: { content: testImageBuffer },
    });

    diagnostics.visionApiTest = {
      success: true,
      message: 'Cloud Vision API funcionando correctamente',
      annotationsFound: result.textAnnotations?.length || 0,
    };

    res.json({
      success: true,
      message: 'OCR service is healthy',
      diagnostics,
    });
  } catch (error) {
    diagnostics.visionApiTest = {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details || null,
    };

    res.status(500).json({
      success: false,
      message: 'OCR service error',
      diagnostics,
    });
  }
});

/**
 * GET /api/ocr/equipment-types
 * Lista todos los tipos de equipos médicos soportados
 */
router.get('/equipment-types', authenticate, (req, res) => {
  const types = Object.entries(EQUIPMENT_TYPES).map(([key, value]) => ({
    id: value,
    name: key,
    label: getEquipmentLabel(value),
    description: getEquipmentDescription(value),
  }));

  res.json({
    success: true,
    equipmentTypes: types,
  });
});

/**
 * POST /api/ocr/extract
 * Extrae datos de una imagen con tipo de equipo especificado
 *
 * Body (multipart/form-data):
 * - image: archivo de imagen
 * - equipmentType: tipo de equipo (gasometry, bis, hemodynamic_monitor, ventilator, rotem, lab_platform)
 *
 * O Body (JSON):
 * - imageBase64: imagen en base64
 * - mediaType: tipo MIME de la imagen
 * - equipmentType: tipo de equipo
 */
router.post('/extract', authenticate, upload.single('image'), async (req, res) => {
  try {
    let imageBase64, mediaType, equipmentType;

    // Verificar si viene como multipart o JSON
    if (req.file) {
      // Imagen viene como archivo
      imageBase64 = req.file.buffer.toString('base64');
      mediaType = req.file.mimetype;
      equipmentType = req.body.equipmentType;
    } else if (req.body.imageBase64) {
      // Imagen viene como base64 en JSON
      imageBase64 = req.body.imageBase64;
      mediaType = req.body.mediaType || 'image/jpeg';
      equipmentType = req.body.equipmentType;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Se requiere una imagen (como archivo o base64)',
      });
    }

    // Validar tipo de equipo
    if (!equipmentType) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere especificar el tipo de equipo (equipmentType)',
        validTypes: Object.values(EQUIPMENT_TYPES),
      });
    }

    if (!Object.values(EQUIPMENT_TYPES).includes(equipmentType)) {
      return res.status(400).json({
        success: false,
        error: `Tipo de equipo no válido: ${equipmentType}`,
        validTypes: Object.values(EQUIPMENT_TYPES),
      });
    }

    // Extraer datos
    const result = await extractFromImage(imageBase64, equipmentType, mediaType);

    if (result.success) {
      res.json(result);
    } else {
      res.status(422).json(result);
    }
  } catch (error) {
    console.error('Error en extracción OCR:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/ocr/extract-auto
 * Detecta automáticamente el tipo de equipo y extrae datos
 *
 * Body (multipart/form-data):
 * - image: archivo de imagen
 *
 * O Body (JSON):
 * - imageBase64: imagen en base64
 * - mediaType: tipo MIME de la imagen
 */
router.post('/extract-auto', authenticate, upload.single('image'), async (req, res) => {
  try {
    let imageBase64, mediaType;

    // Verificar si viene como multipart o JSON
    if (req.file) {
      imageBase64 = req.file.buffer.toString('base64');
      mediaType = req.file.mimetype;
    } else if (req.body.imageBase64) {
      imageBase64 = req.body.imageBase64;
      mediaType = req.body.mediaType || 'image/jpeg';
    } else {
      return res.status(400).json({
        success: false,
        error: 'Se requiere una imagen (como archivo o base64)',
      });
    }

    // Extraer con detección automática
    const result = await extractWithAutoDetection(imageBase64, mediaType);

    if (result.success) {
      res.json(result);
    } else {
      res.status(422).json(result);
    }
  } catch (error) {
    console.error('Error en extracción OCR automática:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/ocr/extract-batch
 * Procesa múltiples imágenes en paralelo con auto-detección
 *
 * Body (JSON):
 * - images: Array de { imageBase64, mediaType? }
 *
 * IMPORTANTE: Si hay múltiples imágenes del mismo tipo de equipo (ej: 2 fotos
 * del monitor hemodinámico), solo se usan los valores de la imagen más reciente
 * (la última en el array). Esto evita conflictos cuando los valores varían
 * entre capturas consecutivas.
 *
 * Retorna todos los resultados combinados y los valores merged
 */
router.post('/extract-batch', authenticate, async (req, res) => {
  try {
    const { images } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un array de imágenes en el campo "images"',
      });
    }

    if (images.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Máximo 10 imágenes por batch',
      });
    }

    console.log(`[OCR Batch] Procesando ${images.length} imágenes...`);

    // Procesar todas las imágenes en paralelo
    const results = await Promise.all(
      images.map(async (img, index) => {
        try {
          const imageBase64 = img.imageBase64;
          const mediaType = img.mediaType || 'image/jpeg';

          if (!imageBase64) {
            return {
              index,
              success: false,
              error: 'Imagen sin datos base64',
            };
          }

          const result = await extractWithAutoDetection(imageBase64, mediaType);
          return {
            index,
            ...result,
          };
        } catch (error) {
          return {
            index,
            success: false,
            error: error.message,
          };
        }
      })
    );

    // Agrupar resultados exitosos por tipo de equipo
    // - lab_platform: combinar TODAS las imágenes (cada una puede tener diferentes parámetros)
    // - otros equipos: solo guardar la imagen más reciente (mismos parámetros, valores diferentes)
    const resultsByType = {};
    const labPlatformResults = []; // Acumular todas las imágenes de laboratorio
    const duplicatesSkipped = [];

    // Equipos que deben combinarse (tienen diferentes parámetros en cada imagen)
    const combineAllTypes = ['lab_platform'];

    results.forEach((result) => {
      if (result.success && result.equipmentType) {
        const equipmentType = result.equipmentType;

        if (combineAllTypes.includes(equipmentType)) {
          // Para lab_platform: acumular todas las imágenes
          labPlatformResults.push(result);
        } else {
          // Para otros equipos: solo la más reciente
          const existingResult = resultsByType[equipmentType];

          if (!existingResult) {
            resultsByType[equipmentType] = result;
          } else if (result.index > existingResult.index) {
            duplicatesSkipped.push({
              equipmentType: equipmentType,
              skippedIndex: existingResult.index,
              usedIndex: result.index,
            });
            resultsByType[equipmentType] = result;
          } else {
            duplicatesSkipped.push({
              equipmentType: equipmentType,
              skippedIndex: result.index,
              usedIndex: existingResult.index,
            });
          }
        }
      }
    });

    // Combinar valores de todas las fuentes
    const mergedFields = {};
    const equipmentTypesDetected = [];
    const allWarnings = [];
    const allCriticalErrors = [];

    // Primero procesar imágenes de laboratorio (combinar todas)
    if (labPlatformResults.length > 0) {
      equipmentTypesDetected.push('lab_platform');
      console.log(`[OCR Batch] Combinando ${labPlatformResults.length} imágenes de laboratorio`);

      // Ordenar por índice para que valores más recientes sobrescriban anteriores si hay conflicto
      labPlatformResults.sort((a, b) => a.index - b.index);

      labPlatformResults.forEach((result) => {
        if (result.mappedFields) {
          Object.entries(result.mappedFields).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
              // Si ya existe el valor y es diferente, usar el más reciente (último)
              if (mergedFields[key] !== undefined && mergedFields[key] !== value) {
                console.log(`[OCR Batch] Lab: ${key} actualizado de ${mergedFields[key]} a ${value}`);
              }
              mergedFields[key] = value;
            }
          });
        }

        if (result.validation?.warnings) {
          allWarnings.push(...result.validation.warnings);
        }
        if (result.validation?.criticalErrors) {
          allCriticalErrors.push(...result.validation.criticalErrors);
        }
      });

      if (labPlatformResults.length > 1) {
        allWarnings.push(
          `Se combinaron ${labPlatformResults.length} imágenes de Laboratorio para obtener todos los parámetros.`
        );
      }
    }

    // Luego procesar otros equipos (una imagen por tipo)
    Object.values(resultsByType).forEach((result) => {
      if (result.equipmentType) {
        equipmentTypesDetected.push(result.equipmentType);
      }

      if (result.mappedFields) {
        Object.entries(result.mappedFields).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            mergedFields[key] = value;
          }
        });
      }

      if (result.validation?.warnings) {
        allWarnings.push(...result.validation.warnings);
      }
      if (result.validation?.criticalErrors) {
        allCriticalErrors.push(...result.validation.criticalErrors);
      }
    });

    // Agregar warning si se omitieron imágenes duplicadas (solo para equipos no-lab)
    if (duplicatesSkipped.length > 0) {
      const typeLabels = {
        gasometry: 'Gasometría',
        bis: 'BIS',
        hemodynamic_monitor: 'Monitor Hemodinámico',
        ventilator: 'Ventilador',
        rotem: 'ROTEM',
      };

      duplicatesSkipped.forEach((dup) => {
        const label = typeLabels[dup.equipmentType] || dup.equipmentType;
        allWarnings.push(
          `Se detectaron múltiples imágenes de ${label}. Se usó la imagen #${dup.usedIndex + 1} (más reciente).`
        );
      });
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;
    // Contar tipos únicos: otros equipos + lab_platform si hay
    const usedCount = Object.keys(resultsByType).length + (labPlatformResults.length > 0 ? 1 : 0);

    console.log(
      `[OCR Batch] Completado: ${successCount} éxitos, ${failCount} errores, ${usedCount} tipos únicos usados`
    );

    if (duplicatesSkipped.length > 0) {
      console.log(`[OCR Batch] Imágenes duplicadas omitidas: ${duplicatesSkipped.length}`);
    }

    res.json({
      success: usedCount > 0,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failCount,
        uniqueTypesUsed: usedCount,
        labImagesCombined: labPlatformResults.length,
        duplicatesSkipped: duplicatesSkipped.length,
        equipmentTypesDetected,
      },
      mergedFields,
      validation: {
        warnings: [...new Set(allWarnings)],
        criticalErrors: [...new Set(allCriticalErrors)],
      },
      results, // Resultados individuales por si se necesitan
    });
  } catch (error) {
    console.error('Error en extracción OCR batch:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/ocr/detect-type
 * Solo detecta el tipo de equipo sin extraer datos
 *
 * Útil para previsualización antes de confirmar extracción
 */
router.post('/detect-type', authenticate, upload.single('image'), async (req, res) => {
  try {
    let imageBase64, mediaType;

    if (req.file) {
      imageBase64 = req.file.buffer.toString('base64');
      mediaType = req.file.mimetype;
    } else if (req.body.imageBase64) {
      imageBase64 = req.body.imageBase64;
      mediaType = req.body.mediaType || 'image/jpeg';
    } else {
      return res.status(400).json({
        success: false,
        error: 'Se requiere una imagen (como archivo o base64)',
      });
    }

    const detectedType = await detectEquipmentType(imageBase64, mediaType);

    res.json({
      success: detectedType !== 'unknown',
      equipmentType: detectedType,
      label: getEquipmentLabel(detectedType),
      description: getEquipmentDescription(detectedType),
    });
  } catch (error) {
    console.error('Error detectando tipo de equipo:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Obtiene etiqueta legible para tipo de equipo
 */
function getEquipmentLabel(type) {
  const labels = {
    [EQUIPMENT_TYPES.GASOMETRY]: 'Gasometría Arterial',
    [EQUIPMENT_TYPES.BIS]: 'Monitor BIS',
    [EQUIPMENT_TYPES.HEMODYNAMIC_MONITOR]: 'Monitor Hemodinámico',
    [EQUIPMENT_TYPES.VENTILATOR]: 'Ventilador / Máquina de Anestesia',
    [EQUIPMENT_TYPES.ROTEM]: 'ROTEM',
    [EQUIPMENT_TYPES.LAB_PLATFORM]: 'Plataforma de Laboratorio',
    unknown: 'Desconocido',
  };
  return labels[type] || 'Desconocido';
}

/**
 * Obtiene descripción para tipo de equipo
 */
function getEquipmentDescription(type) {
  const descriptions = {
    [EQUIPMENT_TYPES.GASOMETRY]: 'Ticket o pantalla de gasometría ABL90 con pH, gases y electrolitos',
    [EQUIPMENT_TYPES.BIS]: 'Monitor de profundidad anestésica (BIS, EMG)',
    [EQUIPMENT_TYPES.HEMODYNAMIC_MONITOR]: 'Monitor multiparamétrico (FC, SpO2, PA, PVC, ECG)',
    [EQUIPMENT_TYPES.VENTILATOR]: 'Pantalla de ventilador o máquina de anestesia con parámetros ventilatorios',
    [EQUIPMENT_TYPES.ROTEM]: 'Resultado de tromboelastometría rotacional (EXTEM, FIBTEM, INTEM, etc.)',
    [EQUIPMENT_TYPES.LAB_PLATFORM]: 'Sistema de laboratorio hospitalario con hemograma, coagulación, bioquímica',
    unknown: 'No se pudo identificar el tipo de equipo',
  };
  return descriptions[type] || 'No se pudo identificar el tipo de equipo';
}

module.exports = router;
