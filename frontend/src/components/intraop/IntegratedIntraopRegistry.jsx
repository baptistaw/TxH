// src/components/intraop/IntegratedIntraopRegistry.jsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { intraopApi, fluidsApi } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import RotemAssistanceModal from './RotemAssistanceModal';
import OcrExtractionModal from './OcrExtractionModal';

/**
 * Calcular PAm automáticamente
 */
function calculateMAP(sys, dia) {
  if (!sys || !dia) return null;
  return Math.round((sys + 2 * dia) / 3);
}

/**
 * Calcular PAPm automáticamente
 */
function calculatePAPM(paps, papd) {
  if (!paps || !papd) return null;
  return Math.round((paps + 2 * papd) / 3);
}

/**
 * IntegratedIntraopRegistry - Componente unificado para registro intraoperatorio
 * Combina parámetros vitales, fluidos y pérdidas en un solo formulario
 */
export default function IntegratedIntraopRegistry({ caseId, phase, patientWeight, canEdit = true, onDataChange }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showLabForm, setShowLabForm] = useState(false);
  const [showEteForm, setShowEteForm] = useState(false);
  const [showRotemForm, setShowRotemForm] = useState(false);
  const [showRotemAssistance, setShowRotemAssistance] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [lastRotemData, setLastRotemData] = useState(null);
  const [lastLabValues, setLastLabValues] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [expandedRecords, setExpandedRecords] = useState({});
  const [lastVentilationParams, setLastVentilationParams] = useState(null);
  const [lastFluidsRecord, setLastFluidsRecord] = useState(null);
  const [lastDrugsRecord, setLastDrugsRecord] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm();

  // Form para laboratorio
  const {
    register: registerLab,
    handleSubmit: handleSubmitLab,
    reset: resetLab,
    watch: watchLab,
  } = useForm();

  // Watch para cálculos automáticos
  const pas = watch('pas');
  const pad = watch('pad');
  const paps = watch('paps');
  const papd = watch('papd');

  // Watch para PaO2 del formulario de laboratorio
  const labPaO2 = watchLab('paO2');

  // Calcular PaFI (PaO2/FiO2) - PaO2 viene del lab, FiO2 del último registro de ventilación
  const calculatedPaFI = useMemo(() => {
    const paO2Num = labPaO2 ? parseFloat(labPaO2) : null;
    const fio2Value = lastVentilationParams?.fio2;
    const fio2Num = fio2Value ? parseFloat(fio2Value) / 100 : null; // fio2 está en %
    if (paO2Num && fio2Num && fio2Num > 0) {
      return Math.round(paO2Num / fio2Num);
    }
    return null;
  }, [labPaO2, lastVentilationParams?.fio2]);

  // Auto-calcular PAm y PAPm
  useEffect(() => {
    if (showForm || editingRecord) {
      // Convertir a números antes de calcular
      const pasNum = pas ? parseFloat(pas) : null;
      const padNum = pad ? parseFloat(pad) : null;
      const papsNum = paps ? parseFloat(paps) : null;
      const papdNum = papd ? parseFloat(papd) : null;

      const calculatedMAP = calculateMAP(pasNum, padNum);
      if (calculatedMAP) setValue('pam', calculatedMAP);

      const calculatedPAPM = calculatePAPM(papsNum, papdNum);
      if (calculatedPAPM) setValue('papm', calculatedPAPM);
    }
  }, [pas, pad, paps, papd, showForm, editingRecord, setValue]);

  // Cargar registros
  useEffect(() => {
    if (caseId && phase) {
      fetchRecords();
    }
  }, [caseId, phase]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      // Cargar registros de parámetros vitales y fluidos
      const [intraopResponse, fluidsResponse] = await Promise.allSettled([
        intraopApi.list({ caseId, phase }),
        fluidsApi.list({ caseId, phase }),
      ]);

      const intraopRecords = intraopResponse.status === 'fulfilled' ? intraopResponse.value.data || [] : [];
      const fluidsRecords = fluidsResponse.status === 'fulfilled' ? fluidsResponse.value.data || [] : [];

      // Guardar último registro para auto-duplicar ventilación
      if (intraopRecords.length > 0) {
        const lastRecord = intraopRecords[intraopRecords.length - 1];
        setLastVentilationParams({
          ventMode: lastRecord.ventMode,
          fio2: lastRecord.fio2 ? Math.round(lastRecord.fio2 * 100) : null,
          tidalVolume: lastRecord.tidalVolume,
          respRate: lastRecord.respRate,
          peep: lastRecord.peep,
          peakPressure: lastRecord.peakPressure,
        });

        // Guardar último registro de fármacos para duplicar desde DISECCION
        setLastDrugsRecord({
          inhalAgent: lastRecord.inhalAgent || '',
          opioidBolus: lastRecord.opioidBolus || false,
          opioidInfusion: lastRecord.opioidInfusion || false,
          hypnoticBolus: lastRecord.hypnoticBolus || false,
          hypnoticInfusion: lastRecord.hypnoticInfusion || false,
          relaxantBolus: lastRecord.relaxantBolus || false,
          relaxantInfusion: lastRecord.relaxantInfusion || false,
          lidocaineBolus: lastRecord.lidocaineBolus || false,
          lidocaineInfusion: lastRecord.lidocaineInfusion || false,
          adrenalineBolus: lastRecord.adrenalineBolus || false,
          adrenalineInfusion: lastRecord.adrenalineInfusion || false,
          dobutamine: lastRecord.dobutamine || false,
          dopamine: lastRecord.dopamine || false,
          noradrenaline: lastRecord.noradrenaline || false,
          phenylephrine: lastRecord.phenylephrine || false,
          insulinBolus: lastRecord.insulinBolus || false,
          insulinInfusion: lastRecord.insulinInfusion || false,
          furosemide: lastRecord.furosemide || false,
          tranexamicBolus: lastRecord.tranexamicBolus || false,
          tranexamicInfusion: lastRecord.tranexamicInfusion || false,
          calciumGluconBolus: lastRecord.calciumGluconBolus || false,
          calciumGluconInfusion: lastRecord.calciumGluconInfusion || false,
          sodiumBicarb: lastRecord.sodiumBicarb || false,
          antibiotics: lastRecord.antibiotics || false,
        });
      }

      // Guardar último registro de fluidos para valores acumulativos
      if (fluidsRecords.length > 0) {
        const lastFluid = fluidsRecords[fluidsRecords.length - 1];
        setLastFluidsRecord(lastFluid);
      }

      // Combinar registros por timestamp
      const combined = combineRecords(intraopRecords, fluidsRecords);
      setRecords(combined);

      if (onDataChange) {
        onDataChange(combined);
      }
    } catch (error) {
      console.error('Error al cargar registros:', error);
    } finally {
      setLoading(false);
    }
  };

  // Combinar registros por timestamp
  const combineRecords = (intraopRecords, fluidsRecords) => {
    const recordMap = new Map();

    // Agregar registros de parámetros vitales
    intraopRecords.forEach((record) => {
      const key = new Date(record.timestamp).getTime();
      recordMap.set(key, {
        timestamp: record.timestamp,
        intraop: record,
        fluids: null,
      });
    });

    // Agregar/combinar registros de fluidos
    fluidsRecords.forEach((record) => {
      const key = new Date(record.timestamp).getTime();
      if (recordMap.has(key)) {
        recordMap.get(key).fluids = record;
      } else {
        recordMap.set(key, {
          timestamp: record.timestamp,
          intraop: null,
          fluids: record,
        });
      }
    });

    // Convertir a array y ordenar por timestamp ascendente (más antiguos primero)
    return Array.from(recordMap.values()).sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  };

  // Iniciar nuevo registro
  const handleNewRecord = () => {
    setShowForm(true);
    setEditingRecord(null);

    // Auto-duplicar parámetros de ventilación del último registro
    const ventilationDefaults = lastVentilationParams || {
      ventMode: '',
      fio2: '',
      tidalVolume: '',
      respRate: '',
      peep: '',
      peakPressure: '',
    };

    // Pre-llenar fluidos con valores acumulativos del último registro
    const fluidsDefaults = lastFluidsRecord || {
      plasmalyte: 0,
      ringer: 0,
      saline: 0,
      dextrose: 0,
      colloids: 0,
      albumin: 0,
      redBloodCells: 0,
      plasma: 0,
      platelets: 0,
      cryoprecip: 0,
      cellSaver: 0,
      fibrinogen: 0,
      pcc: 0,
      factorVII: 0,
      otherFluids: '',
      insensibleLoss: 0,
      ascites: 0,
      suction: 0,
      gauze: 0,
      urine: 0,
    };

    // Verificar si estamos en fases DISECCION hasta CIERRE para duplicar fármacos
    const phasesShouldDuplicateDrugs = [
      'DISECCION',
      'ANHEPATICA',
      'PRE_REPERFUSION',
      'POST_REPERFUSION',
      'VIA_BILIAR',
      'CIERRE'
    ];
    const shouldDuplicateDrugs = phasesShouldDuplicateDrugs.includes(phase);

    // Pre-llenar fármacos si estamos en fases DISECCION-CIERRE y hay registro previo
    const drugsDefaults = (shouldDuplicateDrugs && lastDrugsRecord) ? lastDrugsRecord : {
      inhalAgent: '',
      opioidBolus: false,
      opioidInfusion: false,
      hypnoticBolus: false,
      hypnoticInfusion: false,
      relaxantBolus: false,
      relaxantInfusion: false,
      lidocaineBolus: false,
      lidocaineInfusion: false,
      adrenalineBolus: false,
      adrenalineInfusion: false,
      dobutamine: false,
      dopamine: false,
      noradrenaline: false,
      phenylephrine: false,
      insulinBolus: false,
      insulinInfusion: false,
      furosemide: false,
      tranexamicBolus: false,
      tranexamicInfusion: false,
      calciumGluconBolus: false,
      calciumGluconInfusion: false,
      sodiumBicarb: false,
      antibiotics: false,
    };

    // Calcular pérdida insensible automáticamente (3 ml/kg/hora)
    let calculatedInsensibleLoss = fluidsDefaults.insensibleLoss || 0;
    if (patientWeight && lastFluidsRecord) {
      const now = new Date();
      const lastTimestamp = new Date(lastFluidsRecord.timestamp);
      const hoursElapsed = (now - lastTimestamp) / (1000 * 60 * 60); // Convertir ms a horas

      if (hoursElapsed > 0) {
        // Fórmula: 3 ml/kg/hora
        const incrementalLoss = 3 * patientWeight * hoursElapsed;
        // Redondear a la centena más cercana
        const roundedIncrement = Math.round(incrementalLoss / 100) * 100;
        // Sumar al último valor acumulativo
        calculatedInsensibleLoss = (fluidsDefaults.insensibleLoss || 0) + roundedIncrement;
      }
    }

    reset({
      timestamp: new Date().toISOString().slice(0, 16),
      // Parámetros vitales
      heartRate: '',
      pas: '',
      pad: '',
      pam: '',
      satO2: '',
      cvp: '',
      temp: '',
      etCO2: '',
      // Ventilación - Auto-duplicada del último registro
      ventMode: ventilationDefaults.ventMode || '',
      fio2: ventilationDefaults.fio2 || '',
      tidalVolume: ventilationDefaults.tidalVolume || '',
      respRate: ventilationDefaults.respRate || '',
      peep: ventilationDefaults.peep || '',
      peakPressure: ventilationDefaults.peakPressure || '',
      // Hemodinamia avanzada
      paps: '',
      papd: '',
      papm: '',
      pcwp: '',
      cardiacOutput: '',
      // Monitoreo
      bis: '',
      icp: '',
      svO2: '',
      // Fluidos - Pre-llenados con valores acumulativos del último registro
      plasmalyte: fluidsDefaults.plasmalyte || 0,
      ringer: fluidsDefaults.ringer || 0,
      saline: fluidsDefaults.saline || 0,
      dextrose: fluidsDefaults.dextrose || 0,
      colloids: fluidsDefaults.colloids || 0,
      albumin: fluidsDefaults.albumin || 0,
      redBloodCells: fluidsDefaults.redBloodCells || 0,
      plasma: fluidsDefaults.plasma || 0,
      platelets: fluidsDefaults.platelets || 0,
      cryoprecip: fluidsDefaults.cryoprecip || 0,
      cellSaver: fluidsDefaults.cellSaver || 0,
      fibrinogen: fluidsDefaults.fibrinogen || 0,
      pcc: fluidsDefaults.pcc || 0,
      factorVII: fluidsDefaults.factorVII || 0,
      otherFluids: fluidsDefaults.otherFluids || '',
      insensibleLoss: calculatedInsensibleLoss,
      ascites: fluidsDefaults.ascites || 0,
      suction: fluidsDefaults.suction || 0,
      gauze: fluidsDefaults.gauze || 0,
      urine: fluidsDefaults.urine || 0,
      // Fármacos - Duplicar desde DISECCION hasta CIERRE
      inhalAgent: drugsDefaults.inhalAgent || '',
      opioidBolus: drugsDefaults.opioidBolus || false,
      opioidInfusion: drugsDefaults.opioidInfusion || false,
      hypnoticBolus: drugsDefaults.hypnoticBolus || false,
      hypnoticInfusion: drugsDefaults.hypnoticInfusion || false,
      relaxantBolus: drugsDefaults.relaxantBolus || false,
      relaxantInfusion: drugsDefaults.relaxantInfusion || false,
      lidocaineBolus: drugsDefaults.lidocaineBolus || false,
      lidocaineInfusion: drugsDefaults.lidocaineInfusion || false,
      adrenalineBolus: drugsDefaults.adrenalineBolus || false,
      adrenalineInfusion: drugsDefaults.adrenalineInfusion || false,
      dobutamine: drugsDefaults.dobutamine || false,
      dopamine: drugsDefaults.dopamine || false,
      noradrenaline: drugsDefaults.noradrenaline || false,
      phenylephrine: drugsDefaults.phenylephrine || false,
      insulinBolus: drugsDefaults.insulinBolus || false,
      insulinInfusion: drugsDefaults.insulinInfusion || false,
      furosemide: drugsDefaults.furosemide || false,
      tranexamicBolus: drugsDefaults.tranexamicBolus || false,
      tranexamicInfusion: drugsDefaults.tranexamicInfusion || false,
      calciumGluconBolus: drugsDefaults.calciumGluconBolus || false,
      calciumGluconInfusion: drugsDefaults.calciumGluconInfusion || false,
      sodiumBicarb: drugsDefaults.sodiumBicarb || false,
      antibiotics: drugsDefaults.antibiotics || false,
    });
  };

  // Iniciar formulario de laboratorio
  const handleNewLab = () => {
    setShowLabForm(true);
    resetLab({
      timestamp: new Date().toISOString().slice(0, 16),
      hb: '',
      hto: '',
      sodium: '',
      potassium: '',
      ionicCalcium: '',
      magnesium: '',
      pH: '',
      paO2: '',
      paCO2: '',
      pvpH: '',
      pvO2: '',
      pvCO2: '',
      glucose: '',
      lactate: '',
      proteins: '',
      creatinine: '',
    });
  };

  const handleNewEte = () => {
    setShowEteForm(true);
    resetLab({
      timestamp: new Date().toISOString().slice(0, 16),
      eteRightVentricle: '',
      eteTapse: '',
      eteLeftVentricle: '',
      eteChamberDilation: '',
      etePsap: '',
      eteThrombus: '',
      etePericardial: '',
      eteVolumeStatus: '',
      eteObservations: '',
    });
  };

  const handleNewRotem = () => {
    setShowRotemForm(true);
    resetLab({
      timestamp: new Date().toISOString().slice(0, 16),
      // EXTEM
      rotemCtExtem: '',
      rotemCftExtem: '',
      rotemA5Extem: '',
      rotemA10Extem: '',
      rotemMcfExtem: '',
      rotemCli30: '',
      rotemCli60: '',
      rotemMl: '',
      // FIBTEM
      rotemCtFibtem: '',
      rotemA5Fibtem: '',
      rotemA10Fibtem: '',
      rotemMcfFibtem: '',
      // INTEM/HEPTEM
      rotemCtIntem: '',
      rotemCtHeptem: '',
      // APTEM
      rotemA5Aptem: '',
    });
  };

  // Guardar registro
  const onSubmit = async (data) => {
    try {
      const timestamp = new Date(data.timestamp).toISOString();

      // Validar ventilación si es el primer registro de la fase (solo al crear, no al editar)
      const isFirstRecord = records.filter(r => r.intraop).length === 0;
      if (!editingRecord && isFirstRecord && !data.ventMode) {
        alert('Los parámetros de ventilación son obligatorios para el primer registro de la fase.');
        return;
      }

      // Guardar parámetros vitales (SIN laboratorio)
      const intraopData = {
        caseId,
        phase,
        timestamp,
        // Ventilación
        ventMode: data.ventMode || null,
        fio2: data.fio2 ? parseFloat(data.fio2) / 100 : null,
        tidalVolume: data.tidalVolume ? parseInt(data.tidalVolume) : null,
        respRate: data.respRate ? parseInt(data.respRate) : null,
        peep: data.peep ? parseInt(data.peep) : null,
        peakPressure: data.peakPressure ? parseInt(data.peakPressure) : null,
        // Hemodinamia básica
        heartRate: data.heartRate ? parseInt(data.heartRate) : null,
        satO2: data.satO2 ? parseInt(data.satO2) : null,
        pas: data.pas ? parseInt(data.pas) : null,
        pad: data.pad ? parseInt(data.pad) : null,
        pam: data.pam ? parseInt(data.pam) : null,
        cvp: data.cvp ? parseInt(data.cvp) : null,
        etCO2: data.etCO2 ? parseInt(data.etCO2) : null,
        temp: data.temp ? parseFloat(data.temp) : null,
        // Hemodinamia avanzada
        paps: data.paps ? parseInt(data.paps) : null,
        papd: data.papd ? parseInt(data.papd) : null,
        papm: data.papm ? parseInt(data.papm) : null,
        pcwp: data.pcwp ? parseInt(data.pcwp) : null,
        cardiacOutput: data.cardiacOutput ? parseFloat(data.cardiacOutput) : null,
        // Monitoreo
        bis: data.bis ? parseInt(data.bis) : null,
        icp: data.icp ? parseInt(data.icp) : null,
        svO2: data.svO2 ? parseInt(data.svO2) : null,
        // Laboratorio - todos en null (se guardan por separado)
        hb: null,
        hto: null,
        platelets: null,
        pt: null,
        inr: null,
        fibrinogen: null,
        aptt: null,
        sodium: null,
        potassium: null,
        ionicCalcium: null,
        magnesium: null,
        chloride: null,
        phosphorus: null,
        pH: null,
        paO2: null,
        paCO2: null,
        hco3: null,
        baseExcess: null,
        pvpH: null,
        pvO2: null,
        pvCO2: null,
        azotemia: null,
        creatinine: null,
        sgot: null,
        sgpt: null,
        totalBili: null,
        directBili: null,
        albumin: null,
        glucose: null,
        lactate: null,
        proteins: null,
        // ETE y ROTEM se registran separadamente con timestamp independiente
        eteRightVentricle: null,
        eteTapse: null,
        eteLeftVentricle: null,
        eteChamberDilation: null,
        etePsap: null,
        eteThrombus: null,
        etePericardial: null,
        eteVolumeStatus: null,
        eteObservations: null,
        rotemCtExtem: null,
        rotemA5Extem: null,
        rotemA5Fibtem: null,
        rotemCli30: null,
        rotemMcfExtem: null,
        rotemMcfFibtem: null,
        rotemCtIntem: null,
        rotemCtHeptem: null,
        // Fármacos
        inhalAgent: data.inhalAgent || null,
        opioidBolus: data.opioidBolus || false,
        opioidInfusion: data.opioidInfusion || false,
        hypnoticBolus: data.hypnoticBolus || false,
        hypnoticInfusion: data.hypnoticInfusion || false,
        relaxantBolus: data.relaxantBolus || false,
        relaxantInfusion: data.relaxantInfusion || false,
        lidocaineBolus: data.lidocaineBolus || false,
        lidocaineInfusion: data.lidocaineInfusion || false,
        adrenalineBolus: data.adrenalineBolus || false,
        adrenalineInfusion: data.adrenalineInfusion || false,
        dobutamine: data.dobutamine || false,
        dopamine: data.dopamine || false,
        noradrenaline: data.noradrenaline || false,
        phenylephrine: data.phenylephrine || false,
        insulinBolus: data.insulinBolus || false,
        insulinInfusion: data.insulinInfusion || false,
        furosemide: data.furosemide || false,
        tranexamicBolus: data.tranexamicBolus || false,
        tranexamicInfusion: data.tranexamicInfusion || false,
        calciumGluconBolus: data.calciumGluconBolus || false,
        calciumGluconInfusion: data.calciumGluconInfusion || false,
        sodiumBicarb: data.sodiumBicarb || false,
        antibiotics: data.antibiotics || false,
      };

      // Actualizar o crear registro de intraop
      if (editingRecord && editingRecord.intraop) {
        await intraopApi.update(editingRecord.intraop.id, intraopData);
      } else {
        await intraopApi.create(intraopData);
      }

      // Guardar fluidos y pérdidas (solo si hay datos)
      const hasFluidsData =
        data.plasmalyte || data.ringer || data.saline || data.dextrose ||
        data.colloids || data.albumin ||
        data.redBloodCells || data.plasma || data.platelets ||
        data.cryoprecip || data.cellSaver || data.fibrinogen ||
        data.pcc || data.factorVII ||
        data.insensibleLoss || data.ascites || data.suction ||
        data.gauze || data.urine || data.otherFluids;

      if (hasFluidsData) {
        const fluidsData = {
          caseId,
          phase,
          timestamp,
          plasmalyte: parseInt(data.plasmalyte) || 0,
          ringer: parseInt(data.ringer) || 0,
          saline: parseInt(data.saline) || 0,
          dextrose: parseInt(data.dextrose) || 0,
          colloids: parseInt(data.colloids) || 0,
          albumin: parseInt(data.albumin) || 0,
          redBloodCells: parseInt(data.redBloodCells) || 0,
          plasma: parseInt(data.plasma) || 0,
          platelets: parseInt(data.platelets) || 0,
          cryoprecip: parseInt(data.cryoprecip) || 0,
          cellSaver: parseInt(data.cellSaver) || 0,
          fibrinogen: parseInt(data.fibrinogen) || 0,
          pcc: parseInt(data.pcc) || 0,
          factorVII: parseInt(data.factorVII) || 0,
          otherFluids: data.otherFluids || '',
          insensibleLoss: parseInt(data.insensibleLoss) || 0,
          ascites: parseInt(data.ascites) || 0,
          suction: parseInt(data.suction) || 0,
          gauze: parseInt(data.gauze) || 0,
          urine: parseInt(data.urine) || 0,
        };

        // Actualizar o crear registro de fluidos
        if (editingRecord && editingRecord.fluids) {
          await fluidsApi.update(editingRecord.fluids.id, fluidsData);
        } else {
          await fluidsApi.create(fluidsData);
        }
      } else if (editingRecord && editingRecord.fluids) {
        // Si se eliminaron todos los fluidos, eliminar el registro
        await fluidsApi.delete(editingRecord.fluids.id);
      }

      // Cerrar formulario y recargar
      setShowForm(false);
      setEditingRecord(null);
      await fetchRecords();
    } catch (error) {
      alert('Error al guardar registro: ' + error.message);
    }
  };

  // Guardar laboratorio
  const onSubmitLab = async (data) => {
    try {
      const timestamp = new Date(data.timestamp).toISOString();

      // Crear un registro intraop solo con laboratorio y timestamp
      const labData = {
        caseId,
        phase,
        timestamp,
        // Todos los parámetros vitales en null, excepto FiO2 para calcular PaFI
        ventMode: null,
        fio2: lastVentilationParams?.fio2 ? lastVentilationParams.fio2 / 100 : null, // Convertir de % a decimal
        tidalVolume: null,
        respRate: null,
        peep: null,
        peakPressure: null,
        heartRate: null,
        satO2: null,
        pas: null,
        pad: null,
        pam: null,
        cvp: null,
        etCO2: null,
        temp: null,
        paps: null,
        papd: null,
        papm: null,
        pcwp: null,
        cardiacOutput: null,
        bis: null,
        icp: null,
        svO2: null,
        // Laboratorio - Hematología
        hb: data.hb ? parseFloat(data.hb) : null,
        hto: data.hto ? parseFloat(data.hto) : null,
        platelets: data.platelets ? parseFloat(data.platelets) : null,
        // Laboratorio - Coagulación
        pt: data.pt ? parseFloat(data.pt) : null,
        inr: data.inr ? parseFloat(data.inr) : null,
        fibrinogen: data.fibrinogen ? parseFloat(data.fibrinogen) : null,
        aptt: data.aptt ? parseFloat(data.aptt) : null,
        // Laboratorio - Electrolitos
        sodium: data.sodium ? parseFloat(data.sodium) : null,
        potassium: data.potassium ? parseFloat(data.potassium) : null,
        ionicCalcium: data.ionicCalcium ? parseFloat(data.ionicCalcium) : null,
        magnesium: data.magnesium ? parseFloat(data.magnesium) : null,
        chloride: data.chloride ? parseFloat(data.chloride) : null,
        phosphorus: data.phosphorus ? parseFloat(data.phosphorus) : null,
        // Laboratorio - Gases arteriales
        pH: data.pH ? parseFloat(data.pH) : null,
        paO2: data.paO2 ? parseFloat(data.paO2) : null,
        paCO2: data.paCO2 ? parseFloat(data.paCO2) : null,
        hco3: data.hco3 ? parseFloat(data.hco3) : null,
        baseExcess: data.baseExcess ? parseFloat(data.baseExcess) : null,
        // Laboratorio - Gases venosos
        pvpH: data.pvpH ? parseFloat(data.pvpH) : null,
        pvO2: data.pvO2 ? parseFloat(data.pvO2) : null,
        pvCO2: data.pvCO2 ? parseFloat(data.pvCO2) : null,
        // Laboratorio - Función renal
        azotemia: data.azotemia ? parseFloat(data.azotemia) : null,
        creatinine: data.creatinine ? parseFloat(data.creatinine) : null,
        // Laboratorio - Función hepática
        sgot: data.sgot ? parseFloat(data.sgot) : null,
        sgpt: data.sgpt ? parseFloat(data.sgpt) : null,
        totalBili: data.totalBili ? parseFloat(data.totalBili) : null,
        directBili: data.directBili ? parseFloat(data.directBili) : null,
        albumin: data.albumin ? parseFloat(data.albumin) : null,
        // Laboratorio - Metabólicos
        glucose: data.glucose ? parseFloat(data.glucose) : null,
        lactate: data.lactate ? parseFloat(data.lactate) : null,
        proteins: data.proteins ? parseFloat(data.proteins) : null,
        // ETE y ROTEM en null
        eteRightVentricle: null,
        eteTapse: null,
        eteLeftVentricle: null,
        eteChamberDilation: null,
        etePsap: null,
        eteThrombus: null,
        etePericardial: null,
        eteVolumeStatus: null,
        eteObservations: null,
        rotemCtExtem: null,
        rotemA5Extem: null,
        rotemA5Fibtem: null,
        rotemCli30: null,
        rotemMcfExtem: null,
        rotemMcfFibtem: null,
        rotemCtIntem: null,
        rotemCtHeptem: null,
      };

      await intraopApi.create(labData);

      // Cerrar formulario y recargar
      setShowLabForm(false);
      await fetchRecords();
    } catch (error) {
      alert('Error al guardar laboratorio: ' + error.message);
    }
  };

  const onSubmitEte = async (data) => {
    try {
      const timestamp = new Date(data.timestamp).toISOString();

      // Crear un registro intraop solo con ETE y timestamp
      const eteData = {
        caseId,
        phase,
        timestamp,
        // Todos los parámetros vitales y laboratorio en null
        ventMode: null,
        fio2: null,
        tidalVolume: null,
        respRate: null,
        peep: null,
        peakPressure: null,
        heartRate: null,
        satO2: null,
        pas: null,
        pad: null,
        pam: null,
        cvp: null,
        etCO2: null,
        temp: null,
        paps: null,
        papd: null,
        papm: null,
        pcwp: null,
        cardiacOutput: null,
        bis: null,
        icp: null,
        svO2: null,
        hb: null,
        hto: null,
        sodium: null,
        potassium: null,
        ionicCalcium: null,
        magnesium: null,
        pH: null,
        paO2: null,
        paCO2: null,
        pvpH: null,
        pvO2: null,
        pvCO2: null,
        glucose: null,
        lactate: null,
        proteins: null,
        creatinine: null,
        // ETE
        eteRightVentricle: data.eteRightVentricle || null,
        eteTapse: data.eteTapse || null,
        eteLeftVentricle: data.eteLeftVentricle || null,
        eteChamberDilation: data.eteChamberDilation || null,
        etePsap: data.etePsap || null,
        eteThrombus: data.eteThrombus || null,
        etePericardial: data.etePericardial || null,
        eteVolumeStatus: data.eteVolumeStatus || null,
        eteObservations: data.eteObservations || null,
        // ROTEM en null
        rotemCtExtem: null,
        rotemA5Extem: null,
        rotemA5Fibtem: null,
        rotemCli30: null,
        rotemMcfExtem: null,
        rotemMcfFibtem: null,
        rotemCtIntem: null,
        rotemCtHeptem: null,
      };

      await intraopApi.create(eteData);

      // Cerrar formulario y recargar
      setShowEteForm(false);
      await fetchRecords();
    } catch (error) {
      alert('Error al guardar ETE: ' + error.message);
    }
  };

  const onSubmitRotem = async (data) => {
    try {
      const timestamp = new Date(data.timestamp).toISOString();

      // Crear un registro intraop solo con ROTEM y timestamp
      const rotemData = {
        caseId,
        phase,
        timestamp,
        // Todos los parámetros vitales y laboratorio en null
        ventMode: null,
        fio2: null,
        tidalVolume: null,
        respRate: null,
        peep: null,
        peakPressure: null,
        heartRate: null,
        satO2: null,
        pas: null,
        pad: null,
        pam: null,
        cvp: null,
        etCO2: null,
        temp: null,
        paps: null,
        papd: null,
        papm: null,
        pcwp: null,
        cardiacOutput: null,
        bis: null,
        icp: null,
        svO2: null,
        hb: null,
        hto: null,
        sodium: null,
        potassium: null,
        ionicCalcium: null,
        magnesium: null,
        pH: null,
        paO2: null,
        paCO2: null,
        pvpH: null,
        pvO2: null,
        pvCO2: null,
        glucose: null,
        lactate: null,
        proteins: null,
        creatinine: null,
        // ETE en null
        eteRightVentricle: null,
        eteTapse: null,
        eteLeftVentricle: null,
        eteChamberDilation: null,
        etePsap: null,
        eteThrombus: null,
        etePericardial: null,
        eteVolumeStatus: null,
        eteObservations: null,
        // ROTEM - Parámetros completos para algoritmo de decisión
        rotemCtExtem: data.rotemCtExtem ? parseInt(data.rotemCtExtem) : null,
        rotemCftExtem: data.rotemCftExtem ? parseInt(data.rotemCftExtem) : null,
        rotemA5Extem: data.rotemA5Extem ? parseInt(data.rotemA5Extem) : null,
        rotemA10Extem: data.rotemA10Extem ? parseInt(data.rotemA10Extem) : null,
        rotemMcfExtem: data.rotemMcfExtem ? parseInt(data.rotemMcfExtem) : null,
        rotemCli30: data.rotemCli30 ? parseInt(data.rotemCli30) : null,
        rotemCli60: data.rotemCli60 ? parseInt(data.rotemCli60) : null,
        rotemMl: data.rotemMl ? parseInt(data.rotemMl) : null,
        rotemCtFibtem: data.rotemCtFibtem ? parseInt(data.rotemCtFibtem) : null,
        rotemA5Fibtem: data.rotemA5Fibtem ? parseInt(data.rotemA5Fibtem) : null,
        rotemA10Fibtem: data.rotemA10Fibtem ? parseInt(data.rotemA10Fibtem) : null,
        rotemMcfFibtem: data.rotemMcfFibtem ? parseInt(data.rotemMcfFibtem) : null,
        rotemCtIntem: data.rotemCtIntem ? parseInt(data.rotemCtIntem) : null,
        rotemCtHeptem: data.rotemCtHeptem ? parseInt(data.rotemCtHeptem) : null,
        rotemA5Aptem: data.rotemA5Aptem ? parseInt(data.rotemA5Aptem) : null,
      };

      await intraopApi.create(rotemData);

      // Guardar los datos ROTEM para el modal de asistencia
      setLastRotemData(rotemData);

      // Obtener últimos valores de laboratorio de los registros existentes
      // Buscar el registro más reciente que tenga valores de lab/gases
      const labRecord = records.find(r =>
        r.intraop && (r.intraop.pH || r.intraop.ionicCalcium || r.intraop.hb || r.intraop.temperature)
      );
      if (labRecord?.intraop) {
        setLastLabValues({
          pH: labRecord.intraop.pH,
          ionicCalcium: labRecord.intraop.ionicCalcium,
          hb: labRecord.intraop.hb,
          temp: labRecord.intraop.temperature,
        });
      }

      // Cerrar formulario y recargar
      setShowRotemForm(false);
      await fetchRecords();

      // Mostrar modal de asistencia para recomendaciones
      setShowRotemAssistance(true);
    } catch (error) {
      alert('Error al guardar ROTEM: ' + error.message);
    }
  };

  // Cancelar formulario
  const handleCancel = () => {
    setShowForm(false);
    setEditingRecord(null);
    reset();
  };

  // Cancelar formulario de laboratorio
  const handleCancelLab = () => {
    setShowLabForm(false);
    resetLab();
  };

  const handleCancelEte = () => {
    setShowEteForm(false);
    resetLab();
  };

  const handleCancelRotem = () => {
    setShowRotemForm(false);
    resetLab();
  };

  // Toggle expandir registro
  const toggleRecord = (timestamp) => {
    setExpandedRecords(prev => ({
      ...prev,
      [timestamp]: !prev[timestamp]
    }));
  };

  // Editar registro
  const handleEdit = (record) => {
    setShowForm(true);
    setShowLabForm(false);
    setEditingRecord(record);

    const intraop = record.intraop;
    const fluids = record.fluids;

    reset({
      timestamp: new Date(record.timestamp).toISOString().slice(0, 16),
      // Parámetros vitales
      heartRate: intraop?.heartRate || '',
      pas: intraop?.pas || '',
      pad: intraop?.pad || '',
      pam: intraop?.pam || '',
      satO2: intraop?.satO2 || '',
      cvp: intraop?.cvp || '',
      temp: intraop?.temp || '',
      etCO2: intraop?.etCO2 || '',
      // Ventilación
      ventMode: intraop?.ventMode || '',
      fio2: intraop?.fio2 ? Math.round(intraop.fio2 * 100) : '',
      tidalVolume: intraop?.tidalVolume || '',
      respRate: intraop?.respRate || '',
      peep: intraop?.peep || '',
      peakPressure: intraop?.peakPressure || '',
      // Hemodinamia avanzada
      paps: intraop?.paps || '',
      papd: intraop?.papd || '',
      papm: intraop?.papm || '',
      pcwp: intraop?.pcwp || '',
      cardiacOutput: intraop?.cardiacOutput || '',
      // Monitoreo
      bis: intraop?.bis || '',
      icp: intraop?.icp || '',
      svO2: intraop?.svO2 || '',
      // Fluidos
      plasmalyte: fluids?.plasmalyte || 0,
      ringer: fluids?.ringer || 0,
      saline: fluids?.saline || 0,
      dextrose: fluids?.dextrose || 0,
      colloids: fluids?.colloids || 0,
      albumin: fluids?.albumin || 0,
      redBloodCells: fluids?.redBloodCells || 0,
      plasma: fluids?.plasma || 0,
      platelets: fluids?.platelets || 0,
      cryoprecip: fluids?.cryoprecip || 0,
      cellSaver: fluids?.cellSaver || 0,
      fibrinogen: fluids?.fibrinogen || 0,
      pcc: fluids?.pcc || 0,
      factorVII: fluids?.factorVII || 0,
      otherFluids: fluids?.otherFluids || '',
      // Pérdidas
      insensibleLoss: fluids?.insensibleLoss || 0,
      ascites: fluids?.ascites || 0,
      suction: fluids?.suction || 0,
      gauze: fluids?.gauze || 0,
      urine: fluids?.urine || 0,
      // Fármacos
      inhalAgent: intraop?.inhalAgent || '',
      opioidBolus: intraop?.opioidBolus || false,
      opioidInfusion: intraop?.opioidInfusion || false,
      hypnoticBolus: intraop?.hypnoticBolus || false,
      hypnoticInfusion: intraop?.hypnoticInfusion || false,
      relaxantBolus: intraop?.relaxantBolus || false,
      relaxantInfusion: intraop?.relaxantInfusion || false,
      lidocaineBolus: intraop?.lidocaineBolus || false,
      lidocaineInfusion: intraop?.lidocaineInfusion || false,
      adrenalineBolus: intraop?.adrenalineBolus || false,
      adrenalineInfusion: intraop?.adrenalineInfusion || false,
      dobutamine: intraop?.dobutamine || false,
      dopamine: intraop?.dopamine || false,
      noradrenaline: intraop?.noradrenaline || false,
      phenylephrine: intraop?.phenylephrine || false,
      insulinBolus: intraop?.insulinBolus || false,
      insulinInfusion: intraop?.insulinInfusion || false,
      furosemide: intraop?.furosemide || false,
      tranexamicBolus: intraop?.tranexamicBolus || false,
      tranexamicInfusion: intraop?.tranexamicInfusion || false,
      calciumGluconBolus: intraop?.calciumGluconBolus || false,
      calciumGluconInfusion: intraop?.calciumGluconInfusion || false,
      sodiumBicarb: intraop?.sodiumBicarb || false,
      antibiotics: intraop?.antibiotics || false,
    });
  };

  // Eliminar registro
  const handleDelete = async (record) => {
    if (!window.confirm('¿Eliminar este registro completo?')) return;

    try {
      const promises = [];
      if (record.intraop) {
        promises.push(intraopApi.delete(record.intraop.id));
      }
      if (record.fluids) {
        promises.push(fluidsApi.delete(record.fluids.id));
      }

      await Promise.all(promises);
      await fetchRecords();
    } catch (error) {
      alert('Error al eliminar registro: ' + error.message);
    }
  };

  if (loading && records.length === 0) {
    return (
      <div className="py-8 text-center">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          {records.length} registro{records.length !== 1 ? 's' : ''}
        </div>

        {canEdit && (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleNewRecord}
              disabled={showForm || showLabForm || showEteForm || showRotemForm}
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              + Nuevo Registro
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleNewLab}
              disabled={showForm || showLabForm || showEteForm || showRotemForm}
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              + Laboratorio
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleNewEte}
              disabled={showForm || showLabForm || showEteForm || showRotemForm}
            >
              🫀 + ETE
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleNewRotem}
              disabled={showForm || showLabForm || showEteForm || showRotemForm}
            >
              🩸 + ROTEM
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowOcrModal(true)}
              disabled={showForm || showLabForm || showEteForm || showRotemForm}
              title="Extraer datos de imagen (OCR)"
            >
              📷 OCR
            </Button>
          </div>
        )}
      </div>

      {/* Formulario de nuevo/editar registro */}
      {showForm && (
        <div className="bg-dark-700 rounded-lg border border-dark-400 p-4">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">
            {editingRecord ? 'Editar Registro' : 'Nuevo Registro Completo'}
          </h3>
          <IntegratedForm
            register={register}
            watch={watch}
            onSubmit={handleSubmit(onSubmit)}
            onCancel={handleCancel}
            isFirstRecord={!editingRecord && records.filter(r => r.intraop).length === 0}
            lastFluidsRecord={lastFluidsRecord}
            allRecords={records}
          />
        </div>
      )}

      {/* Formulario de laboratorio */}
      {showLabForm && (
        <div className="bg-dark-700 rounded-lg border border-green-600 p-4">
          <h3 className="text-lg font-semibold text-green-400 mb-4">🧪 Registro de Laboratorio</h3>
          <LabForm
            register={registerLab}
            onSubmit={handleSubmitLab(onSubmitLab)}
            onCancel={handleCancelLab}
            calculatedPaFI={calculatedPaFI}
            lastFiO2={lastVentilationParams?.fio2}
          />
        </div>
      )}

      {showEteForm && (
        <div className="bg-dark-700 rounded-lg border border-red-600 p-4">
          <h3 className="text-lg font-semibold text-red-400 mb-4">🫀 Registro de ETE</h3>
          <EteForm
            register={registerLab}
            onSubmit={handleSubmitLab(onSubmitEte)}
            onCancel={handleCancelEte}
          />
        </div>
      )}

      {showRotemForm && (
        <div className="bg-dark-700 rounded-lg border border-purple-600 p-4">
          <h3 className="text-lg font-semibold text-purple-400 mb-4">🩸 Registro de ROTEM</h3>
          <RotemForm
            register={registerLab}
            onSubmit={handleSubmitLab(onSubmitRotem)}
            onCancel={handleCancelRotem}
          />
        </div>
      )}

      {/* Lista de registros */}
      <div className="space-y-3">
        {records.map((record) => (
          <RecordCard
            key={new Date(record.timestamp).getTime()}
            record={record}
            allRecords={records}
            isExpanded={expandedRecords[record.timestamp]}
            onToggle={() => toggleRecord(record.timestamp)}
            onEdit={handleEdit}
            onDelete={() => handleDelete(record)}
            canEdit={canEdit}
          />
        ))}

        {records.length === 0 && !showForm && (
          <div className="py-12 text-center text-gray-500">
            No hay registros. Haz clic en "+ Nuevo Registro" para comenzar.
          </div>
        )}
      </div>

      {/* Modal de Asistencia ROTEM */}
      <RotemAssistanceModal
        isOpen={showRotemAssistance}
        onClose={() => setShowRotemAssistance(false)}
        rotemData={lastRotemData}
        phase={phase}
        caseId={caseId}
        patientWeight={patientWeight}
        lastLabValues={lastLabValues}
      />

      {/* Modal de Extracción OCR */}
      <OcrExtractionModal
        isOpen={showOcrModal}
        onClose={() => setShowOcrModal(false)}
        onApplyValues={async (values) => {
          // Crear nuevo registro con los valores extraídos
          try {
            const now = new Date();
            const dataToSave = {
              caseId,
              phase,
              timestamp: now.toISOString(),
              ...values,
            };

            await intraopApi.create(dataToSave);
            await fetchRecords();

            // Si hay valores ROTEM, preparar para el modal de asistencia
            const hasRotemValues = Object.keys(values).some(k => k.startsWith('rotem'));
            if (hasRotemValues) {
              const rotemData = Object.fromEntries(
                Object.entries(values).filter(([k]) => k.startsWith('rotem'))
              );
              setLastRotemData(rotemData);
              setShowRotemAssistance(true);
            }

            // Si hay valores de laboratorio, actualizar lastLabValues
            if (values.pH || values.ionicCalcium || values.hb || values.temp) {
              setLastLabValues({
                pH: values.pH,
                ionicCalcium: values.ionicCalcium,
                hb: values.hb,
                temp: values.temp,
              });
            }

            if (onDataChange) onDataChange();
          } catch (error) {
            console.error('Error al guardar datos OCR:', error);
            alert('Error al guardar: ' + error.message);
          }
        }}
      />
    </div>
  );
}

/**
 * Formulario integrado con acordeón
 */
function IntegratedForm({ register, watch, onSubmit, onCancel, isFirstRecord, lastFluidsRecord, allRecords }) {
  const [expandedSections, setExpandedSections] = useState({
    vitals: true,
    fluids: false,
    losses: false,
    drugs: false,
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Timestamp */}
      <div className="pb-4 border-b border-dark-600">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Hora de registro <span className="text-red-400">*</span>
        </label>
        <input
          type="datetime-local"
          {...register('timestamp', { required: true })}
          className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg focus:ring-2 focus:ring-surgical-500"
        />
      </div>

      {/* Sección: Parámetros Vitales */}
      <AccordionSection
        title="📊 Parámetros Vitales"
        isExpanded={expandedSections.vitals}
        onToggle={() => toggleSection('vitals')}
      >
        <VitalsSection register={register} watch={watch} isFirstRecord={isFirstRecord} />
      </AccordionSection>

      {/* Sección: Fluidos & Reposición */}
      <AccordionSection
        title="💧 Fluidos & Reposición"
        isExpanded={expandedSections.fluids}
        onToggle={() => toggleSection('fluids')}
      >
        <FluidsSection register={register} lastFluidsRecord={lastFluidsRecord} allRecords={allRecords} />
      </AccordionSection>

      {/* Sección: Pérdidas */}
      <AccordionSection
        title="🩸 Pérdidas"
        isExpanded={expandedSections.losses}
        onToggle={() => toggleSection('losses')}
      >
        <LossesSection register={register} lastFluidsRecord={lastFluidsRecord} allRecords={allRecords} />
      </AccordionSection>

      {/* Sección: Fármacos */}
      <AccordionSection
        title="💊 Fármacos"
        isExpanded={expandedSections.drugs}
        onToggle={() => toggleSection('drugs')}
      >
        <DrugsSection register={register} />
      </AccordionSection>

      {/* Botones de acción */}
      <div className="flex gap-2 pt-4 border-t border-dark-600">
        <Button type="submit" className="flex-1">
          Guardar Registro Completo
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

/**
 * Sección de acordeón reutilizable
 */
function AccordionSection({ title, isExpanded, onToggle, children }) {
  return (
    <div className="border border-dark-600 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 bg-dark-800 hover:bg-dark-700 flex items-center justify-between text-left transition-colors"
      >
        <span className="font-medium text-gray-200">{title}</span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-4 bg-dark-750">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Sección de parámetros vitales (con subsecciones)
 */
function VitalsSection({ register, watch, isFirstRecord }) {
  const [activeTab, setActiveTab] = useState('basic');

  const tabs = [
    { id: 'basic', label: '🩺 Básico' },
    { id: 'ventilation', label: '🫁 Ventilación' },
    { id: 'hemodynamics', label: '💉 Hemodinamia Invasiva' },
    { id: 'monitoring', label: '📊 Otros Monitoreo' },
  ];

  return (
    <div className="space-y-4">
      {isFirstRecord && (
        <div className="bg-yellow-900 bg-opacity-20 border border-yellow-600 rounded-lg p-3">
          <p className="text-sm text-yellow-400">
            ⚠️ <strong>Primer registro de la fase:</strong> Los parámetros de ventilación son obligatorios.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-600 pb-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-xs rounded-t whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-surgical-900 text-surgical-300 font-medium'
                : 'text-gray-400 hover:text-gray-300 hover:bg-dark-700'
            }`}
          >
            {tab.label}
            {tab.id === 'ventilation' && isFirstRecord && (
              <span className="ml-1 text-red-400">*</span>
            )}
          </button>
        ))}
      </div>

      {/* Contenido de tabs */}
      <div className="min-h-[200px]">
        {activeTab === 'basic' && <BasicVitalsFields register={register} />}
        {activeTab === 'ventilation' && <VentilationFields register={register} isFirstRecord={isFirstRecord} />}
        {activeTab === 'hemodynamics' && <HemodynamicsFields register={register} />}
        {activeTab === 'monitoring' && <MonitoringFields register={register} />}
      </div>
    </div>
  );
}

/**
 * Campos básicos de hemodinamia
 */
function BasicVitalsFields({ register }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <FormField label="FC (lpm)">
        <input type="number" {...register('heartRate')} className="form-input" placeholder="60-100" />
      </FormField>
      <FormField label="PAS (mmHg)">
        <input type="number" {...register('pas')} className="form-input" placeholder="90-140" />
      </FormField>
      <FormField label="PAD (mmHg)">
        <input type="number" {...register('pad')} className="form-input" placeholder="60-90" />
      </FormField>
      <FormField label="PAm (mmHg)" tooltip="Calculado automáticamente">
        <input type="number" {...register('pam')} className="form-input bg-dark-800" placeholder="Auto" readOnly />
      </FormField>
      <FormField label="SatO₂ (%)">
        <input type="number" {...register('satO2')} className="form-input" placeholder="95-100" />
      </FormField>
      <FormField label="PVC (cmH₂O)">
        <input type="number" {...register('cvp')} className="form-input" placeholder="5-12" />
      </FormField>
      <FormField label="Temp (°C)">
        <input type="number" step="0.1" {...register('temp')} className="form-input" placeholder="36-37" />
      </FormField>
      <FormField label="EtCO₂ (mmHg)">
        <input type="number" {...register('etCO2')} className="form-input" placeholder="35-45" />
      </FormField>
    </div>
  );
}

/**
 * Campos de ventilación
 */
function VentilationFields({ register, isFirstRecord }) {
  return (
    <div className="space-y-4">
      {isFirstRecord && (
        <div className="text-xs text-yellow-400">
          <strong>Nota:</strong> Estos valores se auto-duplicarán para los siguientes registros de esta fase, pero podrás modificarlos según sea necesario.
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <FormField label="Modo ventilatorio" required={isFirstRecord}>
          <select {...register('ventMode')} className="form-input">
            <option value="">Seleccionar...</option>
            <option value="ESPONTANEA">Ventilación espontánea</option>
            <option value="VC">VC (Volumen controlado)</option>
            <option value="PC">PC (Presión controlada)</option>
            <option value="SIMV">SIMV</option>
            <option value="PSV">PSV (Presión soporte)</option>
            <option value="CPAP">CPAP</option>
            <option value="OTRO">Otro</option>
          </select>
        </FormField>
        <FormField label="FiO₂ (%)" required={isFirstRecord}>
          <input type="number" {...register('fio2')} className="form-input" placeholder="21-100" />
        </FormField>
        <FormField label="Vt (ml)">
          <input type="number" {...register('tidalVolume')} className="form-input" placeholder="400-600" />
        </FormField>
        <FormField label="FR (rpm)">
          <input type="number" {...register('respRate')} className="form-input" placeholder="12-20" />
        </FormField>
        <FormField label="PEEP (cmH₂O)">
          <input type="number" {...register('peep')} className="form-input" placeholder="5-10" />
        </FormField>
        <FormField label="PVA (cmH₂O)">
          <input type="number" {...register('peakPressure')} className="form-input" placeholder="20-30" />
        </FormField>
      </div>
    </div>
  );
}

/**
 * Campos de hemodinamia avanzada
 */
function HemodynamicsFields({ register }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <FormField label="PAPS (mmHg)">
        <input type="number" {...register('paps')} className="form-input" placeholder="15-30" />
      </FormField>
      <FormField label="PAPD (mmHg)">
        <input type="number" {...register('papd')} className="form-input" placeholder="5-15" />
      </FormField>
      <FormField label="PAPm (mmHg)" tooltip="Calculado automáticamente">
        <input type="number" {...register('papm')} className="form-input bg-dark-800" placeholder="Auto" readOnly />
      </FormField>
      <FormField label="PCP (mmHg)">
        <input type="number" {...register('pcwp')} className="form-input" placeholder="6-12" />
      </FormField>
      <FormField label="GC (L/min)">
        <input type="number" step="0.1" {...register('cardiacOutput')} className="form-input" placeholder="4-8" />
      </FormField>
    </div>
  );
}

/**
 * Campos de monitoreo avanzado
 */
function MonitoringFields({ register }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <FormField label="BIS">
        <input type="number" {...register('bis')} className="form-input" placeholder="40-60" />
      </FormField>
      <FormField label="PIC (mmHg)">
        <input type="number" {...register('icp')} className="form-input" placeholder="0-20" />
      </FormField>
      <FormField label="SvO₂ (%)">
        <input type="number" {...register('svO2')} className="form-input" placeholder="60-80" />
      </FormField>
    </div>
  );
}

/**
 * Formulario separado para ETE (Ecocardiograma Transesofágico)
 */
function EteForm({ register, onSubmit, onCancel }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Timestamp */}
      <div className="pb-4 border-b border-dark-600">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Hora del ETE <span className="text-red-400">*</span>
        </label>
        <input
          type="datetime-local"
          {...register('timestamp', { required: true })}
          className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg focus:ring-2 focus:ring-red-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          El ETE se registra con su propio timestamp, independiente de los signos vitales.
        </p>
      </div>

      {/* Campos de ETE */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Función VD">
            <select {...register('eteRightVentricle')} className="form-input">
              <option value="">Seleccionar...</option>
              <option value="Normal">Normal</option>
              <option value="Hipocinética">Hipocinética</option>
              <option value="Severamente disfuncionante">Severamente disfuncionante</option>
            </select>
          </FormField>
          <FormField label="TAPSE">
            <select {...register('eteTapse')} className="form-input">
              <option value="">Seleccionar...</option>
              <option value="<16mm">&lt;16mm (Disfunción)</option>
              <option value="16-20mm">16-20mm (Normal)</option>
              <option value=">20mm">&gt;20mm (Excelente)</option>
            </select>
          </FormField>
          <FormField label="Función VI / FEVI">
            <select {...register('eteLeftVentricle')} className="form-input">
              <option value="">Seleccionar...</option>
              <option value="Conservada">Conservada (&gt;50%)</option>
              <option value="Moderadamente reducida">Moderadamente reducida (30-50%)</option>
              <option value="Severamente reducida">Severamente reducida (&lt;30%)</option>
            </select>
          </FormField>
          <FormField label="Dilatación de cavidades">
            <select {...register('eteChamberDilation')} className="form-input">
              <option value="">Seleccionar...</option>
              <option value="Normales">Cavidades normales</option>
              <option value="AI">AI dilatada</option>
              <option value="VI">VI dilatada</option>
              <option value="VD">VD dilatada</option>
              <option value="AI+VI">AI + VI dilatadas</option>
              <option value="AI+VD">AI + VD dilatadas</option>
              <option value="VI+VD">VI + VD dilatadas</option>
              <option value="AI+VI+VD">AI + VI + VD dilatadas</option>
            </select>
          </FormField>
          <FormField label="PSAP estimada">
            <select {...register('etePsap')} className="form-input">
              <option value="">Seleccionar...</option>
              <option value="<40mmHg">&lt;40mmHg (Normal)</option>
              <option value="40-60mmHg">40-60mmHg (HTP moderada)</option>
              <option value=">60mmHg">&gt;60mmHg (HTP severa)</option>
            </select>
          </FormField>
          <FormField label="Trombos intracavitarios">
            <select {...register('eteThrombus')} className="form-input">
              <option value="">Seleccionar...</option>
              <option value="No">No se visualizan</option>
              <option value="Sí">Sí se visualizan</option>
            </select>
          </FormField>
          <FormField label="Derrame pericárdico" className="md:col-span-2">
            <select {...register('etePericardial')} className="form-input">
              <option value="">Seleccionar...</option>
              <option value="Sin derrame">Sin derrame</option>
              <option value="Leve">Derrame leve</option>
              <option value="Moderado">Derrame moderado</option>
              <option value="Severo">Derrame severo</option>
            </select>
          </FormField>
          <FormField label="Evaluación cualitativa de cavidades" className="md:col-span-2">
            <select {...register('eteVolumeStatus')} className="form-input">
              <option value="">Seleccionar...</option>
              <option value="Hipovolemia grave">Hipovolemia grave (cavidades colapsadas, hipercontractilidad, septo en "beso")</option>
              <option value="Hipovolemia leve-moderada">Hipovolemia leve-moderada</option>
              <option value="Hipervolemia">Hipervolemia (dilatación cavidades derechas, compresión VI)</option>
            </select>
          </FormField>
        </div>

        {/* Observaciones */}
        <FormField label="Observaciones" className="col-span-full">
          <textarea
            {...register('eteObservations')}
            className="form-input min-h-[80px] resize-y"
            placeholder="Observaciones adicionales del ETE..."
            rows={3}
          />
        </FormField>
      </div>

      {/* Botones */}
      <div className="flex gap-2 justify-end pt-4 border-t border-dark-600">
        <Button type="submit" variant="primary">
          Guardar ETE
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

/**
 * Formulario separado para ROTEM
 */
function RotemForm({ register, onSubmit, onCancel }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Timestamp */}
      <div className="pb-4 border-b border-dark-600">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Hora del ROTEM <span className="text-red-400">*</span>
        </label>
        <input
          type="datetime-local"
          {...register('timestamp', { required: true })}
          className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg focus:ring-2 focus:ring-purple-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          El ROTEM se registra con su propio timestamp. Al guardar se mostrará el asistente de decisión terapéutica.
        </p>
      </div>

      {/* Nota informativa */}
      <div className="bg-purple-900 bg-opacity-20 border border-purple-600 rounded-lg p-3">
        <p className="text-xs text-purple-300">
          💡 Ingrese al menos A5 EXTEM y A5 FIBTEM para obtener recomendaciones. Los datos de CLI30/CLI60 permiten evaluar fibrinólisis.
        </p>
      </div>

      {/* EXTEM */}
      <div className="border border-blue-700 rounded-lg p-3">
        <h4 className="text-sm font-semibold text-blue-400 mb-3">EXTEM - Vía Extrínseca</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <FormField label="CT (seg)" tooltip="Tiempo de coagulación">
            <input type="number" {...register('rotemCtExtem')} className="form-input" placeholder="38-79" />
          </FormField>
          <FormField label="CFT (seg)" tooltip="Tiempo formación coágulo">
            <input type="number" {...register('rotemCftExtem')} className="form-input" placeholder="35-159" />
          </FormField>
          <FormField label="A5 (mm)" tooltip="Amplitud a 5 min - DECISIÓN TEMPRANA">
            <input type="number" {...register('rotemA5Extem')} className="form-input font-bold border-blue-500" placeholder="35-65" />
          </FormField>
          <FormField label="A10 (mm)" tooltip="Amplitud a 10 min">
            <input type="number" {...register('rotemA10Extem')} className="form-input" placeholder="43-68" />
          </FormField>
          <FormField label="MCF (mm)" tooltip="Firmeza máxima">
            <input type="number" {...register('rotemMcfExtem')} className="form-input" placeholder="50-72" />
          </FormField>
          <FormField label="CLI30 (%)" tooltip="Índice lisis 30 min">
            <input type="number" {...register('rotemCli30')} className="form-input" placeholder="85-100" />
          </FormField>
          <FormField label="CLI60 (%)" tooltip="Índice lisis 60 min">
            <input type="number" {...register('rotemCli60')} className="form-input" placeholder="85-100" />
          </FormField>
          <FormField label="ML (%)" tooltip="Lisis máxima">
            <input type="number" {...register('rotemMl')} className="form-input" placeholder="<15" />
          </FormField>
        </div>
      </div>

      {/* FIBTEM */}
      <div className="border border-green-700 rounded-lg p-3">
        <h4 className="text-sm font-semibold text-green-400 mb-3">FIBTEM - Fibrinógeno</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <FormField label="CT (seg)">
            <input type="number" {...register('rotemCtFibtem')} className="form-input" placeholder="38-62" />
          </FormField>
          <FormField label="A5 (mm)" tooltip="DECISIÓN TEMPRANA FIBRINÓGENO">
            <input type="number" {...register('rotemA5Fibtem')} className="form-input font-bold border-green-500" placeholder="7-23" />
          </FormField>
          <FormField label="A10 (mm)">
            <input type="number" {...register('rotemA10Fibtem')} className="form-input" placeholder="8-24" />
          </FormField>
          <FormField label="MCF (mm)">
            <input type="number" {...register('rotemMcfFibtem')} className="form-input" placeholder="9-25" />
          </FormField>
        </div>
      </div>

      {/* INTEM/HEPTEM */}
      <div className="border border-orange-700 rounded-lg p-3">
        <h4 className="text-sm font-semibold text-orange-400 mb-3">INTEM/HEPTEM - Vía Intrínseca y Heparina</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <FormField label="CT INTEM (seg)" tooltip="Vía intrínseca">
            <input type="number" {...register('rotemCtIntem')} className="form-input" placeholder="100-240" />
          </FormField>
          <FormField label="CT HEPTEM (seg)" tooltip="Neutraliza heparina">
            <input type="number" {...register('rotemCtHeptem')} className="form-input" placeholder="38-79" />
          </FormField>
          <div className="col-span-2 text-xs text-gray-500">
            Si CT INTEM &gt; 240s y CT HEPTEM normal: efecto heparínico. Si ambos prolongados: déficit de factores.
          </div>
        </div>
      </div>

      {/* APTEM (opcional) */}
      <div className="border border-gray-600 rounded-lg p-3">
        <h4 className="text-sm font-semibold text-gray-400 mb-3">APTEM - Antifibrinolítico (opcional)</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <FormField label="A5 APTEM (mm)" tooltip="Usar si hay hiperfibrinólisis">
            <input type="number" {...register('rotemA5Aptem')} className="form-input" placeholder="Evalúa firmeza sin lisis" />
          </FormField>
          <div className="col-span-3 text-xs text-gray-500">
            Usar A5 APTEM en lugar de A5 FIBTEM si hay hiperfibrinólisis activa para evaluar fibrinógeno real.
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-2 justify-end pt-4 border-t border-dark-600">
        <Button type="submit" variant="primary">
          Guardar y Ver Recomendaciones
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

/**
 * Formulario separado para laboratorio
 */
function LabForm({ register, onSubmit, onCancel, calculatedPaFI, lastFiO2 }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Timestamp */}
      <div className="pb-4 border-b border-dark-600">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Hora de la muestra <span className="text-red-400">*</span>
        </label>
        <input
          type="datetime-local"
          {...register('timestamp', { required: true })}
          className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg focus:ring-2 focus:ring-surgical-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Los exámenes de laboratorio se registran con su propio timestamp, independiente de los signos vitales.
        </p>
      </div>

      {/* Hematología */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-3">Hematología</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <FormField label="Hb (g/dL)">
            <input type="number" step="0.1" {...register('hb')} className="form-input" placeholder="10-15" />
          </FormField>
          <FormField label="Hto (%)">
            <input type="number" {...register('hto')} className="form-input" placeholder="30-45" />
          </FormField>
          <FormField label="Plaquetas (10³/µL)">
            <input type="number" {...register('platelets')} className="form-input" placeholder="150-400" />
          </FormField>
        </div>
      </div>

      {/* Coagulación */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-3">Coagulación</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FormField label="TP (seg)">
            <input type="number" step="0.1" {...register('pt')} className="form-input" placeholder="11-13.5" />
          </FormField>
          <FormField label="INR">
            <input type="number" step="0.01" {...register('inr')} className="form-input" placeholder="0.8-1.2" />
          </FormField>
          <FormField label="Fibrinógeno (mg/dL)">
            <input type="number" {...register('fibrinogen')} className="form-input" placeholder="200-400" />
          </FormField>
          <FormField label="APTT (seg)">
            <input type="number" step="0.1" {...register('aptt')} className="form-input" placeholder="25-35" />
          </FormField>
        </div>
      </div>

      {/* Electrolitos */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-3">Electrolitos</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <FormField label="Na⁺ (mEq/L)">
            <input type="number" {...register('sodium')} className="form-input" placeholder="135-145" />
          </FormField>
          <FormField label="K⁺ (mEq/L)">
            <input type="number" step="0.1" {...register('potassium')} className="form-input" placeholder="3.5-5.0" />
          </FormField>
          <FormField label="Cl⁻ (mEq/L)">
            <input type="number" {...register('chloride')} className="form-input" placeholder="96-106" />
          </FormField>
          <FormField label="Ca²⁺ (mmol/L)">
            <input type="number" step="0.01" {...register('ionicCalcium')} className="form-input" placeholder="1.1-1.3" />
          </FormField>
          <FormField label="Mg (mEq/L)">
            <input type="number" step="0.1" {...register('magnesium')} className="form-input" placeholder="1.5-2.5" />
          </FormField>
          <FormField label="P (mg/dL)">
            <input type="number" step="0.1" {...register('phosphorus')} className="form-input" placeholder="2.5-4.5" />
          </FormField>
        </div>
      </div>

      {/* Gases arteriales */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-3">Gasometría arterial</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <FormField label="pH">
            <input type="number" step="0.01" {...register('pH')} className="form-input" placeholder="7.35-7.45" />
          </FormField>
          <FormField label="PaO₂ (mmHg)">
            <input type="number" {...register('paO2')} className="form-input" placeholder="80-100" />
          </FormField>
          <FormField label={`PaFI (PaO₂/FiO₂)${lastFiO2 ? ` - FiO₂: ${lastFiO2}%` : ''}`}>
            <div className={`form-input bg-gray-700/50 flex items-center ${
              calculatedPaFI !== null
                ? calculatedPaFI < 200
                  ? 'text-red-400 border-red-500'
                  : calculatedPaFI < 300
                    ? 'text-yellow-400 border-yellow-500'
                    : 'text-green-400 border-green-500'
                : 'text-gray-500'
            }`}>
              {calculatedPaFI !== null ? (
                <>
                  <span className="font-bold">{calculatedPaFI}</span>
                  <span className="ml-2 text-xs">
                    {calculatedPaFI < 100 ? '(SDRA severo)' :
                     calculatedPaFI < 200 ? '(SDRA moderado)' :
                     calculatedPaFI < 300 ? '(SDRA leve)' : '(Normal)'}
                  </span>
                </>
              ) : (
                <span className="text-xs">{lastFiO2 ? 'Ingresa PaO₂' : 'Registra FiO₂ en ventilación primero'}</span>
              )}
            </div>
          </FormField>
          <FormField label="PaCO₂ (mmHg)">
            <input type="number" {...register('paCO2')} className="form-input" placeholder="35-45" />
          </FormField>
          <FormField label="HCO₃⁻ (mEq/L)">
            <input type="number" step="0.1" {...register('hco3')} className="form-input" placeholder="22-26" />
          </FormField>
          <FormField label="BE (mEq/L)">
            <input type="number" step="0.1" {...register('baseExcess')} className="form-input" placeholder="-2 a +2" />
          </FormField>
        </div>
      </div>

      {/* Gases venosos */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-3">Gasometría venosa</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <FormField label="pH venoso">
            <input type="number" step="0.01" {...register('pvpH')} className="form-input" placeholder="7.30-7.40" />
          </FormField>
          <FormField label="PvO₂ (mmHg)">
            <input type="number" {...register('pvO2')} className="form-input" placeholder="35-45" />
          </FormField>
          <FormField label="PvCO₂ (mmHg)">
            <input type="number" {...register('pvCO2')} className="form-input" placeholder="40-50" />
          </FormField>
        </div>
      </div>

      {/* Función Renal */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-3">Función Renal</h4>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Azotemia/BUN (mg/dL)">
            <input type="number" step="0.1" {...register('azotemia')} className="form-input" placeholder="8-20" />
          </FormField>
          <FormField label="Creatinina (mg/dL)">
            <input type="number" step="0.1" {...register('creatinine')} className="form-input" placeholder="0.6-1.2" />
          </FormField>
        </div>
      </div>

      {/* Función Hepática */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-3">Función Hepática</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <FormField label="TGO/AST (U/L)">
            <input type="number" {...register('sgot')} className="form-input" placeholder="10-40" />
          </FormField>
          <FormField label="TGP/ALT (U/L)">
            <input type="number" {...register('sgpt')} className="form-input" placeholder="7-56" />
          </FormField>
          <FormField label="Bilirrubina total (mg/dL)">
            <input type="number" step="0.1" {...register('totalBili')} className="form-input" placeholder="0.3-1.2" />
          </FormField>
          <FormField label="Bilirrubina directa (mg/dL)">
            <input type="number" step="0.1" {...register('directBili')} className="form-input" placeholder="0-0.3" />
          </FormField>
          <FormField label="Albúmina (g/dL)">
            <input type="number" step="0.1" {...register('albumin')} className="form-input" placeholder="3.5-5.0" />
          </FormField>
        </div>
      </div>

      {/* Metabólicos */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-3">Parámetros metabólicos</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <FormField label="Glicemia (mg/dL)">
            <input type="number" {...register('glucose')} className="form-input" placeholder="70-110" />
          </FormField>
          <FormField label="Lactato (mmol/L)">
            <input type="number" step="0.1" {...register('lactate')} className="form-input" placeholder="0.5-2.0" />
          </FormField>
          <FormField label="Proteínas totales (g/dL)">
            <input type="number" step="0.1" {...register('proteins')} className="form-input" placeholder="6.0-8.0" />
          </FormField>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-2 pt-4 border-t border-dark-600">
        <Button type="submit" className="flex-1">
          Guardar Laboratorio
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

/**
 * Sección de fluidos y reposición
 */
function FluidsSection({ register, lastFluidsRecord, allRecords = [] }) {
  const hasLastRecord = lastFluidsRecord !== null;

  // Filtrar solo registros con fluidos
  const previousFluids = allRecords
    .filter(r => r.fluids)
    .map(r => ({
      timestamp: r.timestamp,
      ...r.fluids
    }))
    .slice(-5); // Mostrar solo los últimos 5 registros

  return (
    <div className="space-y-6">
      {/* Advertencia de valores acumulativos */}
      <div className="bg-blue-900 bg-opacity-20 border border-blue-600 rounded-lg p-3">
        <p className="text-sm text-blue-400">
          💡 <strong>Valores acumulativos:</strong> Los valores mostrados incluyen el total acumulado del último registro. Actualiza los valores con el nuevo total (no agregues incrementos).
        </p>
        {hasLastRecord && (
          <p className="text-xs text-blue-300 mt-2">
            📋 Último registro con timestamp: {new Date(lastFluidsRecord.timestamp).toLocaleString('es-UY')}
          </p>
        )}
      </div>

      {/* Historial de registros previos */}
      {previousFluids.length > 0 && (
        <div className="bg-dark-800 rounded-lg p-3 border border-blue-700">
          <h5 className="text-xs font-semibold text-blue-300 mb-2">📊 Registros Previos (Referencia)</h5>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-dark-600">
                  <th className="text-left py-1 px-2">Hora</th>
                  <th className="text-right py-1 px-2">Plasma.</th>
                  <th className="text-right py-1 px-2">Ringer</th>
                  <th className="text-right py-1 px-2">Salino</th>
                  <th className="text-right py-1 px-2">GR (u)</th>
                  <th className="text-right py-1 px-2">Plasma (u)</th>
                  <th className="text-right py-1 px-2">Plaquet. (u)</th>
                  <th className="text-right py-1 px-2">Cell Sav.</th>
                </tr>
              </thead>
              <tbody>
                {previousFluids.map((fluid, idx) => (
                  <tr key={idx} className="border-b border-dark-700 hover:bg-dark-750">
                    <td className="py-1 px-2 text-blue-400 font-mono">
                      {new Date(fluid.timestamp).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="text-right py-1 px-2 text-gray-300">{fluid.plasmalyte || '-'}</td>
                    <td className="text-right py-1 px-2 text-gray-300">{fluid.ringer || '-'}</td>
                    <td className="text-right py-1 px-2 text-gray-300">{fluid.saline || '-'}</td>
                    <td className="text-right py-1 px-2 text-gray-300">{fluid.redBloodCells || '-'}</td>
                    <td className="text-right py-1 px-2 text-gray-300">{fluid.plasma || '-'}</td>
                    <td className="text-right py-1 px-2 text-gray-300">{fluid.platelets || '-'}</td>
                    <td className="text-right py-1 px-2 text-gray-300">{fluid.cellSaver || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cristaloides */}
      <div>
        <h4 className="text-sm font-semibold text-blue-400 mb-3">Cristaloides (ml)</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <FluidInput label="Plasmalyte" name="plasmalyte" register={register} />
          <FluidInput label="Ringer" name="ringer" register={register} />
          <FluidInput label="Salino" name="saline" register={register} />
          <FluidInput label="Dextrosa" name="dextrose" register={register} />
        </div>
      </div>

      {/* Coloides */}
      <div>
        <h4 className="text-sm font-semibold text-blue-400 mb-3">Coloides (ml)</h4>
        <div className="grid grid-cols-2 gap-3">
          <FluidInput label="Coloides" name="colloids" register={register} />
          <FluidInput label="Albúmina" name="albumin" register={register} />
        </div>
      </div>

      {/* Hemoderivados */}
      <div>
        <h4 className="text-sm font-semibold text-red-400 mb-3">Hemoderivados</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <FluidInput label="GR (unidades)" name="redBloodCells" register={register} />
          <FluidInput label="Plasma (unidades)" name="plasma" register={register} />
          <FluidInput label="Plaquetas (unidades)" name="platelets" register={register} />
          <FluidInput label="Crioprecipitados (ml)" name="cryoprecip" register={register} />
          <FluidInput label="Cell Saver (ml)" name="cellSaver" register={register} />
          <FluidInput label="Fibrinógeno (gramos)" name="fibrinogen" register={register} />
          <FluidInput label="CCP (unidades)" name="pcc" register={register} />
          <FluidInput label="Factor VII (mg)" name="factorVII" register={register} />
        </div>
      </div>

      {/* Otros fluidos */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Otros fluidos (notas)</label>
        <textarea
          {...register('otherFluids')}
          className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg focus:ring-2 focus:ring-surgical-500"
          rows={2}
          placeholder="Ej: Solución de bicarbonato 100ml, etc."
        />
      </div>
    </div>
  );
}

/**
 * Sección de pérdidas
 */
function LossesSection({ register, lastFluidsRecord, allRecords = [] }) {
  const hasLastRecord = lastFluidsRecord !== null;

  // Filtrar solo registros con pérdidas
  const previousLosses = allRecords
    .filter(r => r.fluids)
    .map(r => ({
      timestamp: r.timestamp,
      insensibleLoss: r.fluids.insensibleLoss,
      ascites: r.fluids.ascites,
      suction: r.fluids.suction,
      gauze: r.fluids.gauze,
      urine: r.fluids.urine,
    }))
    .slice(-5); // Mostrar solo los últimos 5 registros

  return (
    <div className="space-y-4">
      {/* Advertencia de valores acumulativos */}
      <div className="bg-orange-900 bg-opacity-20 border border-orange-600 rounded-lg p-3">
        <p className="text-sm text-orange-400">
          💡 <strong>Valores acumulativos:</strong> Los valores mostrados incluyen el total acumulado del último registro. Actualiza los valores con el nuevo total (no agregues incrementos).
        </p>
        {hasLastRecord && (
          <p className="text-xs text-orange-300 mt-2">
            📋 Último registro con timestamp: {new Date(lastFluidsRecord.timestamp).toLocaleString('es-UY')}
          </p>
        )}
      </div>

      {/* Historial de registros previos */}
      {previousLosses.length > 0 && (
        <div className="bg-dark-800 rounded-lg p-3 border border-orange-700">
          <h5 className="text-xs font-semibold text-orange-300 mb-2">📊 Registros Previos (Referencia)</h5>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-dark-600">
                  <th className="text-left py-1 px-2">Hora</th>
                  <th className="text-right py-1 px-2">Insensible</th>
                  <th className="text-right py-1 px-2">Ascitis</th>
                  <th className="text-right py-1 px-2">Aspirador</th>
                  <th className="text-right py-1 px-2">Gasas</th>
                  <th className="text-right py-1 px-2">Diuresis</th>
                  <th className="text-right py-1 px-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {previousLosses.map((loss, idx) => {
                  const total = (loss.insensibleLoss || 0) + (loss.ascites || 0) + (loss.suction || 0) + (loss.gauze || 0) + (loss.urine || 0);
                  return (
                    <tr key={idx} className="border-b border-dark-700 hover:bg-dark-750">
                      <td className="py-1 px-2 text-orange-400 font-mono">
                        {new Date(loss.timestamp).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="text-right py-1 px-2 text-gray-300">{loss.insensibleLoss || '-'}</td>
                      <td className="text-right py-1 px-2 text-gray-300">{loss.ascites || '-'}</td>
                      <td className="text-right py-1 px-2 text-gray-300">{loss.suction || '-'}</td>
                      <td className="text-right py-1 px-2 text-gray-300">{loss.gauze || '-'}</td>
                      <td className="text-right py-1 px-2 text-gray-300">{loss.urine || '-'}</td>
                      <td className="text-right py-1 px-2 text-orange-300 font-semibold">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold text-orange-400 mb-3">Pérdidas (ml)</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <FluidInput label="Pérdida insensible" name="insensibleLoss" register={register} />
          <FluidInput label="Ascitis" name="ascites" register={register} />
          <FluidInput label="Aspirador" name="suction" register={register} />
          <FluidInput label="Gasas" name="gauze" register={register} />
          <FluidInput label="Diuresis" name="urine" register={register} />
        </div>
      </div>
    </div>
  );
}

/**
 * Sección de fármacos
 */
function DrugsSection({ register }) {
  return (
    <div className="space-y-6">
      {/* Información */}
      <div className="bg-purple-900 bg-opacity-20 border border-purple-600 rounded-lg p-3">
        <p className="text-sm text-purple-400">
          💡 <strong>Registro binario:</strong> Marca los fármacos administrados durante este período de tiempo. No se registran dosis.
        </p>
      </div>

      {/* Agente Inhalatorio */}
      <div>
        <h4 className="text-sm font-semibold text-purple-400 mb-3">Agente Inhalatorio</h4>
        <div className="max-w-xs">
          <select {...register('inhalAgent')} className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg focus:ring-2 focus:ring-purple-500">
            <option value="">Ninguno</option>
            <option value="Isoflurano">Isoflurano</option>
            <option value="Sevoflurano">Sevoflurano</option>
            <option value="Desflurano">Desflurano</option>
          </select>
        </div>
      </div>

      {/* Opiáceos */}
      <div>
        <h4 className="text-sm font-semibold text-purple-400 mb-3">Opiáceos</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <DrugCheckbox label="Opiáceo - Bolo" name="opioidBolus" register={register} />
          <DrugCheckbox label="Opiáceo - Infusión" name="opioidInfusion" register={register} />
        </div>
      </div>

      {/* Hipnóticos */}
      <div>
        <h4 className="text-sm font-semibold text-purple-400 mb-3">Hipnóticos</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <DrugCheckbox label="Hipnótico - Bolo" name="hypnoticBolus" register={register} />
          <DrugCheckbox label="Hipnótico - Infusión" name="hypnoticInfusion" register={register} />
        </div>
      </div>

      {/* Relajantes Musculares */}
      <div>
        <h4 className="text-sm font-semibold text-purple-400 mb-3">Relajantes Musculares</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <DrugCheckbox label="Relajante - Bolo" name="relaxantBolus" register={register} />
          <DrugCheckbox label="Relajante - Infusión" name="relaxantInfusion" register={register} />
        </div>
      </div>

      {/* Anestésicos Locales */}
      <div>
        <h4 className="text-sm font-semibold text-purple-400 mb-3">Anestésicos Locales</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <DrugCheckbox label="Lidocaína - Bolo" name="lidocaineBolus" register={register} />
          <DrugCheckbox label="Lidocaína - Infusión" name="lidocaineInfusion" register={register} />
        </div>
      </div>

      {/* Vasopresores e Inotrópicos */}
      <div>
        <h4 className="text-sm font-semibold text-purple-400 mb-3">Vasopresores e Inotrópicos</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <DrugCheckbox label="Adrenalina - Bolo" name="adrenalineBolus" register={register} />
          <DrugCheckbox label="Adrenalina - Infusión" name="adrenalineInfusion" register={register} />
          <DrugCheckbox label="Dobutamina" name="dobutamine" register={register} />
          <DrugCheckbox label="Dopamina" name="dopamine" register={register} />
          <DrugCheckbox label="Noradrenalina" name="noradrenaline" register={register} />
          <DrugCheckbox label="Fenilefrina" name="phenylephrine" register={register} />
        </div>
      </div>

      {/* Otros Fármacos */}
      <div>
        <h4 className="text-sm font-semibold text-purple-400 mb-3">Otros Fármacos</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <DrugCheckbox label="Insulina - Bolo" name="insulinBolus" register={register} />
          <DrugCheckbox label="Insulina - Infusión" name="insulinInfusion" register={register} />
          <DrugCheckbox label="Furosemida" name="furosemide" register={register} />
          <DrugCheckbox label="Ácido Tranexámico - Bolo" name="tranexamicBolus" register={register} />
          <DrugCheckbox label="Ácido Tranexámico - Infusión" name="tranexamicInfusion" register={register} />
          <DrugCheckbox label="Gluconato de Calcio - Bolo" name="calciumGluconBolus" register={register} />
          <DrugCheckbox label="Gluconato de Calcio - Infusión" name="calciumGluconInfusion" register={register} />
          <DrugCheckbox label="Bicarbonato de Sodio" name="sodiumBicarb" register={register} />
          <DrugCheckbox label="Antibióticos" name="antibiotics" register={register} />
        </div>
      </div>
    </div>
  );
}

/**
 * Checkbox de fármaco reutilizable
 */
function DrugCheckbox({ label, name, register }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input
        type="checkbox"
        {...register(name)}
        className="w-4 h-4 rounded border-dark-400 bg-dark-600 text-purple-500 focus:ring-2 focus:ring-purple-500 cursor-pointer"
      />
      <span className="text-sm text-gray-300 group-hover:text-gray-100 transition-colors">
        {label}
      </span>
    </label>
  );
}

/**
 * Tarjeta de registro en lista
 */
function RecordCard({ record, allRecords, isExpanded, onToggle, onDelete, onEdit, canEdit = true }) {
  const hasIntraop = !!record.intraop;
  const hasFluids = !!record.fluids;

  // Check if any drugs are selected in the intraop record
  const hasDrugs = record.intraop && (
    record.intraop.inhalAgent ||
    record.intraop.opioidBolus ||
    record.intraop.opioidInfusion ||
    record.intraop.hypnoticBolus ||
    record.intraop.hypnoticInfusion ||
    record.intraop.relaxantBolus ||
    record.intraop.relaxantInfusion ||
    record.intraop.lidocaineBolus ||
    record.intraop.lidocaineInfusion ||
    record.intraop.adrenalineBolus ||
    record.intraop.adrenalineInfusion ||
    record.intraop.dobutamine ||
    record.intraop.dopamine ||
    record.intraop.noradrenaline ||
    record.intraop.phenylephrine ||
    record.intraop.insulinBolus ||
    record.intraop.insulinInfusion ||
    record.intraop.furosemide ||
    record.intraop.tranexamicBolus ||
    record.intraop.tranexamicInfusion ||
    record.intraop.calciumGluconBolus ||
    record.intraop.calciumGluconInfusion ||
    record.intraop.sodiumBicarb ||
    record.intraop.antibiotics
  );

  // Check if any lab values are present
  const hasLab = record.intraop && (
    record.intraop.hb ||
    record.intraop.hto ||
    record.intraop.platelets ||
    record.intraop.pt ||
    record.intraop.inr ||
    record.intraop.fibrinogen ||
    record.intraop.aptt ||
    record.intraop.sodium ||
    record.intraop.potassium ||
    record.intraop.ionicCalcium ||
    record.intraop.magnesium ||
    record.intraop.chloride ||
    record.intraop.phosphorus ||
    record.intraop.pH ||
    record.intraop.paO2 ||
    record.intraop.paCO2 ||
    record.intraop.hco3 ||
    record.intraop.baseExcess ||
    record.intraop.pvpH ||
    record.intraop.pvO2 ||
    record.intraop.pvCO2 ||
    record.intraop.glucose ||
    record.intraop.lactate ||
    record.intraop.creatinine ||
    record.intraop.azotemia ||
    record.intraop.sgot ||
    record.intraop.sgpt ||
    record.intraop.totalBili ||
    record.intraop.directBili ||
    record.intraop.albumin ||
    record.intraop.proteins
  );

  // Check if any ventilation parameters are present
  const hasVentilation = record.intraop && (
    record.intraop.ventMode ||
    record.intraop.fio2 ||
    record.intraop.tidalVolume ||
    record.intraop.respRate ||
    record.intraop.peep ||
    record.intraop.peakPressure
  );

  // Check if any blood products are present
  const hasBloodProducts = record.fluids && (
    record.fluids.redBloodCells ||
    record.fluids.plasma ||
    record.fluids.platelets ||
    record.fluids.cryoprecip ||
    record.fluids.cellSaver ||
    record.fluids.fibrinogen ||
    record.fluids.pcc ||
    record.fluids.factorVII
  );

  // Check if any advanced monitoring is present
  const hasMonitoring = record.intraop && (
    record.intraop.bis ||
    record.intraop.icp ||
    record.intraop.svO2 ||
    record.intraop.paps ||
    record.intraop.papd ||
    record.intraop.papm ||
    record.intraop.pcwp ||
    record.intraop.cardiacOutput
  );

  // Check if any ROTEM values are present
  const hasRotem = record.intraop && (
    record.intraop.rotemCtExtem ||
    record.intraop.rotemCftExtem ||
    record.intraop.rotemA5Extem ||
    record.intraop.rotemA10Extem ||
    record.intraop.rotemMcfExtem ||
    record.intraop.rotemCli30 ||
    record.intraop.rotemCli60 ||
    record.intraop.rotemMl ||
    record.intraop.rotemCtFibtem ||
    record.intraop.rotemA5Fibtem ||
    record.intraop.rotemA10Fibtem ||
    record.intraop.rotemMcfFibtem ||
    record.intraop.rotemCtIntem ||
    record.intraop.rotemCtHeptem ||
    record.intraop.rotemA5Aptem
  );

  // Check if there are actual vital signs (not just ROTEM)
  const hasVitals = record.intraop && (
    record.intraop.pas ||
    record.intraop.pad ||
    record.intraop.pam ||
    record.intraop.hr ||
    record.intraop.cvp ||
    record.intraop.spo2 ||
    record.intraop.etco2 ||
    record.intraop.temperature
  );

  // Calcular balance de fluidos
  const calculateBalance = () => {
    if (!record.fluids) return null;

    const f = record.fluids;
    const crystalloids = (f.plasmalyte || 0) + (f.ringer || 0) + (f.saline || 0) + (f.dextrose || 0);
    const colloids = (f.colloids || 0) + (f.albumin || 0);
    const bloodProducts =
      (f.redBloodCells || 0) * 250 +
      (f.plasma || 0) * 250 +
      (f.platelets || 0) * 250 +
      (f.cryoprecip || 0) +
      (f.cellSaver || 0) +
      (f.fibrinogen || 0) * 50 +
      (f.pcc || 0) * 20 +
      (f.factorVII || 0) * 2;

    const totalInput = crystalloids + colloids + bloodProducts;
    const totalLoss = (f.insensibleLoss || 0) + (f.ascites || 0) + (f.suction || 0) + (f.gauze || 0) + (f.urine || 0);

    return totalInput - totalLoss;
  };

  const balance = calculateBalance();

  return (
    <div className="bg-dark-700 rounded-lg border border-dark-400 overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 bg-dark-800 hover:bg-dark-750 cursor-pointer flex items-center justify-between transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          <div className="font-mono text-lg font-semibold text-surgical-400">
            {formatDateTime(record.timestamp, 'HH:mm')}
          </div>
          <div className="text-sm text-gray-400">
            {formatDateTime(record.timestamp, 'dd/MM/yyyy')}
          </div>

          {/* Badges */}
          <div className="flex gap-2 flex-wrap">
            {hasVitals && (
              <span className="px-2 py-0.5 bg-blue-900 bg-opacity-30 text-blue-400 text-xs rounded">
                📊 Vitales
              </span>
            )}
            {hasRotem && (
              <span className="px-2 py-0.5 bg-red-900 bg-opacity-30 text-red-400 text-xs rounded">
                🩸 ROTEM
              </span>
            )}
            {hasVentilation && (
              <span className="px-2 py-0.5 bg-indigo-900 bg-opacity-30 text-indigo-400 text-xs rounded">
                🫁 Ventilación
              </span>
            )}
            {hasLab && (
              <span className="px-2 py-0.5 bg-green-900 bg-opacity-30 text-green-400 text-xs rounded">
                🧪 Laboratorio
              </span>
            )}
            {hasMonitoring && (
              <span className="px-2 py-0.5 bg-pink-900 bg-opacity-30 text-pink-400 text-xs rounded">
                📊 Monitoreo
              </span>
            )}
            {hasFluids && (
              <span className="px-2 py-0.5 bg-purple-900 bg-opacity-30 text-purple-400 text-xs rounded">
                💧 Fluidos
              </span>
            )}
            {hasBloodProducts && (
              <span className="px-2 py-0.5 bg-red-900 bg-opacity-30 text-red-400 text-xs rounded">
                🩸 Hemoderivados
              </span>
            )}
            {hasDrugs && (
              <span className="px-2 py-0.5 bg-cyan-900 bg-opacity-30 text-cyan-400 text-xs rounded">
                💊 Fármacos
              </span>
            )}
          </div>

          {/* Balance */}
          {balance !== null && (
            <div className={`text-sm font-semibold ${balance >= 0 ? 'text-green-400' : 'text-orange-400'}`}>
              Balance: {balance > 0 && '+'}{balance} ml
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(record);
                }}
                className="p-1 text-blue-400 hover:text-blue-300"
                title="Editar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1 text-red-400 hover:text-red-300"
                title="Eliminar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          )}

          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Detalles expandidos */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Parámetros vitales */}
          {hasIntraop && (
            <RecordIntraopDetails intraop={record.intraop} allRecords={allRecords} currentTimestamp={record.timestamp} />
          )}

          {/* Fluidos */}
          {hasFluids && (
            <RecordFluidsDetails fluids={record.fluids} />
          )}

          {/* Fármacos */}
          {hasDrugs && (
            <RecordDrugsDetails intraop={record.intraop} />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Detalles de parámetros vitales
 */
function RecordIntraopDetails({ intraop, allRecords, currentTimestamp }) {
  // Buscar el FiO2 más cercano si el registro actual no tiene uno
  const getEffectiveFio2 = () => {
    if (intraop.fio2) return intraop.fio2;
    if (!allRecords || !currentTimestamp) return null;

    // Buscar el registro más cercano que tenga FiO2
    const currentTime = new Date(currentTimestamp).getTime();
    let closestFio2 = null;
    let closestDiff = Infinity;

    allRecords.forEach(rec => {
      if (rec.intraop?.fio2) {
        const diff = Math.abs(new Date(rec.timestamp).getTime() - currentTime);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestFio2 = rec.intraop.fio2;
        }
      }
    });

    return closestFio2;
  };

  const effectiveFio2 = getEffectiveFio2();

  // Helper para determinar color según rangos
  const getColorClass = (value, ranges) => {
    if (value === null || value === undefined) return '';
    const { critical_low, low, normal_low, normal_high, high, critical_high } = ranges;

    if (critical_low !== undefined && value < critical_low) return 'text-red-500 font-bold';
    if (critical_high !== undefined && value > critical_high) return 'text-red-500 font-bold';
    if (low !== undefined && value < low) return 'text-red-400';
    if (high !== undefined && value > high) return 'text-red-400';
    if (normal_low !== undefined && value < normal_low) return 'text-yellow-400';
    if (normal_high !== undefined && value > normal_high) return 'text-yellow-400';
    return 'text-green-400';
  };

  const sections = [
    {
      title: '🩺 Hemodinamia básica',
      fields: [
        {
          label: 'FC',
          value: intraop.heartRate,
          unit: 'lpm',
          colorClass: getColorClass(intraop.heartRate, { critical_low: 40, low: 50, normal_low: 60, normal_high: 100, high: 120, critical_high: 150 })
        },
        { label: 'PA', value: intraop.pas && intraop.pad ? `${intraop.pas}/${intraop.pad}` : null, unit: 'mmHg' },
        {
          label: 'PAm',
          value: intraop.pam,
          unit: 'mmHg',
          colorClass: getColorClass(intraop.pam, { critical_low: 55, low: 60, normal_low: 65, normal_high: 100, high: 110, critical_high: 130 })
        },
        {
          label: 'SatO₂',
          value: intraop.satO2,
          unit: '%',
          colorClass: getColorClass(intraop.satO2, { critical_low: 85, low: 90, normal_low: 94 })
        },
        {
          label: 'PVC',
          value: intraop.cvp,
          unit: 'cmH₂O',
          colorClass: getColorClass(intraop.cvp, { low: 2, normal_low: 5, normal_high: 12, high: 15 })
        },
        {
          label: 'Temp',
          value: intraop.temp,
          unit: '°C',
          colorClass: getColorClass(intraop.temp, { critical_low: 34, low: 35, normal_low: 36, normal_high: 37.5, high: 38, critical_high: 39 })
        },
        {
          label: 'EtCO₂',
          value: intraop.etCO2,
          unit: 'mmHg',
          colorClass: getColorClass(intraop.etCO2, { critical_low: 25, low: 30, normal_low: 35, normal_high: 45, high: 50, critical_high: 60 })
        },
      ],
    },
    {
      title: '🫁 Ventilación',
      fields: [
        { label: 'Modo', value: intraop.ventMode },
        {
          label: 'FiO₂',
          value: intraop.fio2 ? Math.round(intraop.fio2 * 100) : null,
          unit: '%',
          colorClass: intraop.fio2 && intraop.fio2 > 0.6 ? 'text-yellow-400' : ''
        },
        { label: 'Vt', value: intraop.tidalVolume, unit: 'ml' },
        { label: 'FR', value: intraop.respRate, unit: 'rpm' },
        {
          label: 'PEEP',
          value: intraop.peep,
          unit: 'cmH₂O',
          colorClass: getColorClass(intraop.peep, { normal_high: 10, high: 15, critical_high: 20 })
        },
        {
          label: 'PVA',
          value: intraop.peakPressure,
          unit: 'cmH₂O',
          colorClass: getColorClass(intraop.peakPressure, { normal_high: 30, high: 35, critical_high: 40 })
        },
      ],
    },
    {
      title: '💉 Hemodinamia Invasiva',
      fields: [
        { label: 'PAP', value: intraop.paps && intraop.papd ? `${intraop.paps}/${intraop.papd}` : null, unit: 'mmHg' },
        {
          label: 'PAPm',
          value: intraop.papm,
          unit: 'mmHg',
          colorClass: getColorClass(intraop.papm, { normal_high: 25, high: 35, critical_high: 50 })
        },
        {
          label: 'PCP',
          value: intraop.pcwp,
          unit: 'mmHg',
          colorClass: getColorClass(intraop.pcwp, { low: 5, normal_low: 8, normal_high: 15, high: 18, critical_high: 25 })
        },
        {
          label: 'GC',
          value: intraop.cardiacOutput,
          unit: 'L/min',
          colorClass: getColorClass(intraop.cardiacOutput, { critical_low: 2.5, low: 3.5, normal_low: 4, normal_high: 8, high: 10 })
        },
      ],
    },
    {
      title: '📊 Otros Monitoreo',
      fields: [
        {
          label: 'BIS',
          value: intraop.bis,
          colorClass: getColorClass(intraop.bis, { critical_low: 30, low: 40, normal_low: 45, normal_high: 60, high: 70 })
        },
        {
          label: 'PIC',
          value: intraop.icp,
          unit: 'mmHg',
          colorClass: getColorClass(intraop.icp, { normal_high: 15, high: 20, critical_high: 25 })
        },
        {
          label: 'SvO₂',
          value: intraop.svO2,
          unit: '%',
          colorClass: getColorClass(intraop.svO2, { critical_low: 50, low: 60, normal_low: 65, normal_high: 80 })
        },
      ],
    },
    {
      title: '🧪 Laboratorio',
      fields: [
        // Hematología
        {
          label: 'Hb',
          value: intraop.hb,
          unit: 'g/dL',
          colorClass: getColorClass(intraop.hb, { critical_low: 6, low: 7, normal_low: 10, normal_high: 16, high: 18 })
        },
        {
          label: 'Hto',
          value: intraop.hto,
          unit: '%',
          colorClass: getColorClass(intraop.hto, { critical_low: 20, low: 25, normal_low: 30, normal_high: 50, high: 55 })
        },
        {
          label: 'Plaquetas',
          value: intraop.platelets,
          unit: '10³/µL',
          colorClass: getColorClass(intraop.platelets, { critical_low: 20, low: 50, normal_low: 100, normal_high: 400, high: 500 })
        },
        // Coagulación
        {
          label: 'TP',
          value: intraop.pt,
          unit: 'seg',
          colorClass: getColorClass(intraop.pt, { normal_high: 14, high: 18, critical_high: 25 })
        },
        {
          label: 'INR',
          value: intraop.inr,
          colorClass: getColorClass(intraop.inr, { normal_high: 1.2, high: 1.5, critical_high: 2.5 })
        },
        {
          label: 'Fibrinógeno',
          value: intraop.fibrinogen,
          unit: 'mg/dL',
          colorClass: getColorClass(intraop.fibrinogen, { critical_low: 100, low: 150, normal_low: 200, normal_high: 400, high: 500 })
        },
        {
          label: 'APTT',
          value: intraop.aptt,
          unit: 'seg',
          colorClass: getColorClass(intraop.aptt, { normal_high: 40, high: 50, critical_high: 70 })
        },
        // Electrolitos
        {
          label: 'Na⁺',
          value: intraop.sodium,
          unit: 'mEq/L',
          colorClass: getColorClass(intraop.sodium, { critical_low: 120, low: 130, normal_low: 135, normal_high: 145, high: 150, critical_high: 160 })
        },
        {
          label: 'K⁺',
          value: intraop.potassium,
          unit: 'mEq/L',
          colorClass: getColorClass(intraop.potassium, { critical_low: 2.5, low: 3.0, normal_low: 3.5, normal_high: 5.0, high: 5.5, critical_high: 6.5 })
        },
        {
          label: 'Cl⁻',
          value: intraop.chloride,
          unit: 'mEq/L',
          colorClass: getColorClass(intraop.chloride, { low: 95, normal_low: 98, normal_high: 106, high: 110 })
        },
        {
          label: 'Ca²⁺',
          value: intraop.ionicCalcium,
          unit: 'mmol/L',
          colorClass: getColorClass(intraop.ionicCalcium, { critical_low: 0.8, low: 0.9, normal_low: 1.0, normal_high: 1.3, high: 1.4 })
        },
        {
          label: 'Mg',
          value: intraop.magnesium,
          unit: 'mEq/L',
          colorClass: getColorClass(intraop.magnesium, { low: 1.3, normal_low: 1.5, normal_high: 2.3, high: 2.5 })
        },
        { label: 'P', value: intraop.phosphorus, unit: 'mg/dL' },
        // Gases arteriales
        {
          label: 'pH',
          value: intraop.pH,
          colorClass: getColorClass(intraop.pH, { critical_low: 7.20, low: 7.25, normal_low: 7.35, normal_high: 7.45, high: 7.50, critical_high: 7.55 })
        },
        {
          label: 'PaO₂',
          value: intraop.paO2,
          unit: 'mmHg',
          colorClass: getColorClass(intraop.paO2, { critical_low: 50, low: 60, normal_low: 80 })
        },
        {
          label: 'PaFI',
          value: intraop.paO2 && effectiveFio2 ? Math.round(intraop.paO2 / effectiveFio2) : null,
          colorClass: (() => {
            const pafi = intraop.paO2 && effectiveFio2 ? Math.round(intraop.paO2 / effectiveFio2) : null;
            if (!pafi) return '';
            if (pafi < 100) return 'text-red-500 font-bold';
            if (pafi < 200) return 'text-red-400';
            if (pafi < 300) return 'text-yellow-400';
            return 'text-green-400';
          })(),
          suffix: (() => {
            const pafi = intraop.paO2 && effectiveFio2 ? Math.round(intraop.paO2 / effectiveFio2) : null;
            if (!pafi) return '';
            if (pafi < 100) return ' (SDRA severo)';
            if (pafi < 200) return ' (SDRA moderado)';
            if (pafi < 300) return ' (SDRA leve)';
            return '';
          })()
        },
        { label: 'PaCO₂', value: intraop.paCO2, unit: 'mmHg' },
        { label: 'HCO₃⁻', value: intraop.hco3, unit: 'mEq/L' },
        { label: 'BE', value: intraop.baseExcess, unit: 'mEq/L' },
        // Función renal
        { label: 'BUN', value: intraop.azotemia, unit: 'mg/dL' },
        { label: 'Creatinina', value: intraop.creatinine, unit: 'mg/dL' },
        // Función hepática
        { label: 'TGO', value: intraop.sgot, unit: 'U/L' },
        { label: 'TGP', value: intraop.sgpt, unit: 'U/L' },
        { label: 'Bili total', value: intraop.totalBili, unit: 'mg/dL' },
        { label: 'Bili directa', value: intraop.directBili, unit: 'mg/dL' },
        { label: 'Albúmina', value: intraop.albumin, unit: 'g/dL' },
        // Metabólicos
        { label: 'Lactato', value: intraop.lactate, unit: 'mmol/L' },
        { label: 'Glicemia', value: intraop.glucose, unit: 'mg/dL' },
        { label: 'Proteínas', value: intraop.proteins, unit: 'g/dL' },
      ],
    },
    {
      title: '🫀 ETE',
      fields: [
        { label: 'Función VD', value: intraop.eteRightVentricle },
        { label: 'TAPSE', value: intraop.eteTapse },
        { label: 'Función VI', value: intraop.eteLeftVentricle },
        { label: 'Cavidades', value: intraop.eteChamberDilation },
        { label: 'PSAP', value: intraop.etePsap },
        { label: 'Trombos', value: intraop.eteThrombus },
        { label: 'Derrame pericárdico', value: intraop.etePericardial },
        { label: 'Evaluación volemia', value: intraop.eteVolumeStatus, fullWidth: true },
        { label: 'Observaciones', value: intraop.eteObservations, fullWidth: true },
      ],
    },
    {
      title: '🩸 ROTEM',
      fields: [
        { label: 'CTEXTEM', value: intraop.rotemCtExtem, unit: 'seg' },
        { label: 'A5EXTEM', value: intraop.rotemA5Extem, unit: 'mm' },
        { label: 'A5FIBTEM', value: intraop.rotemA5Fibtem, unit: 'mm' },
        { label: 'CLI30', value: intraop.rotemCli30, unit: '%' },
        { label: 'MCF EXTEM', value: intraop.rotemMcfExtem, unit: 'mm' },
        { label: 'MCF FIBTEM', value: intraop.rotemMcfFibtem, unit: 'mm' },
        { label: 'CTINTEM', value: intraop.rotemCtIntem, unit: 'seg' },
        { label: 'CTHEPTEM', value: intraop.rotemCtHeptem, unit: 'seg' },
      ],
    },
  ];

  return (
    <div className="bg-dark-800 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-blue-400 mb-3">📊 Parámetros Vitales</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => {
          const hasData = section.fields.some((field) => field.value !== null && field.value !== undefined);
          if (!hasData) return null;

          return (
            <div key={section.title} className="space-y-2">
              <h5 className="text-xs font-medium text-gray-400">{section.title}</h5>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {section.fields.map(
                  (field) =>
                    (field.value !== null && field.value !== undefined) && (
                      <div key={field.label} className={`flex justify-between ${field.fullWidth ? 'col-span-2' : ''}`}>
                        <span className="text-gray-500">{field.label}:</span>
                        <span className={`font-medium ${field.colorClass || 'text-gray-200'}`}>
                          {field.value}{field.unit ? ` ${field.unit}` : ''}{field.suffix || ''}
                        </span>
                      </div>
                    )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Detalles de fluidos
 */
function RecordFluidsDetails({ fluids }) {
  return (
    <div className="bg-dark-800 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-purple-400 mb-3">💧 Fluidos & Pérdidas</h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reposición */}
        <div className="space-y-3">
          <h5 className="text-xs font-medium text-blue-400">Reposición</h5>

          {/* Cristaloides */}
          {(fluids.plasmalyte || fluids.ringer || fluids.saline || fluids.dextrose) && (
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Cristaloides:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {fluids.plasmalyte > 0 && <FluidItem label="Plasmalyte" value={fluids.plasmalyte} unit="ml" />}
                {fluids.ringer > 0 && <FluidItem label="Ringer" value={fluids.ringer} unit="ml" />}
                {fluids.saline > 0 && <FluidItem label="Salino" value={fluids.saline} unit="ml" />}
                {fluids.dextrose > 0 && <FluidItem label="Dextrosa" value={fluids.dextrose} unit="ml" />}
              </div>
            </div>
          )}

          {/* Coloides */}
          {(fluids.colloids || fluids.albumin) && (
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Coloides:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {fluids.colloids > 0 && <FluidItem label="Coloides" value={fluids.colloids} unit="ml" />}
                {fluids.albumin > 0 && <FluidItem label="Albúmina" value={fluids.albumin} unit="ml" />}
              </div>
            </div>
          )}

          {/* Hemoderivados */}
          {(fluids.redBloodCells || fluids.plasma || fluids.platelets || fluids.cryoprecip || fluids.cellSaver || fluids.fibrinogen || fluids.pcc || fluids.factorVII) && (
            <div className="space-y-1">
              <div className="text-xs text-gray-500 text-red-400">Hemoderivados:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {fluids.redBloodCells > 0 && <FluidItem label="GR" value={fluids.redBloodCells} unit="U" />}
                {fluids.plasma > 0 && <FluidItem label="Plasma" value={fluids.plasma} unit="U" />}
                {fluids.platelets > 0 && <FluidItem label="Plaquetas" value={fluids.platelets} unit="U" />}
                {fluids.cryoprecip > 0 && <FluidItem label="Crioprecipitados" value={fluids.cryoprecip} unit="ml" />}
                {fluids.cellSaver > 0 && <FluidItem label="Cell Saver" value={fluids.cellSaver} unit="ml" />}
                {fluids.fibrinogen > 0 && <FluidItem label="Fibrinógeno" value={fluids.fibrinogen} unit="g" />}
                {fluids.pcc > 0 && <FluidItem label="CCP" value={fluids.pcc} unit="U" />}
                {fluids.factorVII > 0 && <FluidItem label="Factor VII" value={fluids.factorVII} unit="mg" />}
              </div>
            </div>
          )}

          {fluids.otherFluids && (
            <div className="text-xs">
              <span className="text-gray-500">Otros: </span>
              <span className="text-gray-300">{fluids.otherFluids}</span>
            </div>
          )}
        </div>

        {/* Pérdidas */}
        <div className="space-y-3">
          <h5 className="text-xs font-medium text-orange-400">Pérdidas</h5>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {fluids.insensibleLoss > 0 && <FluidItem label="Pérdida insensible" value={fluids.insensibleLoss} unit="ml" />}
            {fluids.ascites > 0 && <FluidItem label="Ascitis" value={fluids.ascites} unit="ml" />}
            {fluids.suction > 0 && <FluidItem label="Aspirador" value={fluids.suction} unit="ml" />}
            {fluids.gauze > 0 && <FluidItem label="Gasas" value={fluids.gauze} unit="ml" />}
            {fluids.urine > 0 && <FluidItem label="Diuresis" value={fluids.urine} unit="ml" />}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Detalles de fármacos
 */
function RecordDrugsDetails({ intraop }) {
  const selectedDrugs = [];

  // Agente inhalatorio
  if (intraop.inhalAgent) {
    selectedDrugs.push({ label: `Agente inhalatorio: ${intraop.inhalAgent}`, category: 'Inhalatorio' });
  }

  // Opiáceos
  if (intraop.opioidBolus) selectedDrugs.push({ label: 'Opiáceo - Bolo', category: 'Opiáceos' });
  if (intraop.opioidInfusion) selectedDrugs.push({ label: 'Opiáceo - Infusión', category: 'Opiáceos' });

  // Hipnóticos
  if (intraop.hypnoticBolus) selectedDrugs.push({ label: 'Hipnótico - Bolo', category: 'Hipnóticos' });
  if (intraop.hypnoticInfusion) selectedDrugs.push({ label: 'Hipnótico - Infusión', category: 'Hipnóticos' });

  // Relajantes musculares
  if (intraop.relaxantBolus) selectedDrugs.push({ label: 'Relajante - Bolo', category: 'Relajantes' });
  if (intraop.relaxantInfusion) selectedDrugs.push({ label: 'Relajante - Infusión', category: 'Relajantes' });

  // Anestésicos locales
  if (intraop.lidocaineBolus) selectedDrugs.push({ label: 'Lidocaína - Bolo', category: 'Anestésicos locales' });
  if (intraop.lidocaineInfusion) selectedDrugs.push({ label: 'Lidocaína - Infusión', category: 'Anestésicos locales' });

  // Vasopresores e inotrópicos
  if (intraop.adrenalineBolus) selectedDrugs.push({ label: 'Adrenalina - Bolo', category: 'Vasopresores' });
  if (intraop.adrenalineInfusion) selectedDrugs.push({ label: 'Adrenalina - Infusión', category: 'Vasopresores' });
  if (intraop.dobutamine) selectedDrugs.push({ label: 'Dobutamina', category: 'Vasopresores' });
  if (intraop.dopamine) selectedDrugs.push({ label: 'Dopamina', category: 'Vasopresores' });
  if (intraop.noradrenaline) selectedDrugs.push({ label: 'Noradrenalina', category: 'Vasopresores' });
  if (intraop.phenylephrine) selectedDrugs.push({ label: 'Fenilefrina', category: 'Vasopresores' });

  // Otros fármacos
  if (intraop.insulinBolus) selectedDrugs.push({ label: 'Insulina - Bolo', category: 'Otros' });
  if (intraop.insulinInfusion) selectedDrugs.push({ label: 'Insulina - Infusión', category: 'Otros' });
  if (intraop.furosemide) selectedDrugs.push({ label: 'Furosemida', category: 'Otros' });
  if (intraop.tranexamicBolus) selectedDrugs.push({ label: 'Ácido Tranexámico - Bolo', category: 'Otros' });
  if (intraop.tranexamicInfusion) selectedDrugs.push({ label: 'Ácido Tranexámico - Infusión', category: 'Otros' });
  if (intraop.calciumGluconBolus) selectedDrugs.push({ label: 'Gluconato de Calcio - Bolo', category: 'Otros' });
  if (intraop.calciumGluconInfusion) selectedDrugs.push({ label: 'Gluconato de Calcio - Infusión', category: 'Otros' });
  if (intraop.sodiumBicarb) selectedDrugs.push({ label: 'Bicarbonato de Sodio', category: 'Otros' });
  if (intraop.antibiotics) selectedDrugs.push({ label: 'Antibióticos', category: 'Otros' });

  return (
    <div className="bg-dark-800 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-purple-400 mb-3">💊 Fármacos Administrados</h4>

      {selectedDrugs.length === 0 ? (
        <p className="text-xs text-gray-500">No se registraron fármacos</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {selectedDrugs.map((drug, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-purple-900 bg-opacity-30 text-purple-300 text-xs rounded-full border border-purple-700"
            >
              ✓ {drug.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Item de fluido
 */
function FluidItem({ label, value, unit }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}:</span>
      <span className="text-gray-200 font-medium">{value} {unit}</span>
    </div>
  );
}

/**
 * Input de fluido
 */
function FluidInput({ label, name, register }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type="number"
        {...register(name)}
        min="0"
        className="w-full px-2 py-1 text-sm bg-dark-600 border border-dark-400 rounded focus:ring-1 focus:ring-surgical-500"
      />
    </div>
  );
}

/**
 * Campo de formulario reutilizable
 */
function FormField({ label, required, tooltip, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
        {tooltip && <span className="text-gray-500 ml-1" title={tooltip}>ⓘ</span>}
      </label>
      {children}
    </div>
  );
}
