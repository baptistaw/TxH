'use client';

/**
 * Modal de Asistencia ROTEM para Toma de Decisiones
 *
 * Este componente implementa el algoritmo de manejo del sangrado perioperatorio
 * basado en ROTEM según el protocolo PRO/T 3 del Hospital Central de las Fuerzas
 * Armadas y el Algoritmo Hepático A5 de Werfen.
 *
 * Cuando se ingresan datos de ROTEM, solicita información clínica adicional
 * y genera recomendaciones terapéuticas con sustento en evidencia.
 */

import { useState, useEffect, useCallback } from 'react';
import { rotemApi } from '@/lib/api';

// Constantes para clases de prioridad
const PRIORITY_CLASSES = {
  1: 'bg-red-900/50 border-red-500 text-red-100',
  2: 'bg-yellow-900/50 border-yellow-500 text-yellow-100',
  3: 'bg-blue-900/50 border-blue-500 text-blue-100',
};

const PRIORITY_LABELS = {
  1: 'URGENTE',
  2: 'RECOMENDADO',
  3: 'CONSIDERAR',
};

export default function RotemAssistanceModal({
  isOpen,
  onClose,
  rotemData,
  phase,
  caseId,
  patientWeight,
  lastLabValues,
}) {
  // Estado del wizard
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Datos clínicos a recopilar
  const [clinicalData, setClinicalData] = useState({
    // Estado de sangrado
    hasActiveBleeeding: false,
    anticipatedBleeding: false,
    refractoryBleeding: false,
    suspectedPlateletDysfunction: false,

    // Condiciones previas (pueden venir de labs)
    pH: lastLabValues?.pH || null,
    temperature: lastLabValues?.temp || null,
    ionicCalcium: lastLabValues?.ionicCalcium || null,
    hemoglobin: lastLabValues?.hb || null,

    // Peso
    weight: patientWeight || 70,

    // Contraindicaciones para antifibrinolíticos
    contraindications: {
      previousThrombosis: false,
      hepaticMalignancy: false,
      chronicBiliaryInflammation: false,
    },

    // Disponibilidad de recursos
    ccpAvailable: true,
  });

  // Resultados del algoritmo
  const [evaluation, setEvaluation] = useState(null);

  // Resetear al abrir
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError(null);
      setEvaluation(null);
      setClinicalData(prev => ({
        ...prev,
        pH: lastLabValues?.pH || null,
        temperature: lastLabValues?.temp || null,
        ionicCalcium: lastLabValues?.ionicCalcium || null,
        hemoglobin: lastLabValues?.hb || null,
        weight: patientWeight || 70,
      }));
    }
  }, [isOpen, lastLabValues, patientWeight]);

  // Manejador de cambios en el formulario
  const handleChange = useCallback((field, value) => {
    setClinicalData(prev => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return {
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value,
          },
        };
      }
      return { ...prev, [field]: value };
    });
  }, []);

  // Ejecutar algoritmo
  const runAlgorithm = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await rotemApi.getRecommendations(rotemData, phase, clinicalData);
      setEvaluation(response.evaluation);
      setStep(3);
    } catch (err) {
      setError(err.message || 'Error al ejecutar el algoritmo');
    } finally {
      setLoading(false);
    }
  }, [rotemData, phase, clinicalData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900 to-red-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🩸</span>
            <div>
              <h2 className="text-xl font-bold text-white">
                Asistencia ROTEM - Decisión Terapéutica
              </h2>
              <p className="text-red-200 text-sm">
                Algoritmo basado en protocolo PRO/T 3 y Algoritmo Hepático A5 Werfen
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl"
          >
            &times;
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-3 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {[
              { num: 1, label: 'Sangrado' },
              { num: 2, label: 'Condiciones' },
              { num: 3, label: 'Recomendaciones' },
            ].map((s, i) => (
              <div key={s.num} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step >= s.num
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {step > s.num ? '✓' : s.num}
                </div>
                <span
                  className={`ml-2 text-sm ${
                    step >= s.num ? 'text-white' : 'text-gray-500'
                  }`}
                >
                  {s.label}
                </span>
                {i < 2 && (
                  <div
                    className={`w-16 h-0.5 mx-4 ${
                      step > s.num ? 'bg-red-600' : 'bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
              {error}
            </div>
          )}

          {/* Step 1: Estado de Sangrado */}
          {step === 1 && (
            <Step1BleedingStatus
              data={clinicalData}
              onChange={handleChange}
              rotemData={rotemData}
            />
          )}

          {/* Step 2: Condiciones Previas */}
          {step === 2 && (
            <Step2Preconditions
              data={clinicalData}
              onChange={handleChange}
              phase={phase}
            />
          )}

          {/* Step 3: Recomendaciones */}
          {step === 3 && evaluation && (
            <Step3Recommendations
              evaluation={evaluation}
              weight={clinicalData.weight}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-800 border-t border-gray-700 flex justify-between">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
          >
            {step === 1 ? 'Cancelar' : 'Anterior'}
          </button>

          {step < 3 ? (
            <button
              onClick={() => step === 2 ? runAlgorithm() : setStep(step + 1)}
              disabled={loading}
              className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Analizando...
                </span>
              ) : step === 2 ? (
                'Obtener Recomendaciones'
              ) : (
                'Siguiente'
              )}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Step 1: Estado de Sangrado
 */
function Step1BleedingStatus({ data, onChange, rotemData }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">
          Evaluación del Estado de Sangrado
        </h3>
        <p className="text-gray-400 text-sm">
          Esta información es necesaria para aplicar correctamente el algoritmo de decisión
        </p>
      </div>

      {/* Valores ROTEM ingresados */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Valores ROTEM Ingresados:</h4>
        <div className="grid grid-cols-4 gap-3 text-sm">
          {rotemData.rotemCtExtem && (
            <div className="bg-gray-700 rounded p-2">
              <span className="text-gray-400">CT EXTEM:</span>
              <span className="text-white ml-2">{rotemData.rotemCtExtem}s</span>
            </div>
          )}
          {rotemData.rotemA5Extem && (
            <div className="bg-gray-700 rounded p-2">
              <span className="text-gray-400">A5 EXTEM:</span>
              <span className="text-white ml-2">{rotemData.rotemA5Extem}mm</span>
            </div>
          )}
          {rotemData.rotemA5Fibtem && (
            <div className="bg-gray-700 rounded p-2">
              <span className="text-gray-400">A5 FIBTEM:</span>
              <span className="text-white ml-2">{rotemData.rotemA5Fibtem}mm</span>
            </div>
          )}
          {rotemData.rotemCli30 && (
            <div className="bg-gray-700 rounded p-2">
              <span className="text-gray-400">CLI30:</span>
              <span className="text-white ml-2">{rotemData.rotemCli30}%</span>
            </div>
          )}
          {rotemData.rotemCtIntem && (
            <div className="bg-gray-700 rounded p-2">
              <span className="text-gray-400">CT INTEM:</span>
              <span className="text-white ml-2">{rotemData.rotemCtIntem}s</span>
            </div>
          )}
          {rotemData.rotemCtHeptem && (
            <div className="bg-gray-700 rounded p-2">
              <span className="text-gray-400">CT HEPTEM:</span>
              <span className="text-white ml-2">{rotemData.rotemCtHeptem}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Pregunta principal */}
      <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-6">
        <h4 className="text-yellow-300 font-semibold mb-4 flex items-center gap-2">
          <span className="text-xl">⚠️</span>
          ¿El paciente presenta sangrado difuso activo y está considerando transfundir?
        </h4>

        <div className="flex gap-4">
          <label className="flex-1 cursor-pointer">
            <input
              type="radio"
              name="hasActiveBleeeding"
              checked={data.hasActiveBleeeding === true}
              onChange={() => onChange('hasActiveBleeeding', true)}
              className="sr-only peer"
            />
            <div className="p-4 border-2 border-gray-600 rounded-lg peer-checked:border-red-500 peer-checked:bg-red-900/30 hover:bg-gray-800 transition-all">
              <div className="text-center">
                <span className="text-2xl block mb-2">🩸</span>
                <span className="font-medium text-white">Sí, hay sangrado difuso activo</span>
                <p className="text-gray-400 text-sm mt-1">
                  Se aplicarán umbrales terapéuticos para sangrado activo
                </p>
              </div>
            </div>
          </label>

          <label className="flex-1 cursor-pointer">
            <input
              type="radio"
              name="hasActiveBleeeding"
              checked={data.hasActiveBleeeding === false}
              onChange={() => onChange('hasActiveBleeeding', false)}
              className="sr-only peer"
            />
            <div className="p-4 border-2 border-gray-600 rounded-lg peer-checked:border-green-500 peer-checked:bg-green-900/30 hover:bg-gray-800 transition-all">
              <div className="text-center">
                <span className="text-2xl block mb-2">✓</span>
                <span className="font-medium text-white">No hay sangrado activo</span>
                <p className="text-gray-400 text-sm mt-1">
                  Se aplicarán umbrales profilácticos
                </p>
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Preguntas adicionales */}
      <div className="space-y-4">
        <label className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750">
          <input
            type="checkbox"
            checked={data.anticipatedBleeding}
            onChange={(e) => onChange('anticipatedBleeding', e.target.checked)}
            className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-red-600 focus:ring-red-500"
          />
          <div>
            <span className="text-white font-medium">Se anticipa sangrado importante en el corto plazo</span>
            <p className="text-gray-400 text-sm">Ej: próxima fase quirúrgica de alto riesgo hemorrágico</p>
          </div>
        </label>

        <label className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750">
          <input
            type="checkbox"
            checked={data.suspectedPlateletDysfunction}
            onChange={(e) => onChange('suspectedPlateletDysfunction', e.target.checked)}
            className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-red-600 focus:ring-red-500"
          />
          <div>
            <span className="text-white font-medium">Se sospecha disfunción plaquetaria</span>
            <p className="text-gray-400 text-sm">Uso de antiagregantes, uremia, etc. (ROTEM no detecta esto)</p>
          </div>
        </label>

        <label className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750">
          <input
            type="checkbox"
            checked={data.refractoryBleeding}
            onChange={(e) => onChange('refractoryBleeding', e.target.checked)}
            className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-red-600 focus:ring-red-500"
          />
          <div>
            <span className="text-white font-medium">Sangrado refractario a medidas hemostáticas</span>
            <p className="text-gray-400 text-sm">Persistencia de sangrado a pesar de correcciones previas</p>
          </div>
        </label>
      </div>

      {/* Peso del paciente */}
      <div className="bg-gray-800 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Peso del paciente (kg) - para cálculo de dosis
        </label>
        <input
          type="number"
          value={data.weight || ''}
          onChange={(e) => onChange('weight', parseFloat(e.target.value) || null)}
          className="w-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
          min="30"
          max="300"
        />
      </div>
    </div>
  );
}

/**
 * Step 2: Condiciones Previas
 */
function Step2Preconditions({ data, onChange, phase }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">
          Verificación de Condiciones Previas
        </h3>
        <p className="text-gray-400 text-sm">
          La acidosis, hipotermia, hipocalcemia y anemia afectan la hemostasis.
          Deben corregirse previo o simultáneamente a la administración de hemoderivados.
        </p>
      </div>

      {/* Datos de laboratorio */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
          <span>🔬</span>
          Valores de Laboratorio Recientes
        </h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">pH arterial</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                value={data.pH || ''}
                onChange={(e) => onChange('pH', parseFloat(e.target.value) || null)}
                className={`flex-1 px-3 py-2 bg-gray-700 border rounded text-white ${
                  data.pH && data.pH < 7.20 ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="7.35-7.45"
              />
              {data.pH && data.pH < 7.20 && (
                <span className="text-red-400 text-sm">⚠️ Acidosis</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Target: &gt; 7.20</p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Temperatura (°C)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                value={data.temperature || ''}
                onChange={(e) => onChange('temperature', parseFloat(e.target.value) || null)}
                className={`flex-1 px-3 py-2 bg-gray-700 border rounded text-white ${
                  data.temperature && data.temperature < 35 ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="36.0-37.5"
              />
              {data.temperature && data.temperature < 35 && (
                <span className="text-red-400 text-sm">⚠️ Hipotermia</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Target: &gt; 35°C</p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Calcio iónico (mmol/L)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                value={data.ionicCalcium || ''}
                onChange={(e) => onChange('ionicCalcium', parseFloat(e.target.value) || null)}
                className={`flex-1 px-3 py-2 bg-gray-700 border rounded text-white ${
                  data.ionicCalcium && data.ionicCalcium < 1.15 ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="1.15-1.35"
              />
              {data.ionicCalcium && data.ionicCalcium < 1.15 && (
                <span className="text-red-400 text-sm">⚠️ Hipocalcemia</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Target: &gt; 1.15 mmol/L</p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Hemoglobina (g/dL)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                value={data.hemoglobin || ''}
                onChange={(e) => onChange('hemoglobin', parseFloat(e.target.value) || null)}
                className={`flex-1 px-3 py-2 bg-gray-700 border rounded text-white ${
                  data.hemoglobin && data.hemoglobin < 6 ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="6-10"
              />
              {data.hemoglobin && data.hemoglobin < 6 && (
                <span className="text-red-400 text-sm">⚠️ Anemia severa</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Target: &ge; 6 g/dL</p>
          </div>
        </div>
      </div>

      {/* Contraindicaciones para antifibrinolíticos */}
      {['ESTADO_BASAL', 'INDUCCION'].includes(phase) && (
        <div className="bg-orange-900/20 border border-orange-600 rounded-lg p-4">
          <h4 className="text-sm font-medium text-orange-300 mb-4 flex items-center gap-2">
            <span>⚠️</span>
            Contraindicaciones para Antifibrinolíticos Profilácticos
          </h4>
          <p className="text-gray-400 text-sm mb-4">
            Las siguientes condiciones aumentan el riesgo de eventos tromboembólicos.
            Marque si aplican al paciente:
          </p>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={data.contraindications.previousThrombosis}
                onChange={(e) => onChange('contraindications.previousThrombosis', e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-orange-600"
              />
              <span className="text-white">Antecedente de enfermedad trombótica</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={data.contraindications.hepaticMalignancy}
                onChange={(e) => onChange('contraindications.hepaticMalignancy', e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-orange-600"
              />
              <span className="text-white">Tumor hepático maligno</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={data.contraindications.chronicBiliaryInflammation}
                onChange={(e) => onChange('contraindications.chronicBiliaryInflammation', e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-orange-600"
              />
              <span className="text-white">Enfermedad inflamatoria crónica de vía biliar (CBP, CEP)</span>
            </label>
          </div>
        </div>
      )}

      {/* Disponibilidad de CCP */}
      <div className="bg-gray-800 rounded-lg p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.ccpAvailable}
            onChange={(e) => onChange('ccpAvailable', e.target.checked)}
            className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600"
          />
          <div>
            <span className="text-white font-medium">Concentrado de Complejo Protrombínico (CCP) disponible</span>
            <p className="text-gray-400 text-sm">Si no está disponible, se priorizará PFC o Factor VIIa</p>
          </div>
        </label>
      </div>

      {/* Info de fase */}
      <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
        <div className="flex items-center gap-2 text-blue-300">
          <span>ℹ️</span>
          <span className="font-medium">Fase actual: {phase.replace(/_/g, ' ')}</span>
        </div>
        <p className="text-gray-400 text-sm mt-2">
          El algoritmo aplica diferentes umbrales según la fase quirúrgica.
          {phase === 'POST_REPERFUSION' && (
            ' En post-reperfusión, se usan targets más altos de fibrinógeno y se evalúa la hiperfibrinólisis con cautela.'
          )}
        </p>
      </div>
    </div>
  );
}

/**
 * Step 3: Recomendaciones
 */
function Step3Recommendations({ evaluation, weight }) {
  const { prioritizedActions, evaluations, urgentActionRequired, actionRequired } = evaluation;

  return (
    <div className="space-y-6">
      {/* Header de estado */}
      <div className={`rounded-lg p-4 text-center ${
        urgentActionRequired
          ? 'bg-red-900/50 border border-red-500'
          : actionRequired
          ? 'bg-yellow-900/50 border border-yellow-500'
          : 'bg-green-900/50 border border-green-500'
      }`}>
        <h3 className={`text-lg font-bold ${
          urgentActionRequired
            ? 'text-red-200'
            : actionRequired
            ? 'text-yellow-200'
            : 'text-green-200'
        }`}>
          {urgentActionRequired
            ? '⚠️ ACCIÓN URGENTE REQUERIDA'
            : actionRequired
            ? 'Se recomiendan acciones terapéuticas'
            : '✓ No se requieren acciones inmediatas'}
        </h3>
      </div>

      {/* Condiciones previas */}
      {evaluations.preconditions && !evaluations.preconditions.allMet && (
        <div className="bg-orange-900/30 border border-orange-500 rounded-lg p-4">
          <h4 className="text-orange-300 font-semibold mb-3 flex items-center gap-2">
            <span>⚠️</span>
            Corregir Condiciones Previas
          </h4>
          <div className="space-y-2">
            {evaluations.preconditions.issues.map((issue, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-orange-400">•</span>
                <div>
                  <span className="text-white">{issue.message}</span>
                  <span className="text-gray-400 ml-2">(Target: {issue.threshold})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acciones priorizadas */}
      {prioritizedActions.length > 0 ? (
        <div className="space-y-4">
          <h4 className="text-white font-semibold">Acciones Recomendadas:</h4>

          {prioritizedActions.map((action, i) => (
            <RecommendationCard
              key={i}
              action={action}
              evaluations={evaluations}
              weight={weight}
            />
          ))}
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <span className="text-4xl mb-4 block">✓</span>
          <p className="text-gray-300">
            Los parámetros ROTEM están dentro de rangos aceptables.
            Continuar monitoreo según protocolo.
          </p>
        </div>
      )}

      {/* Resumen de evaluaciones */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Resumen de Evaluaciones:</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <EvaluationSummaryItem
            label="Hiperfibrinólisis"
            evaluation={evaluations.fibrinolysisTreatment}
          />
          <EvaluationSummaryItem
            label="Fibrinógeno"
            evaluation={evaluations.fibrinogen}
          />
          <EvaluationSummaryItem
            label="Plaquetas"
            evaluation={evaluations.platelets}
          />
          <EvaluationSummaryItem
            label="Factores de Coagulación"
            evaluation={evaluations.coagulationFactors}
          />
          <EvaluationSummaryItem
            label="Efecto Heparínico"
            evaluation={evaluations.heparinEffect}
          />
          {evaluations.fibrinolysisProphylaxis && (
            <EvaluationSummaryItem
              label="Profilaxis Antifibrinolítica"
              evaluation={evaluations.fibrinolysisProphylaxis}
            />
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-xs text-gray-500 italic border-t border-gray-700 pt-4">
        <p>
          <strong>Nota:</strong> Estas recomendaciones son asistivas y no sustituyen el juicio clínico.
          El algoritmo está basado en el protocolo PRO/T 3 V3 (30/10/2024) del Hospital Central de las
          Fuerzas Armadas y el Algoritmo Hepático A5 de Werfen (Görlinger & Pérez Ferrer, 2018).
          Siempre correlacionar con la situación clínica del paciente.
        </p>
      </div>
    </div>
  );
}

/**
 * Tarjeta de recomendación individual
 */
function RecommendationCard({ action, evaluations, weight }) {
  const [expanded, setExpanded] = useState(false);

  // Buscar los detalles completos de la recomendación
  let fullRecommendation = null;

  // Buscar en las diferentes evaluaciones
  Object.values(evaluations).forEach(ev => {
    if (!ev) return;

    if (ev.recommendation?.action === action.action) {
      fullRecommendation = ev.recommendation;
    }
    if (ev.recommendations) {
      const found = ev.recommendations.find(r => r.action === action.action);
      if (found) fullRecommendation = found;
    }
  });

  return (
    <div className={`rounded-lg border-2 overflow-hidden ${PRIORITY_CLASSES[action.priority]}`}>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span className={`px-2 py-1 text-xs font-bold rounded ${
              action.priority === 1 ? 'bg-red-600' :
              action.priority === 2 ? 'bg-yellow-600' : 'bg-blue-600'
            }`}>
              {PRIORITY_LABELS[action.priority]}
            </span>
            <div>
              <h5 className="font-semibold text-white">{action.description}</h5>
              {action.dose && (
                <p className="text-sm mt-1 font-mono">{action.dose}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-white/70 hover:text-white text-sm"
          >
            {expanded ? '▲ Menos' : '▼ Más info'}
          </button>
        </div>
      </div>

      {expanded && fullRecommendation && (
        <div className="px-4 pb-4 border-t border-white/10 pt-3 space-y-3 text-sm">
          {fullRecommendation.details && (
            <p className="text-gray-300">{fullRecommendation.details}</p>
          )}

          {fullRecommendation.cryoprecipitate && (
            <div className="bg-black/20 rounded p-2">
              <span className="text-gray-400">Alternativa (Crioprecipitados):</span>
              <span className="text-white ml-2">{fullRecommendation.cryoprecipitate}</span>
            </div>
          )}

          {fullRecommendation.calculatedDose && (
            <div className="bg-black/20 rounded p-2">
              <span className="text-gray-400">Dosis calculada:</span>
              <span className="text-white ml-2">{fullRecommendation.calculatedDose}</span>
            </div>
          )}

          {fullRecommendation.formula && (
            <div className="bg-black/20 rounded p-2 font-mono text-xs">
              <span className="text-gray-400">Fórmula:</span>
              <span className="text-white ml-2">{fullRecommendation.formula}</span>
            </div>
          )}

          {fullRecommendation.target && (
            <div className="bg-black/20 rounded p-2">
              <span className="text-gray-400">Objetivo:</span>
              <span className="text-white ml-2">{fullRecommendation.target}</span>
            </div>
          )}

          {fullRecommendation.followUp && (
            <div className="bg-blue-900/30 rounded p-2">
              <span className="text-blue-300">Seguimiento:</span>
              <span className="text-white ml-2">{fullRecommendation.followUp}</span>
            </div>
          )}

          {fullRecommendation.warning && (
            <div className="bg-red-900/30 rounded p-2">
              <span className="text-red-300">⚠️ Precaución:</span>
              <span className="text-white ml-2">{fullRecommendation.warning}</span>
            </div>
          )}

          {fullRecommendation.evidence && (
            <div className="text-xs text-gray-400 italic">
              <span>📚 Evidencia:</span>
              <span className="ml-1">{fullRecommendation.evidence}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Item de resumen de evaluación
 */
function EvaluationSummaryItem({ label, evaluation }) {
  if (!evaluation) return null;

  const indicated = evaluation.indicated;

  return (
    <div className="flex items-center gap-2">
      <span className={indicated ? 'text-yellow-400' : 'text-green-400'}>
        {indicated ? '⚠️' : '✓'}
      </span>
      <span className="text-gray-300">{label}:</span>
      <span className={indicated ? 'text-yellow-300' : 'text-green-300'}>
        {indicated ? 'Requiere acción' : 'Normal'}
      </span>
    </div>
  );
}
