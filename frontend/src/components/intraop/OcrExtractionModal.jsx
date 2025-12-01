'use client';

/**
 * Modal de Extracción OCR de Imágenes Médicas - Versión Simplificada
 *
 * Flujo mejorado:
 * 1. Subir/capturar múltiples imágenes de cualquier equipo
 * 2. El sistema detecta automáticamente el tipo y extrae los datos
 * 3. Revisar y aplicar los valores combinados
 */

import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';

// Labels legibles para los campos extraídos
const FIELD_LABELS = {
  // Gasometría
  pH: 'pH',
  paCO2: 'pCO2 (mmHg)',
  paO2: 'pO2 (mmHg)',
  sO2Gas: 'sO2 (%)',
  hb: 'Hemoglobina (g/dL)',
  hto: 'Hematocrito (%)',
  sodium: 'Sodio (mEq/L)',
  potassium: 'Potasio (mEq/L)',
  chloride: 'Cloro (mEq/L)',
  ionicCalcium: 'Ca++ (mmol/L)',
  glucose: 'Glucosa (mg/dL)',
  lactate: 'Lactato (mmol/L)',
  bilirubinGas: 'Bilirrubina (mg/dL)',
  baseExcess: 'Exceso de Base (mEq/L)',
  hco3: 'Bicarbonato (mEq/L)',
  anionGap: 'Anion Gap (mEq/L)',
  osmolarity: 'Osmolaridad (mOsm/kg)',
  // Monitor BIS
  bis: 'BIS',
  emg: 'EMG (dB)',
  // Monitor Hemodinámico
  heartRate: 'Frecuencia Cardíaca (lpm)',
  rhythmType: 'Ritmo',
  satO2: 'SpO2 (%)',
  pas: 'PA Sistólica (mmHg)',
  pad: 'PA Diastólica (mmHg)',
  pam: 'PAM (mmHg)',
  cvp: 'PVC (cmH2O)',
  temp: 'Temperatura (°C)',
  tempCentral: 'Temperatura Central (°C)',
  stSegment: 'Segmento ST (mm)',
  etCO2: 'EtCO2 (mmHg)',
  respRate: 'Frecuencia Respiratoria (rpm)',
  // Ventilador
  ventMode: 'Modo Ventilatorio',
  tidalVolume: 'Volumen Tidal (mL)',
  peep: 'PEEP (cmH2O)',
  peakPressure: 'Ppico (cmH2O)',
  plateauPressure: 'Pplateau (cmH2O)',
  ieRatio: 'Relación I:E',
  compliance: 'Compliance (mL/cmH2O)',
  minuteVolume: 'Volumen Minuto (L/min)',
  fio2: 'FiO2 (%)',
  inhalAgent: 'Agente Inhalatorio',
  inhalAgentFi: 'Fi Agente (%)',
  inhalAgentEt: 'Et Agente (%)',
  inhalAgentMAC: 'MAC',
  // ROTEM
  rotemCtExtem: 'CT EXTEM (s)',
  rotemCftExtem: 'CFT EXTEM (s)',
  rotemA5Extem: 'A5 EXTEM (mm)',
  rotemA10Extem: 'A10 EXTEM (mm)',
  rotemMcfExtem: 'MCF EXTEM (mm)',
  rotemMl: 'ML EXTEM (%)',
  rotemCli30: 'LI30 EXTEM (%)',
  rotemCli60: 'LI60 EXTEM (%)',
  rotemCtFibtem: 'CT FIBTEM (s)',
  rotemA5Fibtem: 'A5 FIBTEM (mm)',
  rotemA10Fibtem: 'A10 FIBTEM (mm)',
  rotemMcfFibtem: 'MCF FIBTEM (mm)',
  rotemCtIntem: 'CT INTEM (s)',
  rotemCftIntem: 'CFT INTEM (s)',
  rotemA5Intem: 'A5 INTEM (mm)',
  rotemA10Intem: 'A10 INTEM (mm)',
  rotemMcfIntem: 'MCF INTEM (mm)',
  rotemA5Aptem: 'A5 APTEM (mm)',
  rotemMcfAptem: 'MCF APTEM (mm)',
  rotemMlAptem: 'ML APTEM (%)',
  rotemCtHeptem: 'CT HEPTEM (s)',
  // Laboratorio
  platelets: 'Plaquetas (x10³/µL)',
  pt: 'TP (s)',
  inr: 'INR',
  aptt: 'APTT (s)',
  fibrinogen: 'Fibrinógeno (mg/dL)',
  creatinine: 'Creatinina (mg/dL)',
  azotemia: 'Urea (mg/dL)',
  magnesium: 'Magnesio (mEq/L)',
  phosphorus: 'Fósforo (mg/dL)',
  totalBili: 'Bilirrubina Total (mg/dL)',
  directBili: 'Bilirrubina Directa (mg/dL)',
  sgot: 'TGO/AST (U/L)',
  sgpt: 'TGP/ALT (U/L)',
  albumin: 'Albúmina (g/dL)',
  proteins: 'Proteínas Totales (g/dL)',
};

// Mapeo de tipo de equipo a etiqueta
const EQUIPMENT_LABELS = {
  gasometry: 'Gasometría',
  bis: 'BIS',
  hemodynamic_monitor: 'Monitor',
  ventilator: 'Ventilador',
  rotem: 'ROTEM',
  lab_platform: 'Laboratorio',
  unknown: 'Desconocido',
};

// Colores por tipo de equipo
const EQUIPMENT_COLORS = {
  gasometry: 'bg-blue-600',
  bis: 'bg-purple-600',
  hemodynamic_monitor: 'bg-green-600',
  ventilator: 'bg-cyan-600',
  rotem: 'bg-red-600',
  lab_platform: 'bg-yellow-600',
  unknown: 'bg-gray-600',
};

export default function OcrExtractionModal({
  isOpen,
  onClose,
  onApplyValues,
  apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
}) {
  // Hook de Clerk para obtener token
  const { getToken } = useAuth();

  // Estado
  const [images, setImages] = useState([]); // Array de { base64, mediaType, preview, id }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [editedValues, setEditedValues] = useState({});
  const [selectedTime, setSelectedTime] = useState(getCurrentTime());

  // Refs
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);

  // Normaliza la URL de la API
  const normalizedApiUrl = apiBaseUrl.replace(/\/api\/?$/, '');

  function getCurrentTime() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  // Reset modal
  const resetModal = useCallback(() => {
    setImages([]);
    setLoading(false);
    setError(null);
    setExtractedData(null);
    setEditedValues({});
    setSelectedTime(getCurrentTime());
    stopCamera();
  }, []);

  // Detener cámara
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  }, [cameraStream]);

  // Iniciar cámara
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setCameraStream(stream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError('No se pudo acceder a la cámara: ' + err.message);
    }
  }, []);

  // Capturar foto
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    const base64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
    const newImage = {
      id: Date.now(),
      base64,
      mediaType: 'image/jpeg',
      preview: canvas.toDataURL('image/jpeg', 0.9),
    };

    setImages(prev => [...prev, newImage]);
  }, []);

  // Manejar selección de archivos múltiples
  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const base64 = dataUrl.split(',')[1];
        const newImage = {
          id: Date.now() + index,
          base64,
          mediaType: file.type,
          preview: dataUrl,
        };
        setImages(prev => [...prev, newImage]);
      };
      reader.readAsDataURL(file);
    });

    // Limpiar input
    e.target.value = '';
  }, []);

  // Eliminar imagen
  const removeImage = useCallback((id) => {
    setImages(prev => prev.filter(img => img.id !== id));
  }, []);

  // Procesar imágenes
  const processImages = useCallback(async () => {
    if (images.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      // Obtener token de Clerk
      const token = await getToken();

      const response = await fetch(`${normalizedApiUrl}/api/ocr/extract-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          images: images.map(img => ({
            imageBase64: img.base64,
            mediaType: img.mediaType,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error en la extracción');
      }

      // Actualizar imágenes con los resultados individuales
      if (result.results) {
        setImages(prev => prev.map((img, index) => ({
          ...img,
          result: result.results[index],
        })));
      }

      setExtractedData(result);
      setEditedValues(result.mergedFields || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [images, normalizedApiUrl, getToken]);

  // Manejar cambio en valor editado
  const handleValueChange = useCallback((field, value) => {
    setEditedValues(prev => ({
      ...prev,
      [field]: value === '' ? null : (isNaN(Number(value)) ? value : Number(value)),
    }));
  }, []);

  // Aplicar valores
  const handleApply = useCallback(() => {
    const valuesToApply = Object.fromEntries(
      Object.entries(editedValues).filter(([_, v]) => v !== null && v !== undefined && v !== '')
    );
    onApplyValues(valuesToApply, selectedTime);
    onClose();
  }, [editedValues, selectedTime, onApplyValues, onClose]);

  // Cerrar modal
  const handleClose = useCallback(() => {
    resetModal();
    onClose();
  }, [resetModal, onClose]);

  if (!isOpen) return null;

  const hasImages = images.length > 0;
  const hasResults = extractedData !== null;
  const hasValues = Object.keys(editedValues).filter(k => editedValues[k] !== null).length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={handleClose} />

      <div className="relative bg-gray-900 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 to-purple-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📷</span>
            <div>
              <h2 className="text-xl font-bold text-white">
                Extracción OCR Inteligente
              </h2>
              <p className="text-indigo-200 text-sm">
                Sube múltiples imágenes - el sistema detecta automáticamente cada tipo de equipo
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="text-white/70 hover:text-white text-2xl">
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
              {error}
            </div>
          )}

          {/* Área de carga de imágenes */}
          {!hasResults && (
            <div className="space-y-6">
              {/* Zona de drop/upload */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cámara */}
                {cameraActive ? (
                  <div className="col-span-full space-y-4">
                    <div className="relative bg-black rounded-lg overflow-hidden aspect-video max-h-64">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={capturePhoto}
                        className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium flex items-center gap-2"
                      >
                        📸 Capturar
                      </button>
                      <button
                        onClick={stopCamera}
                        className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg"
                      >
                        Cerrar cámara
                      </button>
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                ) : (
                  <>
                    <button
                      onClick={startCamera}
                      className="p-6 border-2 border-dashed border-gray-600 rounded-lg hover:border-indigo-500 hover:bg-gray-800 transition-all"
                    >
                      <span className="text-4xl block mb-2">📷</span>
                      <span className="text-white font-medium block">Usar Cámara</span>
                      <span className="text-gray-400 text-sm">Captura fotos una por una</span>
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-6 border-2 border-dashed border-gray-600 rounded-lg hover:border-indigo-500 hover:bg-gray-800 transition-all"
                    >
                      <span className="text-4xl block mb-2">📁</span>
                      <span className="text-white font-medium block">Subir Imágenes</span>
                      <span className="text-gray-400 text-sm">Selecciona una o varias</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </>
                )}
              </div>

              {/* Grid de imágenes cargadas */}
              {hasImages && (
                <div>
                  <h3 className="text-white font-medium mb-3">
                    {images.length} imagen{images.length > 1 ? 'es' : ''} cargada{images.length > 1 ? 's' : ''}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {images.map((img) => (
                      <div key={img.id} className="relative group">
                        <img
                          src={img.preview}
                          alt="Captura"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => removeImage(img.id)}
                          className="absolute top-2 right-2 w-6 h-6 bg-red-600 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-sm"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resultados de la extracción */}
          {hasResults && (
            <div className="space-y-6">
              {/* Resumen */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-white font-medium mb-3">Resumen de extracción</h3>
                <div className="flex flex-wrap gap-3">
                  <span className="px-3 py-1 bg-green-600/30 text-green-300 rounded-full text-sm">
                    ✓ {extractedData.summary?.successful || 0} procesadas
                  </span>
                  {extractedData.summary?.failed > 0 && (
                    <span className="px-3 py-1 bg-red-600/30 text-red-300 rounded-full text-sm">
                      ✗ {extractedData.summary.failed} con error
                    </span>
                  )}
                  {extractedData.summary?.equipmentTypesDetected?.map(type => (
                    <span
                      key={type}
                      className={`px-3 py-1 ${EQUIPMENT_COLORS[type] || 'bg-gray-600'} text-white rounded-full text-sm`}
                    >
                      {EQUIPMENT_LABELS[type] || type}
                    </span>
                  ))}
                </div>
              </div>

              {/* Selector de hora */}
              <div className="flex items-center justify-center gap-4 bg-gray-800 rounded-lg p-4">
                <span className="text-gray-300 text-sm font-medium">Hora del registro:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-lg font-mono focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    onClick={() => setSelectedTime(getCurrentTime())}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm border border-gray-600"
                  >
                    Ahora
                  </button>
                </div>
              </div>

              {/* Imágenes con resultados */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.map((img) => (
                  <div key={img.id} className="relative">
                    <img
                      src={img.preview}
                      alt="Captura"
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <div className={`absolute bottom-0 left-0 right-0 px-2 py-1 rounded-b-lg text-xs text-white ${
                      img.result?.success
                        ? EQUIPMENT_COLORS[img.result.equipmentType] || 'bg-green-600'
                        : 'bg-red-600'
                    }`}>
                      {img.result?.success
                        ? EQUIPMENT_LABELS[img.result.equipmentType] || 'OK'
                        : 'Error'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Valores combinados */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">
                  Valores extraídos (combinados de todas las fuentes)
                </h4>

                {hasValues ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    {Object.entries(editedValues)
                      .filter(([_, v]) => v !== null && v !== undefined)
                      .map(([field, value]) => (
                        <div key={field} className="flex items-center gap-2">
                          <label className="text-gray-400 text-sm w-40 truncate" title={FIELD_LABELS[field] || field}>
                            {FIELD_LABELS[field] || field}:
                          </label>
                          <input
                            type={typeof value === 'number' ? 'number' : 'text'}
                            step="any"
                            value={value ?? ''}
                            onChange={(e) => handleValueChange(field, e.target.value)}
                            className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          />
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No se pudieron extraer valores de las imágenes
                  </p>
                )}

                {/* Warnings */}
                {extractedData?.validation?.warnings?.length > 0 && (
                  <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-600 rounded text-xs">
                    <h5 className="text-yellow-400 font-medium mb-1">Advertencias:</h5>
                    {extractedData.validation.warnings.map((w, i) => (
                      <p key={i} className="text-yellow-200">• {w}</p>
                    ))}
                  </div>
                )}

                {extractedData?.validation?.criticalErrors?.length > 0 && (
                  <div className="mt-4 p-3 bg-red-900/30 border border-red-600 rounded text-xs">
                    <h5 className="text-red-400 font-medium mb-1">Errores:</h5>
                    {extractedData.validation.criticalErrors.map((e, i) => (
                      <p key={i} className="text-red-200">• {e}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-800 border-t border-gray-700 flex justify-between">
          <button
            onClick={hasResults ? () => { setExtractedData(null); setEditedValues({}); } : handleClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
          >
            {hasResults ? 'Volver' : 'Cancelar'}
          </button>

          {!hasResults && hasImages && (
            <button
              onClick={processImages}
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Procesando...
                </>
              ) : (
                <>
                  🚀 Procesar {images.length} imagen{images.length > 1 ? 'es' : ''}
                </>
              )}
            </button>
          )}

          {hasResults && hasValues && (
            <button
              onClick={handleApply}
              className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium"
            >
              ✓ Aplicar Valores
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
