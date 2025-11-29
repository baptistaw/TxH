// src/components/cases/IntraopCharts.jsx
'use client';

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { casesApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

// Colores por fase
const phaseColors = {
  'ESTADO_BASAL': 'rgba(148, 163, 184, 0.15)',
  'INDUCCION': 'rgba(96, 165, 250, 0.15)',
  'DISECCION': 'rgba(52, 211, 153, 0.15)',
  'ANHEPATICA': 'rgba(251, 191, 36, 0.15)',
  'PRE_REPERFUSION': 'rgba(249, 115, 22, 0.15)',
  'POST_REPERFUSION': 'rgba(236, 72, 153, 0.15)',
  'VIA_BILIAR': 'rgba(167, 139, 250, 0.15)',
  'CIERRE': 'rgba(99, 102, 241, 0.15)',
  'SALIDA_BQ': 'rgba(139, 92, 246, 0.15)'
};

// Nombres de fases para etiquetas
const phaseLabels = {
  'ESTADO_BASAL': 'Basal',
  'INDUCCION': 'Inducción',
  'DISECCION': 'Disección',
  'ANHEPATICA': 'Anhepática',
  'PRE_REPERFUSION': 'Pre-Reperfusión',
  'POST_REPERFUSION': 'Post-Reperfusión',
  'VIA_BILIAR': 'Vía Biliar',
  'CIERRE': 'Cierre',
  'SALIDA_BQ': 'Salida BQ'
};

// Plugin para dibujar bandas de colores de fondo por fase con etiquetas
const phaseBackgroundPlugin = {
  id: 'phaseBackground',
  beforeDraw: (chart, args, options) => {
    const { ctx, chartArea: { left, right, top, bottom }, scales: { x } } = chart;
    const phases = options.phases || [];

    if (phases.length === 0) return;

    ctx.save();

    // Identificar segmentos de fases
    const phaseSegments = [];
    let currentPhase = phases[0];
    let phaseStartIndex = 0;

    for (let i = 1; i <= phases.length; i++) {
      if (i === phases.length || phases[i] !== currentPhase) {
        phaseSegments.push({
          phase: currentPhase,
          startIndex: phaseStartIndex,
          endIndex: i - 1
        });

        if (i < phases.length) {
          currentPhase = phases[i];
          phaseStartIndex = i;
        }
      }
    }

    // Dibujar bandas y etiquetas
    phaseSegments.forEach((segment, idx) => {
      // Calcular inicio y fin de la banda
      // La banda va desde el punto actual hasta el punto siguiente (o el final del gráfico)
      const startX = idx === 0 ? left : x.getPixelForValue(segment.startIndex);
      const endX = idx === phaseSegments.length - 1
        ? right
        : x.getPixelForValue(phaseSegments[idx + 1].startIndex);
      const width = endX - startX;

      // Dibujar banda de color
      ctx.fillStyle = phaseColors[segment.phase] || 'rgba(200, 200, 200, 0.1)';
      ctx.fillRect(startX, top, width, bottom - top);

      // Dibujar etiqueta en la parte superior
      if (width > 40) { // Solo dibujar etiqueta si hay espacio suficiente
        const centerX = startX + width / 2;

        ctx.fillStyle = '#9ca3af';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const label = phaseLabels[segment.phase] || segment.phase;
        ctx.fillText(label, centerX, top - 25);
      }
    });

    ctx.restore();
  }
};

// Registrar componentes de Chart.js y plugin una sola vez
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  phaseBackgroundPlugin
);

export default function IntraopCharts({ caseId }) {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Obtener registros intraoperatorios usando el API helper con autenticación
        const intraopRecords = await casesApi.getIntraop(caseId);

        // Obtener registros de fluidos usando el API helper con autenticación
        const fluidsRecords = await casesApi.getFluids(caseId);

        // Preparar datos para las gráficas
        const prepared = prepareChartData(intraopRecords, fluidsRecords);
        setChartData(prepared);
      } catch (err) {
        console.error('Error fetching chart data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (caseId) {
      fetchData();
    }
  }, [caseId]);

  // Función para preparar los datos de las gráficas
  const prepareChartData = (intraopRecords, fluidsRecords) => {
    // Ordenar por timestamp
    const sortedIntraop = [...intraopRecords].sort((a, b) =>
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    // 1. Datos hemodinámicos
    const hemodynamicData = {
      labels: [],
      phases: [],
      heartRate: [],
      map: [],
      cvp: [],
      satO2: [],
      temp: []
    };

    sortedIntraop.forEach(r => {
      if (r.timestamp && (r.heartRate || r.pam || r.cvp || r.satO2 || r.temp)) {
        const date = new Date(r.timestamp);
        hemodynamicData.labels.push(`${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`);
        hemodynamicData.phases.push(r.phase);
        hemodynamicData.heartRate.push(r.heartRate || null);
        hemodynamicData.map.push(r.pam || null);
        hemodynamicData.cvp.push(r.cvp || null);
        hemodynamicData.satO2.push(r.satO2 || null);
        hemodynamicData.temp.push(r.temp || null);
      }
    });

    // 2. Datos de laboratorio
    const labData = {
      labels: [],
      phases: [],
      hb: [],
      lactate: [],
      glucose: [],
      pH: [],
      pafi: [],
      be: [],
      na: [],
      k: [],
      ca: []
    };

    sortedIntraop.forEach(r => {
      if (r.timestamp && (r.hb || r.lactate || r.glucose || r.pH || r.paO2 || r.be || r.na || r.k || r.ca)) {
        const date = new Date(r.timestamp);
        labData.labels.push(`${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`);
        labData.phases.push(r.phase);
        labData.hb.push(r.hb || null);
        labData.lactate.push(r.lactate || null);
        labData.glucose.push(r.glucose || null);
        labData.pH.push(r.pH || null);
        // Calcular PaFI si hay PaO2 y FiO2
        const pafi = (r.paO2 && r.fio2 && r.fio2 > 0) ? Math.round(r.paO2 / r.fio2) : null;
        labData.pafi.push(pafi);
        labData.be.push(r.be || null);
        labData.na.push(r.na || null);
        labData.k.push(r.k || null);
        labData.ca.push(r.ca || null);
      }
    });

    // 3. Datos de balance de fluidos
    const sortedFluids = [...fluidsRecords].sort((a, b) =>
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    const fluidBalanceData = {
      labels: [],
      phases: [],
      bloodLoss: [],
      urine: [],
      crystalloids: [],
      colloids: [],
      rbc: []
    };

    sortedFluids.forEach(r => {
      if (r.timestamp) {
        const date = new Date(r.timestamp);
        fluidBalanceData.labels.push(`${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`);
        fluidBalanceData.phases.push(r.phase);
        // Sangrado = suction + gauze
        fluidBalanceData.bloodLoss.push((r.suction || 0) + (r.gauze || 0));
        fluidBalanceData.urine.push(r.urine || 0);
        // Cristaloides = suma de todos los cristaloides
        fluidBalanceData.crystalloids.push((r.plasmalyte || 0) + (r.ringer || 0) + (r.saline || 0) + (r.dextrose || 0));
        // Coloides (ya es un campo)
        fluidBalanceData.colloids.push(r.colloids || 0);
        // GR (redBloodCells convertido a ml: 1 unidad ≈ 300ml)
        fluidBalanceData.rbc.push((r.redBloodCells || 0) * 300);
      }
    });

    return { hemodynamicData, labData, fluidBalanceData };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-red-500">Error al cargar gráficas: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!chartData) {
    return null;
  }

  // Configuración común para las gráficas
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 35, // Espacio para las etiquetas de fase
        bottom: 10
      }
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          font: { size: 11 },
          padding: 12,
          color: '#9ca3af'
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: '#1f2937',
        titleColor: '#f3f4f6',
        bodyColor: '#d1d5db',
        borderColor: '#374151',
        borderWidth: 1,
        titleFont: { size: 12 },
        bodyFont: { size: 11 }
      }
    },
    scales: {
      x: {
        ticks: {
          font: { size: 10 },
          color: '#9ca3af'
        },
        grid: { display: false, color: '#374151' }
      },
      y: {
        ticks: {
          font: { size: 10 },
          color: '#9ca3af'
        },
        grid: { color: '#374151' }
      }
    }
  };

  // Gráfica 1: Variables Hemodinámicas
  const hemodynamicChartData = {
    labels: chartData.hemodynamicData.labels,
    datasets: [
      {
        label: 'FC (lpm)',
        data: chartData.hemodynamicData.heartRate,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3,
        yAxisID: 'y'
      },
      {
        label: 'PAM (mmHg)',
        data: chartData.hemodynamicData.map,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3,
        yAxisID: 'y'
      },
      {
        label: 'PVC (mmHg)',
        data: chartData.hemodynamicData.cvp,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3,
        yAxisID: 'y'
      },
      {
        label: 'SatO₂ (%)',
        data: chartData.hemodynamicData.satO2,
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3,
        yAxisID: 'y1'
      },
      {
        label: 'Temp (°C)',
        data: chartData.hemodynamicData.temp,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3,
        yAxisID: 'y2'
      }
    ]
  };

  const hemodynamicOptions = {
    ...commonOptions,
    plugins: {
      ...commonOptions.plugins,
      phaseBackground: {
        phases: chartData.hemodynamicData.phases
      }
    },
    scales: {
      x: commonOptions.scales.x,
      y: {
        ...commonOptions.scales.y,
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'FC / PAM / PVC',
          font: { size: 10 },
          color: '#9ca3af'
        }
      },
      y1: {
        ...commonOptions.scales.y,
        type: 'linear',
        display: true,
        position: 'right',
        min: 80,
        max: 100,
        title: {
          display: true,
          text: 'SatO₂ (%)',
          font: { size: 10 },
          color: '#9ca3af'
        },
        grid: { drawOnChartArea: false, color: '#374151' }
      },
      y2: {
        ...commonOptions.scales.y,
        type: 'linear',
        display: false,
        position: 'right',
        min: 30,
        max: 40
      }
    }
  };

  // Gráfica 2: Balance de Fluidos
  const fluidBalanceChartData = {
    labels: chartData.fluidBalanceData.labels,
    datasets: [
      {
        label: 'Sangrado (ml)',
        data: chartData.fluidBalanceData.bloodLoss,
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220, 38, 38, 0.2)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3,
        fill: true
      },
      {
        label: 'Diuresis (ml)',
        data: chartData.fluidBalanceData.urine,
        borderColor: '#fbbf24',
        backgroundColor: 'rgba(251, 191, 36, 0.2)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3,
        fill: true
      },
      {
        label: 'Cristaloides (ml)',
        data: chartData.fluidBalanceData.crystalloids,
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.2)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3,
        fill: true
      },
      {
        label: 'Coloides (ml)',
        data: chartData.fluidBalanceData.colloids,
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3,
        fill: true
      },
      {
        label: 'GR (ml)',
        data: chartData.fluidBalanceData.rbc,
        borderColor: '#be123c',
        backgroundColor: 'rgba(190, 18, 60, 0.2)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3,
        fill: true
      }
    ]
  };

  const fluidBalanceOptions = {
    ...commonOptions,
    plugins: {
      ...commonOptions.plugins,
      phaseBackground: {
        phases: chartData.fluidBalanceData.phases
      }
    },
    scales: {
      ...commonOptions.scales,
      y: {
        ...commonOptions.scales.y,
        title: {
          display: true,
          text: 'Volumen (ml)',
          font: { size: 10 },
          color: '#9ca3af'
        },
        beginAtZero: true
      }
    }
  };

  // Gráfica 3: Parámetros de Laboratorio
  const labChartData = {
    labels: chartData.labData.labels,
    datasets: [
      {
        label: 'Hb (g/dL)',
        data: chartData.labData.hb,
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3,
        yAxisID: 'y'
      },
      {
        label: 'Lactato (mmol/L)',
        data: chartData.labData.lactate,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3,
        yAxisID: 'y1'
      },
      {
        label: 'Glucosa (mg/dL)',
        data: chartData.labData.glucose,
        borderColor: '#a855f7',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3,
        yAxisID: 'y8'
      },
      {
        label: 'pH',
        data: chartData.labData.pH,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3,
        yAxisID: 'y2'
      },
      {
        label: 'PaFI',
        data: chartData.labData.pafi,
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3,
        yAxisID: 'y3'
      },
      {
        label: 'BE (mEq/L)',
        data: chartData.labData.be,
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3,
        yAxisID: 'y4'
      },
      {
        label: 'Na (mEq/L)',
        data: chartData.labData.na,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3,
        yAxisID: 'y5'
      },
      {
        label: 'K (mEq/L)',
        data: chartData.labData.k,
        borderColor: '#ec4899',
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3,
        yAxisID: 'y6'
      },
      {
        label: 'Ca (mg/dL)',
        data: chartData.labData.ca,
        borderColor: '#84cc16',
        backgroundColor: 'rgba(132, 204, 22, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3,
        yAxisID: 'y7'
      }
    ]
  };

  const labOptions = {
    ...commonOptions,
    plugins: {
      ...commonOptions.plugins,
      phaseBackground: {
        phases: chartData.labData.phases
      }
    },
    scales: {
      x: commonOptions.scales.x,
      y: {
        ...commonOptions.scales.y,
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Hb (g/dL)',
          font: { size: 9 },
          color: '#9ca3af'
        }
      },
      y1: {
        ...commonOptions.scales.y,
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Lactato',
          font: { size: 9 },
          color: '#9ca3af'
        },
        grid: { drawOnChartArea: false, color: '#374151' }
      },
      y2: {
        ...commonOptions.scales.y,
        type: 'linear',
        display: false,
        position: 'right',
        min: 7.0,
        max: 7.6
      },
      y3: {
        ...commonOptions.scales.y,
        type: 'linear',
        display: false,
        position: 'right',
        min: 0,
        max: 600
      },
      y4: {
        ...commonOptions.scales.y,
        type: 'linear',
        display: false,
        position: 'right',
        min: -15,
        max: 10
      },
      y5: {
        ...commonOptions.scales.y,
        type: 'linear',
        display: false,
        position: 'right',
        min: 125,
        max: 155
      },
      y6: {
        ...commonOptions.scales.y,
        type: 'linear',
        display: false,
        position: 'right',
        min: 2.5,
        max: 6.5
      },
      y7: {
        ...commonOptions.scales.y,
        type: 'linear',
        display: false,
        position: 'right',
        min: 6,
        max: 12
      },
      y8: {
        ...commonOptions.scales.y,
        type: 'linear',
        display: false,
        position: 'right',
        min: 50,
        max: 400
      }
    }
  };

  return (
    <div className="space-y-6 mt-6">
      <h2 className="text-2xl font-bold text-gray-100">Tendencias Temporales Intraoperatorias</h2>

      {/* Gráfica 1: Variables Hemodinámicas */}
      {chartData.hemodynamicData.labels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Variables Hemodinámicas</CardTitle>
            <CardDescription>Evolución temporal de frecuencia cardíaca, presión arterial, y parámetros de monitoreo</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: '600px' }}>
              <Line data={hemodynamicChartData} options={hemodynamicOptions} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráfica 2: Balance de Fluidos */}
      {chartData.fluidBalanceData.labels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🩸 Balance de Fluidos y Hemoderivados</CardTitle>
            <CardDescription>Registro acumulativo de sangrado, diuresis, fluidos y transfusiones</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: '600px' }}>
              <Line data={fluidBalanceChartData} options={fluidBalanceOptions} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráfica 3: Parámetros de Laboratorio */}
      {chartData.labData.labels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🧪 Parámetros de Laboratorio</CardTitle>
            <CardDescription>Evolución de hemoglobina, lactato, glucosa, pH, PaFI, BE y electrolitos (Na, K, Ca)</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: '600px' }}>
              <Line data={labChartData} options={labOptions} />
            </div>
          </CardContent>
        </Card>
      )}

      {chartData.hemodynamicData.labels.length === 0 &&
       chartData.fluidBalanceData.labels.length === 0 &&
       chartData.labData.labels.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-gray-500">
              No hay datos suficientes para mostrar gráficas
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
