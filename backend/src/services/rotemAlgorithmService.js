/**
 * Motor de Reglas del Algoritmo ROTEM para Trasplante Hepático
 *
 * Basado en:
 * - PRO/T 3 Versión 3 (30/10/2024) - Hospital Central de las Fuerzas Armadas
 * - Algoritmo Hepático A5 de Werfen (Görlinger & Pérez Ferrer, 2018)
 *
 * Referencias principales:
 * - ESA Guidelines for Perioperative Bleeding Management (Grado 1C)
 * - ASA Practice Guidelines for Perioperative Blood Management
 */

// Constantes de umbrales según protocolo
const THRESHOLDS = {
  // Condiciones previas para hemostasis (sección 5.4.1)
  PRECONDITIONS: {
    pH_MIN: 7.20,
    TEMPERATURE_MIN: 35, // °C - Normotermia
    IONIC_CALCIUM_MIN: 1.15, // mmol/L
    HEMOGLOBIN_MIN: 6, // g/dL
  },

  // Hiperfibrinólisis profiláctica (sección 5.4.2.b)
  FIBRINOLYSIS_PROPHYLAXIS: {
    A5_EXTEM_MAX: 25, // mm
    CT_FIBTEM_MAX: 600, // seg (línea plana)
    CT_CFT_EXTEM_SUM_MAX: 280, // seg (CT + CFT)
  },

  // Hiperfibrinólisis terapéutica (sección 5.4.2.c)
  FIBRINOLYSIS_TREATMENT: {
    CLI60_PREANHEPATIC_MIN: 85, // % - fase preanhepática
    CLI30_ANHEPATIC_MIN: 50, // % - fase anhepática y reperfusión
  },

  // Contraindicaciones para antifibrinolíticos (sección 5.4.2.a)
  FIBRINOLYSIS_CONTRAINDICATIONS: {
    MCF_EXTEM_MAX: 60, // mm - hipercoagulabilidad basal
  },

  // Firmeza del coágulo - Fibrinógeno (sección 5.4.3.a)
  FIBRINOGEN: {
    A5_EXTEM_WITH_BLEEDING: 25, // mm - con SDA
    A5_EXTEM_WITHOUT_BLEEDING: 20, // mm - sin SDA pero previsto
    A5_FIBTEM_THRESHOLD: 8, // mm
    A5_FIBTEM_TARGET: 10, // mm - objetivo
    A5_FIBTEM_POST_REPERFUSION_TARGET: 13, // mm - post-reperfusión
    A5_FIBTEM_SEVERE: 4, // mm - déficit severo
  },

  // Firmeza del coágulo - Plaquetas (sección 5.4.3.b)
  PLATELETS: {
    A5_EXTEM_WITH_BLEEDING: 25, // mm - con SDA
    A5_EXTEM_WITHOUT_BLEEDING: 20, // mm - sin SDA pero previsto
    A5_FIBTEM_MIN: 8, // mm - fibrinógeno debe estar OK
  },

  // Generación de trombina (sección 5.4.4)
  THROMBIN_GENERATION: {
    CT_EXTEM_MAX: 80, // seg (protocolo) / 75 seg (Werfen)
    CT_INTEM_MAX: 240, // seg (protocolo) / 280 seg (Werfen)
    CT_HEPTEM_MAX: 240, // seg
  },

  // Heparinización endógena (sección 5.4.5)
  HEPARIN_EFFECT: {
    CT_INTEM_MIN: 240, // seg
    CT_HEPTEM_RATIO_MAX: 0.75, // ratio HEPTEM/INTEM
  },
};

// Fases quirúrgicas relevantes para el algoritmo
const SURGICAL_PHASES = {
  BASAL: 'ESTADO_BASAL',
  INDUCTION: 'INDUCCION',
  DISSECTION: 'DISECCION',
  PREHEPATIC: 'ANHEPATICA', // Fase preanhepática
  ANHEPATIC: 'PRE_REPERFUSION', // Fase anhepática real
  REPERFUSION: 'POST_REPERFUSION',
  BILIARY: 'VIA_BILIAR',
  CLOSURE: 'CIERRE',
  EXIT: 'SALIDA_BQ',
};

// Mapeo de fases para lógica del algoritmo
const isPreanhepaticPhase = (phase) =>
  ['ESTADO_BASAL', 'INDUCCION', 'DISECCION', 'ANHEPATICA'].includes(phase);

const isAnhepaticOrReperfusionPhase = (phase) =>
  ['PRE_REPERFUSION', 'POST_REPERFUSION'].includes(phase);

const isPostReperfusionPhase = (phase) =>
  ['POST_REPERFUSION', 'VIA_BILIAR', 'CIERRE', 'SALIDA_BQ'].includes(phase);

/**
 * Evalúa las condiciones previas necesarias para la hemostasis
 * Referencia: Sección 5.4.1 del protocolo
 */
function evaluatePreconditions(clinicalData) {
  const issues = [];
  const recommendations = [];

  const { pH, temperature, ionicCalcium, hemoglobin } = clinicalData;

  // pH
  if (pH !== null && pH !== undefined && pH < THRESHOLDS.PRECONDITIONS.pH_MIN) {
    issues.push({
      parameter: 'pH',
      value: pH,
      threshold: `> ${THRESHOLDS.PRECONDITIONS.pH_MIN}`,
      severity: 'critical',
      message: `Acidosis detectada (pH ${pH}). La acidosis altera la generación de trombina.`,
    });
    recommendations.push({
      action: 'CORREGIR_ACIDOSIS',
      priority: 1,
      description: 'Corregir acidosis antes de administrar hemoderivados',
      details: 'La acidosis inhibe la función de los factores de coagulación y las plaquetas.',
      evidence: 'De Robertis E et al. Minerva Anestesiol 2015;81(1):65-75 [Ref 14]',
    });
  }

  // Temperatura
  if (temperature !== null && temperature !== undefined && temperature < THRESHOLDS.PRECONDITIONS.TEMPERATURE_MIN) {
    issues.push({
      parameter: 'Temperatura',
      value: temperature,
      threshold: `> ${THRESHOLDS.PRECONDITIONS.TEMPERATURE_MIN}°C`,
      severity: 'critical',
      message: `Hipotermia detectada (${temperature}°C). La hipotermia afecta la función enzimática de la coagulación.`,
    });
    recommendations.push({
      action: 'CORREGIR_HIPOTERMIA',
      priority: 1,
      description: 'Mantener normotermia',
      details: 'Usar calentadores de fluidos y mantas térmicas. La hipotermia reduce la actividad de los factores de coagulación.',
      evidence: 'De Robertis E et al. Minerva Anestesiol 2015;81(1):65-75 [Ref 14]',
    });
  }

  // Calcio iónico
  if (ionicCalcium !== null && ionicCalcium !== undefined && ionicCalcium < THRESHOLDS.PRECONDITIONS.IONIC_CALCIUM_MIN) {
    issues.push({
      parameter: 'Calcio iónico',
      value: ionicCalcium,
      threshold: `> ${THRESHOLDS.PRECONDITIONS.IONIC_CALCIUM_MIN} mmol/L`,
      severity: 'critical',
      message: `Hipocalcemia detectada (Ca++ ${ionicCalcium} mmol/L). El calcio es cofactor esencial de la coagulación.`,
    });
    recommendations.push({
      action: 'ADMINISTRAR_CALCIO',
      priority: 1,
      description: 'Administrar Gluconato de Calcio',
      details: 'El calcio ionizado es cofactor esencial para múltiples pasos de la cascada de coagulación.',
      dose: 'Gluconato de Calcio 10% 10-20 mL IV o Cloruro de Calcio 10% 5-10 mL IV',
      evidence: 'De Robertis E et al. Minerva Anestesiol 2015;81(1):65-75 [Ref 14]',
    });
  }

  // Hemoglobina
  if (hemoglobin !== null && hemoglobin !== undefined && hemoglobin < THRESHOLDS.PRECONDITIONS.HEMOGLOBIN_MIN) {
    issues.push({
      parameter: 'Hemoglobina',
      value: hemoglobin,
      threshold: `>= ${THRESHOLDS.PRECONDITIONS.HEMOGLOBIN_MIN} g/dL`,
      severity: 'warning',
      message: `Anemia severa (Hb ${hemoglobin} g/dL). La anemia puede afectar la hemostasis primaria.`,
    });
    recommendations.push({
      action: 'CONSIDERAR_TRANSFUSION_GR',
      priority: 2,
      description: 'Considerar transfusión de glóbulos rojos',
      details: 'Los glóbulos rojos contribuyen a la hemostasis mediante la marginación plaquetaria.',
      evidence: 'Protocolo PRO/T 3 Sección 5.4.1 [Ref 14]',
    });
  }

  return {
    allMet: issues.length === 0,
    issues,
    recommendations,
  };
}

/**
 * Evalúa la necesidad de profilaxis antifibrinolítica
 * Solo se aplica al inicio de la operación (muestra basal)
 * Referencia: Sección 5.4.2.b del protocolo
 */
function evaluateFibrinolysisProphylaxis(rotemData, clinicalContext) {
  const { contraindications = {} } = clinicalContext;
  const { phase } = rotemData;

  // Solo aplica en fases tempranas
  if (!['ESTADO_BASAL', 'INDUCCION'].includes(phase)) {
    return null;
  }

  // Verificar contraindicaciones (sección 5.4.2.a)
  const hasContraindications =
    contraindications.previousThrombosis ||
    contraindications.hepaticMalignancy ||
    contraindications.chronicBiliaryInflammation ||
    (rotemData.rotemMcfExtem && rotemData.rotemMcfExtem > THRESHOLDS.FIBRINOLYSIS_CONTRAINDICATIONS.MCF_EXTEM_MAX);

  if (hasContraindications) {
    return {
      indicated: false,
      reason: 'Contraindicación para antifibrinolíticos profilácticos',
      contraindications: {
        previousThrombosis: contraindications.previousThrombosis,
        hepaticMalignancy: contraindications.hepaticMalignancy,
        chronicBiliaryInflammation: contraindications.chronicBiliaryInflammation,
        hypercoagulableBasal: rotemData.rotemMcfExtem > THRESHOLDS.FIBRINOLYSIS_CONTRAINDICATIONS.MCF_EXTEM_MAX,
      },
      evidence: 'Pihusch R et al. J Hepatol 2002 [Ref 18]; Segal H et al. Hepatology 1997 [Ref 19]',
    };
  }

  // Evaluar indicaciones
  const a5ExtemLow = rotemData.rotemA5Extem !== null &&
    rotemData.rotemA5Extem < THRESHOLDS.FIBRINOLYSIS_PROPHYLAXIS.A5_EXTEM_MAX;

  const ctFibtemHigh = rotemData.rotemCtFibtem !== null &&
    rotemData.rotemCtFibtem > THRESHOLDS.FIBRINOLYSIS_PROPHYLAXIS.CT_FIBTEM_MAX;

  const ctCftSum = (rotemData.rotemCtExtem || 0) + (rotemData.rotemCftExtem || 0);
  const ctCftSumHigh = ctCftSum > THRESHOLDS.FIBRINOLYSIS_PROPHYLAXIS.CT_CFT_EXTEM_SUM_MAX;

  const indicated = a5ExtemLow || ctFibtemHigh || ctCftSumHigh;

  if (indicated) {
    return {
      indicated: true,
      criteria: {
        a5ExtemLow: { met: a5ExtemLow, value: rotemData.rotemA5Extem, threshold: `< ${THRESHOLDS.FIBRINOLYSIS_PROPHYLAXIS.A5_EXTEM_MAX} mm` },
        ctFibtemHigh: { met: ctFibtemHigh, value: rotemData.rotemCtFibtem, threshold: `> ${THRESHOLDS.FIBRINOLYSIS_PROPHYLAXIS.CT_FIBTEM_MAX} s` },
        ctCftSumHigh: { met: ctCftSumHigh, value: ctCftSum, threshold: `> ${THRESHOLDS.FIBRINOLYSIS_PROPHYLAXIS.CT_CFT_EXTEM_SUM_MAX} s` },
      },
      recommendation: {
        action: 'ADMINISTRAR_TXA_PROFILACTICO',
        priority: 2,
        description: 'Administrar Ácido Tranexámico profiláctico',
        dose: '30 mg/kg en bolo único (15 min). Puede repetirse hasta dosis máxima de 60 mg/kg.',
        details: 'Pacientes con reducción significativa de la firmeza del coágulo al inicio tienen 90% de probabilidad de desarrollar hiperfibrinólisis en fase anhepática.',
        evidence: 'Steib A et al. Br J Anaesth 1994 [Ref 16]; Kim EH et al. Transplant Proc 2015 [Ref 17]',
      },
    };
  }

  return {
    indicated: false,
    reason: 'No se cumplen criterios para profilaxis antifibrinolítica',
    criteria: {
      a5ExtemLow: { met: false, value: rotemData.rotemA5Extem, threshold: `< ${THRESHOLDS.FIBRINOLYSIS_PROPHYLAXIS.A5_EXTEM_MAX} mm` },
      ctFibtemHigh: { met: false, value: rotemData.rotemCtFibtem, threshold: `> ${THRESHOLDS.FIBRINOLYSIS_PROPHYLAXIS.CT_FIBTEM_MAX} s` },
      ctCftSumHigh: { met: false, value: ctCftSum, threshold: `> ${THRESHOLDS.FIBRINOLYSIS_PROPHYLAXIS.CT_CFT_EXTEM_SUM_MAX} s` },
    },
  };
}

/**
 * Evalúa la necesidad de tratamiento de hiperfibrinólisis
 * Referencia: Sección 5.4.2.c del protocolo
 */
function evaluateFibrinolysisTreatment(rotemData) {
  const { phase, rotemCli30, rotemCli60 } = rotemData;

  let indicated = false;
  let criteria = {};

  // En fase preanhepática: usar CLI60
  if (isPreanhepaticPhase(phase) && rotemCli60 !== null && rotemCli60 !== undefined) {
    indicated = rotemCli60 < THRESHOLDS.FIBRINOLYSIS_TREATMENT.CLI60_PREANHEPATIC_MIN;
    criteria = {
      parameter: 'CLI60',
      value: rotemCli60,
      threshold: `< ${THRESHOLDS.FIBRINOLYSIS_TREATMENT.CLI60_PREANHEPATIC_MIN}%`,
      phase: 'preanhepática',
    };
  }

  // En fase anhepática y reperfusión: usar CLI30
  if (isAnhepaticOrReperfusionPhase(phase) && rotemCli30 !== null && rotemCli30 !== undefined) {
    indicated = rotemCli30 < THRESHOLDS.FIBRINOLYSIS_TREATMENT.CLI30_ANHEPATIC_MIN;
    criteria = {
      parameter: 'CLI30',
      value: rotemCli30,
      threshold: `< ${THRESHOLDS.FIBRINOLYSIS_TREATMENT.CLI30_ANHEPATIC_MIN}%`,
      phase: isAnhepaticOrReperfusionPhase(phase) ? 'anhepática/reperfusión' : phase,
    };
  }

  // Hiperfibrinólisis fulminante
  const fulminant = rotemCli30 !== null && rotemCli30 < 50;

  if (indicated) {
    return {
      indicated: true,
      fulminant,
      criteria,
      recommendation: {
        action: 'ADMINISTRAR_TXA_TERAPEUTICO',
        priority: 1,
        description: fulminant ?
          'HIPERFIBRINÓLISIS FULMINANTE - Administrar Ácido Tranexámico urgente' :
          'Administrar Ácido Tranexámico terapéutico',
        dose: '30 mg/kg en bolo (15 min). Si persiste, infusión 10 mg/kg/hora hasta perfusión completa del hígado.',
        details: fulminant ?
          'CLI30 < 50% con sangrado activo indica hiperfibrinólisis fulminante. Requiere tratamiento inmediato.' :
          'La hiperfibrinólisis detectada requiere tratamiento para evitar progresión.',
        evidence: 'Schochl H et al. J Trauma 2009 [Ref 20]; Chapman MP et al. J Trauma Acute Care Surg 2013 [Ref 21]',
        followUp: 'Reevaluar ROTEM hasta que ML alcance 15%',
      },
      note: isPostReperfusionPhase(phase) ?
        'En post-reperfusión con buena función del injerto (mejora hemodinámica, producción de bilis), la hiperfibrinólisis puede ser autolimitada. Considerar conducta expectante.' :
        null,
    };
  }

  return {
    indicated: false,
    criteria,
    reason: 'No se detecta hiperfibrinólisis significativa',
  };
}

/**
 * Evalúa la necesidad de administrar fibrinógeno
 * Referencia: Sección 5.4.3.a del protocolo
 *
 * IMPORTANTE: El paciente hepatópata tiene hemostasia "rebalanceada".
 * Solo indicar tratamiento con SANGRADO DIFUSO ACTIVO confirmado.
 * Sin sangrado clínico, corregir valores de laboratorio puede precipitar trombosis.
 */
function evaluateFibrinogenNeed(rotemData, clinicalContext) {
  const { phase, rotemA5Extem, rotemA5Fibtem, rotemA5Aptem } = rotemData;
  const { hasActiveBleeeding, anticipatedBleeding, hasHyperfibrinolysis } = clinicalContext;

  // Si hay hiperfibrinólisis, usar A5_APTEM en lugar de A5_FIBTEM
  const fibtemValue = hasHyperfibrinolysis && rotemA5Aptem !== null ? rotemA5Aptem : rotemA5Fibtem;

  // En post-reperfusión usar target más alto
  const fibtemThreshold = isPostReperfusionPhase(phase) ?
    THRESHOLDS.FIBRINOGEN.A5_FIBTEM_POST_REPERFUSION_TARGET :
    THRESHOLDS.FIBRINOGEN.A5_FIBTEM_THRESHOLD;

  const a5ExtemThreshold = hasActiveBleeeding ?
    THRESHOLDS.FIBRINOGEN.A5_EXTEM_WITH_BLEEDING :
    THRESHOLDS.FIBRINOGEN.A5_EXTEM_WITHOUT_BLEEDING;

  // Verificar si hay indicación
  if (rotemA5Extem === null || fibtemValue === null) {
    return {
      indicated: false,
      reason: 'Datos insuficientes para evaluar (se requiere A5_EXTEM y A5_FIBTEM)',
      dataRequired: ['rotemA5Extem', 'rotemA5Fibtem'],
    };
  }

  const a5ExtemLow = rotemA5Extem < a5ExtemThreshold;
  const fibtemLow = fibtemValue < fibtemThreshold;

  // CRÍTICO: Solo indicar si hay sangrado difuso activo CONFIRMADO
  // Sin sangrado clínico, NO tratar - riesgo de trombosis
  const indicated = a5ExtemLow && fibtemLow && hasActiveBleeeding;

  if (indicated) {
    // Calcular dosis según severidad
    let dose;
    let cryoUnits;
    const weight = clinicalContext.weight || 70; // kg por defecto

    if (fibtemValue < THRESHOLDS.FIBRINOGEN.A5_FIBTEM_SEVERE) {
      // Déficit severo
      dose = 50; // mg/kg
      cryoUnits = Math.ceil((dose * weight) / 200); // 1g fibrinógeno ≈ 5U crio ≈ 200ml
    } else {
      // Déficit moderado
      dose = 25; // mg/kg
      cryoUnits = Math.ceil((dose * weight) / 200);
    }

    // Fórmula para calcular dosis exacta según target
    const targetIncrease = THRESHOLDS.FIBRINOGEN.A5_FIBTEM_TARGET - fibtemValue;
    const calculatedDose = (targetIncrease * weight) / 160; // Fórmula de Rahe-Meyer

    return {
      indicated: true,
      criteria: {
        a5Extem: { value: rotemA5Extem, threshold: `< ${a5ExtemThreshold} mm`, met: a5ExtemLow },
        a5Fibtem: { value: fibtemValue, threshold: `< ${fibtemThreshold} mm`, met: fibtemLow },
        severity: fibtemValue < THRESHOLDS.FIBRINOGEN.A5_FIBTEM_SEVERE ? 'severo' : 'moderado',
      },
      recommendation: {
        action: 'ADMINISTRAR_FIBRINOGENO',
        priority: hasActiveBleeeding ? 1 : 2,
        description: 'Administrar Fibrinógeno/Crioprecipitados',
        dose: `${dose} mg/kg = ${(dose * weight / 1000).toFixed(1)}g de Fibrinógeno`,
        cryoprecipitate: `${cryoUnits * 5} unidades de Crioprecipitados (≈${cryoUnits * 200} ml)`,
        calculatedDose: `Dosis calculada para alcanzar A5_FIBTEM ≥10mm: ${calculatedDose.toFixed(1)}g`,
        formula: 'Dosis (g) = [Target A5_FIBTEM - Actual A5_FIBTEM] × Peso(kg) / 160',
        target: `A5_FIBTEM ≥ ${THRESHOLDS.FIBRINOGEN.A5_FIBTEM_TARGET} mm`,
        details: 'El crioprecipitado es primera línea por disponibilidad. Cada 5U crio ≈ 1g fibrinógeno.',
        evidence: 'Rahe-Meyer N et al. Anesthesiology 2013 [Ref 23]; Nascimento B et al. Br J Anaesth 2014 [Ref 22]',
      },
      note: hasHyperfibrinolysis ?
        'IMPORTANTE: Tratar primero la hiperfibrinólisis antes de administrar fibrinógeno (usar dosis máximas)' :
        null,
    };
  }

  // Valores alterados pero SIN sangrado activo confirmado
  // Mostrar warning cuando hay hipofibrinogenemia (A5_FIBTEM < 8mm) sin sangrado
  const hasHypofibrinogenemia = fibtemValue < THRESHOLDS.FIBRINOGEN.A5_FIBTEM_THRESHOLD;

  if (hasHypofibrinogenemia && !hasActiveBleeeding) {
    return {
      indicated: false,
      criteria: {
        a5Extem: { value: rotemA5Extem, threshold: `< ${a5ExtemThreshold} mm`, met: a5ExtemLow },
        a5Fibtem: { value: fibtemValue, threshold: `< ${THRESHOLDS.FIBRINOGEN.A5_FIBTEM_THRESHOLD} mm`, met: true },
        hasActiveBleeeding: { value: false, required: true, met: false },
      },
      reason: 'Hipofibrinogenemia detectada (A5_FIBTEM ' + fibtemValue + 'mm) pero SIN sangrado difuso activo',
      warning: {
        type: 'PROTHROMBOTIC_RISK',
        message: '⚠️ NO TRATAR sin sangrado clínico activo. El paciente hepatópata tiene hemostasia rebalanceada (↓procoagulantes + ↓anticoagulantes). Administrar fibrinógeno sin sangrado puede precipitar TROMBOSIS (especialmente portal/HAT).',
        evidence: 'Tripodi A, Mannucci PM. N Engl J Med 2011; Lisman T, Porte RJ. Blood 2010',
      },
      observation: 'Monitorizar clínicamente. Solo tratar si aparece sangrado difuso activo.',
    };
  }

  return {
    indicated: false,
    criteria: {
      a5Extem: { value: rotemA5Extem, threshold: `< ${a5ExtemThreshold} mm`, met: a5ExtemLow },
      a5Fibtem: { value: fibtemValue, threshold: `< ${fibtemThreshold} mm`, met: fibtemLow },
    },
    reason: fibtemLow ?
      'A5_EXTEM adecuado - no hay indicación de déficit de fibrinógeno significativo' :
      'A5_FIBTEM adecuado - niveles de fibrinógeno probablemente suficientes',
  };
}

/**
 * Evalúa la necesidad de administrar plaquetas
 * Referencia: Sección 5.4.3.b del protocolo
 */
function evaluatePlateletNeed(rotemData, clinicalContext) {
  const { rotemA5Extem, rotemA5Fibtem } = rotemData;
  const { hasActiveBleeeding, suspectedPlateletDysfunction } = clinicalContext;

  if (rotemA5Extem === null || rotemA5Fibtem === null) {
    return {
      indicated: false,
      reason: 'Datos insuficientes para evaluar (se requiere A5_EXTEM y A5_FIBTEM)',
      dataRequired: ['rotemA5Extem', 'rotemA5Fibtem'],
    };
  }

  const a5ExtemThreshold = hasActiveBleeeding ?
    THRESHOLDS.PLATELETS.A5_EXTEM_WITH_BLEEDING :
    THRESHOLDS.PLATELETS.A5_EXTEM_WITHOUT_BLEEDING;

  const a5ExtemLow = rotemA5Extem < a5ExtemThreshold;
  const fibtemOk = rotemA5Fibtem >= THRESHOLDS.PLATELETS.A5_FIBTEM_MIN;

  // Indicación: A5_EXTEM bajo con A5_FIBTEM OK (problema es plaquetario, no fibrinógeno)
  const indicated = (a5ExtemLow && fibtemOk) || suspectedPlateletDysfunction;

  if (indicated) {
    const weight = clinicalContext.weight || 70;
    const units = Math.ceil(weight / 10) * 1.5; // 1-2U/10kg

    return {
      indicated: true,
      criteria: {
        a5Extem: { value: rotemA5Extem, threshold: `< ${a5ExtemThreshold} mm`, met: a5ExtemLow },
        a5Fibtem: { value: rotemA5Fibtem, threshold: `≥ ${THRESHOLDS.PLATELETS.A5_FIBTEM_MIN} mm`, met: fibtemOk },
        plateletDysfunction: suspectedPlateletDysfunction,
      },
      recommendation: {
        action: 'ADMINISTRAR_PLAQUETAS',
        priority: hasActiveBleeeding ? 1 : 2,
        description: 'Administrar Concentrado de Plaquetas',
        dose: `1-2 U/10kg = ${Math.round(units)} unidades (aféresis o pool)`,
        details: 'Un pool de concentrado plaquetario puede elevar A5_EXTEM hasta 8mm. Si A5_EXTEM está entre 5-15mm, considerar 2 pools.',
        evidence: 'Fayed NA et al. Platelets 2014 [Ref 24]; Tripodi A et al. Liver Int 2013 [Ref 27]',
        warning: 'La transfusión de plaquetas en trasplante hepático se asocia a mayor mortalidad por lesión pulmonar aguda. Usar con precaución en post-reperfusión.',
        warningEvidence: 'Pereboom IT et al. Anesth Analg 2009 [Ref 25]',
      },
      note: rotemA5Extem < 5 ?
        'A5_EXTEM < 5mm: Administrar crioprecipitados junto con plaquetas' :
        null,
    };
  }

  return {
    indicated: false,
    criteria: {
      a5Extem: { value: rotemA5Extem, threshold: `< ${a5ExtemThreshold} mm`, met: a5ExtemLow },
      a5Fibtem: { value: rotemA5Fibtem, threshold: `≥ ${THRESHOLDS.PLATELETS.A5_FIBTEM_MIN} mm`, met: fibtemOk },
    },
    reason: !a5ExtemLow ?
      'A5_EXTEM adecuado - no hay indicación de déficit plaquetario' :
      'A5_FIBTEM bajo sugiere problema de fibrinógeno más que plaquetario',
  };
}

/**
 * Evalúa la necesidad de factores de coagulación (CCP o PFC)
 * Referencia: Sección 5.4.4 del protocolo
 */
function evaluateCoagulationFactorsNeed(rotemData, clinicalContext) {
  const { rotemCtExtem, rotemCtIntem, rotemCtHeptem, rotemA5Fibtem } = rotemData;
  const { hasActiveBleeeding } = clinicalContext;

  const recommendations = [];
  let indicated = false;

  // 1. CT_EXTEM prolongado → CCP
  // IMPORTANTE: Si A5_FIBTEM < 8mm, el CT_EXTEM prolongado es secundario a hipofibrinogenemia
  // y se corrige al normalizar el fibrinógeno. NO indicar CCP en ese caso.
  if (rotemCtExtem !== null && rotemCtExtem > THRESHOLDS.THROMBIN_GENERATION.CT_EXTEM_MAX) {
    const weight = clinicalContext.weight || 70;

    // Verificar si hay hipofibrinogenemia que explique el CT prolongado
    const hasHypofibrinogenemia = rotemA5Fibtem !== null && rotemA5Fibtem < THRESHOLDS.FIBRINOGEN.A5_FIBTEM_THRESHOLD;

    if (hasHypofibrinogenemia) {
      // NO indicar CCP - el CT prolongado es por déficit de fibrinógeno
      // Solo agregar información para el clínico
      recommendations.push({
        action: 'REEVALUAR_CT_POST_FIBRINOGENO',
        priority: 3,
        description: 'Reevaluar CT_EXTEM después de corregir fibrinógeno',
        criteria: {
          ctExtem: { value: rotemCtExtem, threshold: `> ${THRESHOLDS.THROMBIN_GENERATION.CT_EXTEM_MAX} s`, met: true },
          a5Fibtem: { value: rotemA5Fibtem, threshold: `< ${THRESHOLDS.FIBRINOGEN.A5_FIBTEM_THRESHOLD} mm`, met: true },
        },
        details: 'CT_EXTEM prolongado con A5_FIBTEM bajo se debe a hipofibrinogenemia, NO a déficit de factores de coagulación. El CT se normalizará al corregir el fibrinógeno. No administrar CCP hasta reevaluar post-corrección.',
        evidence: 'Görlinger K et al. Best Pract Res Clin Anaesthesiol 2013; Algoritmo Hepático A5 Werfen',
        followUp: 'Repetir ROTEM 15-20 min después de administrar fibrinógeno/crioprecipitados',
      });
    } else {
      // Fibrinógeno OK, CT prolongado indica déficit real de factores
      indicated = true;
      recommendations.push({
        action: 'ADMINISTRAR_CCP',
        priority: hasActiveBleeeding ? 1 : 2,
        description: 'Administrar Concentrado de Complejo Protrombínico (CCP)',
        dose: `15-25 UI/kg = ${Math.round(15 * weight)}-${Math.round(25 * weight)} UI`,
        criteria: {
          ctExtem: { value: rotemCtExtem, threshold: `> ${THRESHOLDS.THROMBIN_GENERATION.CT_EXTEM_MAX} s`, met: true },
        },
        target: 'Aumentar TP en 20%',
        details: 'CT_EXTEM prolongado con A5_FIBTEM adecuado indica déficit de factores vitamina K dependientes (II, V, VII, IX, X). El CCP de 4 factores contiene balance adecuado.',
        evidence: 'Kirchner C et al. Transfusion 2014 [Ref 6]; Inaba K et al. J Trauma Acute Care Surg 2015 [Ref 28]',
      });
    }
  }

  // 2. CT_INTEM prolongado → depende de CT_HEPTEM
  if (rotemCtIntem !== null && rotemCtIntem > THRESHOLDS.THROMBIN_GENERATION.CT_INTEM_MAX) {
    indicated = true;
    const weight = clinicalContext.weight || 70;

    // Si CT_HEPTEM también prolongado → PFC (déficit de factores V, VIII, XI)
    if (rotemCtHeptem !== null && rotemCtHeptem > THRESHOLDS.THROMBIN_GENERATION.CT_HEPTEM_MAX) {
      recommendations.push({
        action: 'ADMINISTRAR_PFC',
        priority: hasActiveBleeeding ? 1 : 2,
        description: 'Administrar Plasma Fresco Congelado (PFC)',
        dose: `10-15 ml/kg = ${Math.round(10 * weight)}-${Math.round(15 * weight)} ml`,
        criteria: {
          ctIntem: { value: rotemCtIntem, threshold: `> ${THRESHOLDS.THROMBIN_GENERATION.CT_INTEM_MAX} s`, met: true },
          ctHeptem: { value: rotemCtHeptem, threshold: `> ${THRESHOLDS.THROMBIN_GENERATION.CT_HEPTEM_MAX} s`, met: true },
        },
        details: 'CT_INTEM y CT_HEPTEM prolongados sugieren déficit de factores V, VIII o XI (no vitamina K dependientes). El CCP no contiene factor VIII.',
        evidence: 'Protocolo PRO/T 3 Sección 5.4.4',
        warning: 'Grandes volúmenes de PFC pueden causar sobrecarga de volumen en pacientes con HTP.',
      });
    }
  }

  if (indicated) {
    return {
      indicated: true,
      recommendations,
    };
  }

  return {
    indicated: false,
    criteria: {
      ctExtem: { value: rotemCtExtem, threshold: `> ${THRESHOLDS.THROMBIN_GENERATION.CT_EXTEM_MAX} s`, met: false },
      ctIntem: { value: rotemCtIntem, threshold: `> ${THRESHOLDS.THROMBIN_GENERATION.CT_INTEM_MAX} s`, met: false },
    },
    reason: 'Tiempos de coagulación dentro de rangos aceptables',
  };
}

/**
 * Evalúa la presencia de efecto heparínico (heparinización endógena)
 * Referencia: Sección 5.4.5 del protocolo
 */
function evaluateHeparinEffect(rotemData, clinicalContext) {
  const { rotemCtIntem, rotemCtHeptem } = rotemData;
  const { hasActiveBleeeding } = clinicalContext;

  if (rotemCtIntem === null || rotemCtHeptem === null) {
    return {
      indicated: false,
      reason: 'Datos insuficientes (se requiere CT_INTEM y CT_HEPTEM)',
      dataRequired: ['rotemCtIntem', 'rotemCtHeptem'],
    };
  }

  // Criterios: CT_INTEM > 240s con CT_HEPTEM < 240s y ratio < 0.75
  const ctIntemProlonged = rotemCtIntem > THRESHOLDS.HEPARIN_EFFECT.CT_INTEM_MIN;
  const ctHeptemNormal = rotemCtHeptem < THRESHOLDS.THROMBIN_GENERATION.CT_HEPTEM_MAX;
  const ratio = rotemCtHeptem / rotemCtIntem;
  const ratioIndicatesHeparin = ratio < THRESHOLDS.HEPARIN_EFFECT.CT_HEPTEM_RATIO_MAX;

  const indicated = ctIntemProlonged && ctHeptemNormal && ratioIndicatesHeparin && hasActiveBleeeding;

  if (indicated) {
    return {
      indicated: true,
      criteria: {
        ctIntem: { value: rotemCtIntem, threshold: `> ${THRESHOLDS.HEPARIN_EFFECT.CT_INTEM_MIN} s`, met: ctIntemProlonged },
        ctHeptem: { value: rotemCtHeptem, threshold: `< ${THRESHOLDS.THROMBIN_GENERATION.CT_HEPTEM_MAX} s`, met: ctHeptemNormal },
        ratio: { value: ratio.toFixed(2), threshold: `< ${THRESHOLDS.HEPARIN_EFFECT.CT_HEPTEM_RATIO_MAX}`, met: ratioIndicatesHeparin },
      },
      recommendation: {
        action: 'CONSIDERAR_PROTAMINA',
        priority: 2,
        description: 'Considerar administrar Protamina (si sangrado grave)',
        dose: '25-50 mg IV en 10 minutos',
        details: 'La heparinización endógena es frecuente en post-reperfusión por liberación de heparinoides del endotelio del injerto. Generalmente es autolimitada.',
        evidence: 'Gouvea G et al. Pediatric Transplant 2009 [Ref 31]; Bayly PJ et al. Br J Anaesth 1994 [Ref 32]',
        warning: 'El sobretratamiento con protamina puede aumentar el sangrado. Solo usar en presencia de sangrado clínico significativo.',
      },
    };
  }

  // Si hay prolongación de CT_INTEM pero también de CT_HEPTEM, no es efecto heparínico
  if (ctIntemProlonged && !ctHeptemNormal) {
    return {
      indicated: false,
      criteria: {
        ctIntem: { value: rotemCtIntem, threshold: `> ${THRESHOLDS.HEPARIN_EFFECT.CT_INTEM_MIN} s`, met: ctIntemProlonged },
        ctHeptem: { value: rotemCtHeptem, threshold: `< ${THRESHOLDS.THROMBIN_GENERATION.CT_HEPTEM_MAX} s`, met: ctHeptemNormal },
      },
      reason: 'CT_HEPTEM también prolongado - sugiere déficit de factores, no efecto heparínico',
      alternativeDiagnosis: 'Considerar déficit de factores V, VIII o XI',
    };
  }

  return {
    indicated: false,
    criteria: {
      ctIntem: { value: rotemCtIntem, threshold: `> ${THRESHOLDS.HEPARIN_EFFECT.CT_INTEM_MIN} s`, met: ctIntemProlonged },
      ctHeptem: { value: rotemCtHeptem, threshold: `< ${THRESHOLDS.THROMBIN_GENERATION.CT_HEPTEM_MAX} s`, met: ctHeptemNormal },
      ratio: { value: ratio.toFixed(2), threshold: `< ${THRESHOLDS.HEPARIN_EFFECT.CT_HEPTEM_RATIO_MAX}`, met: ratioIndicatesHeparin },
    },
    reason: 'No se detecta efecto heparínico significativo',
  };
}

/**
 * Evalúa la indicación de Factor VIIa de salvataje
 * Referencia: Sección 5.4.6 del protocolo
 */
function evaluateFactorVIIaSalvage(rotemData, clinicalContext, preconditionsResult) {
  const { hasActiveBleeeding, refractoryBleeding, ccpAvailable } = clinicalContext;

  // Solo indicado si:
  // 1. Sangrado difuso activo masivo refractario
  // 2. Todas las condiciones previas normalizadas
  // 3. Todos los parámetros ROTEM normalizados
  // 4. Preferentemente si CCP no disponible

  if (!refractoryBleeding) {
    return {
      indicated: false,
      reason: 'No hay sangrado refractario a otras medidas',
    };
  }

  if (!preconditionsResult.allMet) {
    return {
      indicated: false,
      reason: 'Condiciones previas no normalizadas - corregir antes de considerar Factor VIIa',
      pendingCorrections: preconditionsResult.issues,
    };
  }

  const weight = clinicalContext.weight || 70;

  return {
    indicated: true,
    isLastResort: true,
    recommendation: {
      action: 'CONSIDERAR_FACTOR_VIIA',
      priority: 3,
      description: 'Factor VIIa recombinante - ÚLTIMO RECURSO (off-label)',
      dose: `90 μg/kg = ${Math.round(90 * weight / 1000 * 1000)} μg (${(90 * weight / 1000).toFixed(1)} mg)`,
      alternativeDose: `4500 UI/kg = ${Math.round(4500 * weight)} UI`,
      details: 'Solo indicado en sangrado difuso activo masivo refractario a todas las medidas hemostáticas con parámetros normalizados.',
      evidence: 'Lau P et al. Transfus Med Hemother 2012 [Ref 35]',
      warning: 'No hay evidencia de beneficio profiláctico y puede aumentar eventos tromboembólicos.',
      warningEvidence: 'Simpson E et al. Cochrane Database 2012 [Ref 34]; Pandit TN et al. Am J Hematol 2012 [Ref 33]',
    },
    ccpPreferred: !ccpAvailable ?
      'El uso de CCP debe considerarse antes que Factor VIIa cuando esté disponible' :
      null,
  };
}

/**
 * Función principal que ejecuta el algoritmo completo
 * @param {Object} rotemData - Datos del ROTEM
 * @param {Object} clinicalContext - Contexto clínico del paciente
 * @returns {Object} - Evaluación completa con recomendaciones
 */
function runRotemAlgorithm(rotemData, clinicalContext) {
  const evaluation = {
    timestamp: new Date().toISOString(),
    phase: rotemData.phase,
    rotemValues: {
      extem: {
        ct: rotemData.rotemCtExtem,
        cft: rotemData.rotemCftExtem,
        a5: rotemData.rotemA5Extem,
        a10: rotemData.rotemA10Extem,
        mcf: rotemData.rotemMcfExtem,
        cli30: rotemData.rotemCli30,
        cli60: rotemData.rotemCli60,
        ml: rotemData.rotemMl,
      },
      fibtem: {
        ct: rotemData.rotemCtFibtem,
        a5: rotemData.rotemA5Fibtem,
        a10: rotemData.rotemA10Fibtem,
        mcf: rotemData.rotemMcfFibtem,
      },
      intem: {
        ct: rotemData.rotemCtIntem,
      },
      heptem: {
        ct: rotemData.rotemCtHeptem,
      },
      aptem: {
        a5: rotemData.rotemA5Aptem,
      },
    },
    clinicalContext: {
      hasActiveBleeeding: clinicalContext.hasActiveBleeeding,
      anticipatedBleeding: clinicalContext.anticipatedBleeding,
      weight: clinicalContext.weight,
    },
    evaluations: {},
    recommendations: [],
    prioritizedActions: [],
  };

  // 1. Evaluar condiciones previas
  const preconditions = evaluatePreconditions(clinicalContext);
  evaluation.evaluations.preconditions = preconditions;
  if (!preconditions.allMet) {
    evaluation.recommendations.push(...preconditions.recommendations);
  }

  // 2. Evaluar profilaxis de hiperfibrinólisis (solo en fases tempranas)
  const fibrinolysisProphylaxis = evaluateFibrinolysisProphylaxis(rotemData, clinicalContext);
  if (fibrinolysisProphylaxis) {
    evaluation.evaluations.fibrinolysisProphylaxis = fibrinolysisProphylaxis;
    if (fibrinolysisProphylaxis.indicated) {
      evaluation.recommendations.push(fibrinolysisProphylaxis.recommendation);
    }
  }

  // 3. Evaluar tratamiento de hiperfibrinólisis
  const fibrinolysisTreatment = evaluateFibrinolysisTreatment(rotemData);
  evaluation.evaluations.fibrinolysisTreatment = fibrinolysisTreatment;
  if (fibrinolysisTreatment.indicated) {
    evaluation.recommendations.push(fibrinolysisTreatment.recommendation);
    clinicalContext.hasHyperfibrinolysis = true;
  }

  // 4. Evaluar necesidad de fibrinógeno
  const fibrinogenNeed = evaluateFibrinogenNeed(rotemData, clinicalContext);
  evaluation.evaluations.fibrinogen = fibrinogenNeed;
  if (fibrinogenNeed.indicated) {
    evaluation.recommendations.push(fibrinogenNeed.recommendation);
  }

  // 5. Evaluar necesidad de plaquetas
  const plateletNeed = evaluatePlateletNeed(rotemData, clinicalContext);
  evaluation.evaluations.platelets = plateletNeed;
  if (plateletNeed.indicated) {
    evaluation.recommendations.push(plateletNeed.recommendation);
  }

  // 6. Evaluar necesidad de factores de coagulación
  const factorsNeed = evaluateCoagulationFactorsNeed(rotemData, clinicalContext);
  evaluation.evaluations.coagulationFactors = factorsNeed;
  if (factorsNeed.indicated) {
    evaluation.recommendations.push(...factorsNeed.recommendations);
  }

  // 7. Evaluar efecto heparínico
  const heparinEffect = evaluateHeparinEffect(rotemData, clinicalContext);
  evaluation.evaluations.heparinEffect = heparinEffect;
  if (heparinEffect.indicated) {
    evaluation.recommendations.push(heparinEffect.recommendation);
  }

  // 8. Evaluar Factor VIIa de salvataje
  const factorVIIa = evaluateFactorVIIaSalvage(rotemData, clinicalContext, preconditions);
  evaluation.evaluations.factorVIIa = factorVIIa;
  if (factorVIIa.indicated) {
    evaluation.recommendations.push(factorVIIa.recommendation);
  }

  // Priorizar acciones
  evaluation.prioritizedActions = evaluation.recommendations
    .sort((a, b) => a.priority - b.priority)
    .map((rec, index) => ({
      order: index + 1,
      action: rec.action,
      description: rec.description,
      priority: rec.priority,
      dose: rec.dose,
    }));

  // Determinar si hay alguna acción requerida
  evaluation.actionRequired = evaluation.recommendations.length > 0;
  evaluation.urgentActionRequired = evaluation.recommendations.some(r => r.priority === 1);

  return evaluation;
}

module.exports = {
  runRotemAlgorithm,
  evaluatePreconditions,
  evaluateFibrinolysisProphylaxis,
  evaluateFibrinolysisTreatment,
  evaluateFibrinogenNeed,
  evaluatePlateletNeed,
  evaluateCoagulationFactorsNeed,
  evaluateHeparinEffect,
  evaluateFactorVIIaSalvage,
  THRESHOLDS,
  SURGICAL_PHASES,
};
