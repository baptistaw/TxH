'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { analyticsApi } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

export default function AnalyticsDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [kpiData, setKpiData] = useState(null);
  const [clinicalData, setClinicalData] = useState(null);
  const [availableYears, setAvailableYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('quality'); // 'quality' | 'clinical'

  // Filtros de período
  const [filterType, setFilterType] = useState('all'); // 'all', 'year', 'custom', 'preset'
  const [selectedYear, setSelectedYear] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [presetPeriod, setPresetPeriod] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadInitialData();
    }
  }, [user, authLoading, router]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [kpis, years, clinical] = await Promise.all([
        analyticsApi.getKPIs({}),
        analyticsApi.getAvailableYears(),
        analyticsApi.getClinicalKPIs({}),
      ]);
      setKpiData(kpis);
      setClinicalData(clinical);
      setAvailableYears(years.years || []);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFilteredData = async (params = {}) => {
    setLoading(true);
    try {
      const [kpis, clinical] = await Promise.all([
        analyticsApi.getKPIs(params),
        analyticsApi.getClinicalKPIs(params),
      ]);
      setKpiData(kpis);
      setClinicalData(clinical);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Manejadores de filtros
  const handleFilterTypeChange = (type) => {
    setFilterType(type);
    setPresetPeriod(null);

    if (type === 'all') {
      setSelectedYear(null);
      setStartDate('');
      setEndDate('');
      loadFilteredData({});
    }
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
    setFilterType('year');
    setPresetPeriod(null);
    loadFilteredData({ year: parseInt(year) });
  };

  const handleCustomDateFilter = () => {
    if (startDate || endDate) {
      setFilterType('custom');
      setPresetPeriod(null);
      loadFilteredData({ startDate, endDate });
    }
  };

  const handlePresetPeriod = (period) => {
    setPresetPeriod(period);
    setFilterType('preset');
    setSelectedYear(null);

    const now = new Date();
    let start = new Date();

    switch (period) {
      case '3m':
        start.setMonth(now.getMonth() - 3);
        break;
      case '6m':
        start.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        start.setFullYear(now.getFullYear() - 1);
        break;
      case '2y':
        start.setFullYear(now.getFullYear() - 2);
        break;
      default:
        loadFilteredData({});
        return;
    }

    const startStr = start.toISOString().split('T')[0];
    const endStr = now.toISOString().split('T')[0];

    setStartDate(startStr);
    setEndDate(endStr);
    loadFilteredData({ startDate: startStr, endDate: endStr });
  };

  const clearFilters = () => {
    setFilterType('all');
    setSelectedYear(null);
    setStartDate('');
    setEndDate('');
    setPresetPeriod(null);
    loadFilteredData({});
  };

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-100">Estadísticas</h1>
            <p className="text-gray-400 mt-1">Dashboard de indicadores y métricas del programa de trasplantes</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-400">
          <button
            onClick={() => setActiveTab('quality')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'quality'
                ? 'border-surgical-500 text-surgical-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>📋</span>
              Indicadores de Calidad
            </span>
          </button>
          <button
            onClick={() => setActiveTab('clinical')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'clinical'
                ? 'border-surgical-500 text-surgical-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>📊</span>
              KPIs Clínicos
            </span>
          </button>
        </div>

        {/* Filtros de Período */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Filtros de Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Botones de período predefinido */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleFilterTypeChange('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterType === 'all'
                      ? 'bg-surgical-500 text-white'
                      : 'bg-dark-500 text-gray-300 hover:bg-dark-400'
                  }`}
                >
                  Todos los datos
                </button>
                <button
                  onClick={() => handlePresetPeriod('3m')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    presetPeriod === '3m'
                      ? 'bg-surgical-500 text-white'
                      : 'bg-dark-500 text-gray-300 hover:bg-dark-400'
                  }`}
                >
                  Últimos 3 meses
                </button>
                <button
                  onClick={() => handlePresetPeriod('6m')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    presetPeriod === '6m'
                      ? 'bg-surgical-500 text-white'
                      : 'bg-dark-500 text-gray-300 hover:bg-dark-400'
                  }`}
                >
                  Últimos 6 meses
                </button>
                <button
                  onClick={() => handlePresetPeriod('1y')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    presetPeriod === '1y'
                      ? 'bg-surgical-500 text-white'
                      : 'bg-dark-500 text-gray-300 hover:bg-dark-400'
                  }`}
                >
                  Último año
                </button>
                <button
                  onClick={() => handlePresetPeriod('2y')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    presetPeriod === '2y'
                      ? 'bg-surgical-500 text-white'
                      : 'bg-dark-500 text-gray-300 hover:bg-dark-400'
                  }`}
                >
                  Últimos 2 años
                </button>
              </div>

              {/* Filtro por año y rango personalizado */}
              <div className="flex flex-wrap items-end gap-4">
                {/* Selector de año */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Año específico</label>
                  <select
                    value={filterType === 'year' ? selectedYear : ''}
                    onChange={(e) => e.target.value && handleYearChange(e.target.value)}
                    className="bg-dark-500 border border-dark-300 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-surgical-500 min-w-[150px]"
                  >
                    <option value="">Seleccionar</option>
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year} {(year === 2023 || year === 2024) ? '(histórico)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Separador */}
                <div className="text-gray-500 pb-2">o</div>

                {/* Rango de fechas personalizado */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Fecha desde</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-dark-500 border border-dark-300 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-surgical-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Fecha hasta</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-dark-500 border border-dark-300 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-surgical-500"
                  />
                </div>
                <Button
                  onClick={handleCustomDateFilter}
                  disabled={!startDate && !endDate}
                  variant="secondary"
                  size="sm"
                >
                  Aplicar
                </Button>
                {filterType !== 'all' && (
                  <Button onClick={clearFilters} variant="ghost" size="sm">
                    Limpiar filtros
                  </Button>
                )}
              </div>

              {/* Indicador del período seleccionado */}
              {kpiData?.summary?.dateRange?.start && (
                <div className="text-sm text-gray-400 pt-2 border-t border-dark-400">
                  Mostrando datos desde{' '}
                  <span className="text-gray-200">
                    {new Date(kpiData.summary.dateRange.start).toLocaleDateString('es-UY')}
                  </span>
                  {' '}hasta{' '}
                  <span className="text-gray-200">
                    {new Date(kpiData.summary.dateRange.end).toLocaleDateString('es-UY')}
                  </span>
                  {' '}({kpiData.summary.totalTransplants} trasplantes)
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tab: Indicadores de Calidad */}
        {activeTab === 'quality' && kpiData && (
          <>
            {/* Banner de origen de datos */}
            {kpiData.summary.dataSource?.type === 'manual' && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📋</span>
                  <div>
                    <h4 className="text-amber-400 font-medium">Datos Históricos (Registro Manual)</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      {kpiData.summary.dataSource.description}
                    </p>
                    {kpiData.summary.dataSource.note && (
                      <p className="text-xs text-amber-500/80 mt-2">
                        {kpiData.summary.dataSource.note}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Banner sistema pendiente de producción */}
            {kpiData.summary.dataSource?.type === 'pending' && filterType !== 'year' && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🚀</span>
                  <div>
                    <h4 className="text-blue-400 font-medium">Sistema en Desarrollo</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      El sistema aún no está en producción. Seleccione un año (2023 o 2024) para ver
                      los datos históricos recopilados manualmente.
                    </p>
                    {kpiData.availableHistoricalYears?.length > 0 && (
                      <p className="text-xs text-blue-500/80 mt-2">
                        Años disponibles con datos históricos: {kpiData.availableHistoricalYears.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Mensaje informativo cuando no hay datos evaluados */}
            {kpiData.summary.totalTransplants > 0 &&
              kpiData.summary.dataSource?.type !== 'manual' &&
              kpiData.indicators.bloodReplacementProtocol.totalEvaluated === 0 &&
              kpiData.indicators.antibioticProphylaxis.totalEvaluated === 0 &&
              kpiData.indicators.fastTrackProtocol.totalEvaluated === 0 && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <h4 className="text-blue-400 font-medium">Indicadores pendientes de evaluación</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      Los trasplantes registrados no tienen los indicadores de calidad completados.
                      Para ver estadísticas, ve a cada procedimiento de trasplante y completa la sección
                      &quot;Indicadores de Calidad&quot; con los datos correspondientes.
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Total de trasplantes sin evaluar: {kpiData.summary.totalTransplants}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Mensaje cuando no hay trasplantes */}
            {kpiData.summary.totalTransplants === 0 && kpiData.summary.dataSource?.type !== 'manual' && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📊</span>
                  <div>
                    <h4 className="text-yellow-400 font-medium">Sin datos de trasplantes</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      No hay procedimientos de trasplante registrados en el período seleccionado.
                      Los indicadores se calcularán automáticamente cuando se registren trasplantes
                      con los datos de calidad completados.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <SummaryCard
                title="Total Trasplantes"
                value={kpiData.summary.totalTransplants}
                icon="🫀"
              />
              <SummaryCard
                title="Prot. Reposición"
                value={`${kpiData.indicators.bloodReplacementProtocol.rate || 0}%`}
                subtitle={`Meta: 80%`}
                icon="🩸"
                isOnTarget={parseFloat(kpiData.indicators.bloodReplacementProtocol.rate) >= 80}
              />
              <SummaryCard
                title="Profilaxis ATB"
                value={`${kpiData.indicators.antibioticProphylaxis.rate || 0}%`}
                subtitle={`Meta: 100%`}
                icon="💊"
                isOnTarget={parseFloat(kpiData.indicators.antibioticProphylaxis.rate) >= 100}
              />
              <SummaryCard
                title="PDF Enviado"
                value={`${kpiData.indicators.pdfEmailSent.rate || 0}%`}
                subtitle={`Meta: 100%`}
                icon="📧"
                isOnTarget={parseFloat(kpiData.indicators.pdfEmailSent.rate) >= 100}
              />
              <SummaryCard
                title="Fast Track"
                value={`${kpiData.indicators.fastTrackProtocol.rate || 0}%`}
                subtitle={`Meta: 70%`}
                icon="⚡"
                isOnTarget={parseFloat(kpiData.indicators.fastTrackProtocol.rate) >= 70}
              />
            </div>

            {/* KPI Cards con gráficos de tendencia individuales */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Objetivo 1: Protocolo de Reposición */}
              <KPICardWithTrend
                indicator={kpiData.indicators.bloodReplacementProtocol}
                colorScheme="blue"
                trendData={kpiData.trend}
                trendKey="bloodReplacementRate"
                nonComplianceReasons={kpiData.nonComplianceReasons.bloodReplacement}
                description="Mide la aplicación del protocolo de reposición de hemoderivados basado en objetivos durante el trasplante hepático. El protocolo establece umbrales específicos para transfusión de GR, PFC, plaquetas y crioprecipitados."
              />

              {/* Objetivo 2: Protocolo de Profilaxis ATB */}
              <KPICardWithTrend
                indicator={kpiData.indicators.antibioticProphylaxis}
                colorScheme="green"
                trendData={kpiData.trend}
                trendKey="antibioticRate"
                nonComplianceReasons={kpiData.nonComplianceReasons.antibiotic}
                description="Evalúa el cumplimiento del protocolo de profilaxis antibiótica según las guías institucionales. Incluye la administración oportuna de antibióticos antes de la incisión y su mantenimiento durante el procedimiento."
              />

              {/* Objetivo 3: Envío de PDF por Email */}
              <KPICardWithTrend
                indicator={kpiData.indicators.pdfEmailSent}
                colorScheme="purple"
                trendData={kpiData.trend}
                trendKey="pdfSentRate"
                isPdfIndicator={true}
                description="Registra si la ficha anestésica completa fue enviada por correo electrónico al equipo de trasplante dentro de las 24 horas posteriores al procedimiento. Fundamental para la continuidad del cuidado."
              />

              {/* Objetivo 5: Protocolo Fast Track */}
              <KPICardWithTrend
                indicator={kpiData.indicators.fastTrackProtocol}
                colorScheme="amber"
                trendData={kpiData.trend}
                trendKey="fastTrackRate"
                nonComplianceReasons={kpiData.nonComplianceReasons.fastTrack}
                description="Mide la aplicación del protocolo de extubación temprana (Fast Track). El objetivo es extubar al paciente en quirófano o dentro de las primeras 6 horas post-trasplante, cuando las condiciones clínicas lo permitan."
              />
            </div>

            {/* Gráfico de tendencia combinado */}
            {kpiData.trend && kpiData.trend.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Comparativa de Tendencias</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <CombinedTrendChart data={kpiData.trend} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gráfico de volumen de trasplantes */}
            {kpiData.trend && kpiData.trend.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Volumen de Trasplantes por Mes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <VolumeChart data={kpiData.trend} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Monthly Breakdown */}
            {kpiData.trend && kpiData.trend.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Detalle Mensual</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-dark-400">
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Mes
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Trasplantes
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Prot. Reposición
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Profilaxis ATB
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                            PDF Enviado
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Fast Track
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-400">
                        {kpiData.trend.map((item) => (
                          <tr key={item.month} className="hover:bg-dark-500 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">
                              {formatMonth(item.month)}
                            </td>
                            <td className="px-4 py-3 text-sm text-center font-medium text-gray-100">
                              {item.total}
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              <RateCell value={item.bloodReplacementRate} target={80} />
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              <RateCell value={item.antibioticRate} target={100} />
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              <RateCell value={item.pdfSentRate} target={100} />
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              <RateCell value={item.fastTrackRate} target={70} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Tab: KPIs Clínicos */}
        {activeTab === 'clinical' && clinicalData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <ClinicalStatCard
                title="Total Trasplantes"
                value={clinicalData.summary.totalTransplants}
                icon="🫀"
                color="surgical"
              />
              <ClinicalStatCard
                title="Pacientes Trasplantados"
                value={clinicalData.summary.totalPatientsTransplanted}
                icon="👥"
                color="blue"
              />
              <ClinicalStatCard
                title="En Lista de Espera"
                value={clinicalData.summary.patientsInList}
                icon="⏳"
                color="amber"
              />
              <ClinicalStatCard
                title="Retrasplantes"
                value={`${clinicalData.transplantMetrics.retransplants.rate}%`}
                subtitle={`(${clinicalData.transplantMetrics.retransplants.count})`}
                icon="🔄"
                color="purple"
              />
              <ClinicalStatCard
                title="Hepato-Renal"
                value={`${clinicalData.transplantMetrics.hepatoRenal.rate}%`}
                subtitle={`(${clinicalData.transplantMetrics.hepatoRenal.count})`}
                icon="🫘"
                color="green"
              />
              <ClinicalStatCard
                title="MELD Promedio"
                value={clinicalData.severity.meld.avg || '-'}
                subtitle={`(n=${clinicalData.severity.meld.count})`}
                icon="📈"
                color="red"
              />
            </div>

            {/* Métricas de Trasplante */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Duración de Cirugía */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>⏱️</span> Duración de Cirugía
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <MetricRow
                      label="Promedio"
                      value={clinicalData.transplantMetrics.duration.avgHours ? `${clinicalData.transplantMetrics.duration.avgHours}h` : '-'}
                    />
                    <MetricRow
                      label="Mediana"
                      value={clinicalData.transplantMetrics.duration.median ? `${Math.round(clinicalData.transplantMetrics.duration.median / 60)}h` : '-'}
                    />
                    <MetricRow
                      label="Rango"
                      value={clinicalData.transplantMetrics.duration.min && clinicalData.transplantMetrics.duration.max
                        ? `${Math.round(clinicalData.transplantMetrics.duration.min / 60)}h - ${Math.round(clinicalData.transplantMetrics.duration.max / 60)}h`
                        : '-'}
                    />
                    <p className="text-xs text-gray-500 pt-2 border-t border-dark-400">
                      Datos de {clinicalData.transplantMetrics.duration.count} trasplantes
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Isquemia Fría */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>❄️</span> Isquemia Fría
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <MetricRow
                      label="Promedio"
                      value={clinicalData.transplantMetrics.coldIschemia.avgHours ? `${clinicalData.transplantMetrics.coldIschemia.avgHours}h` : '-'}
                    />
                    <MetricRow
                      label="Mediana"
                      value={clinicalData.transplantMetrics.coldIschemia.median ? `${Math.round(clinicalData.transplantMetrics.coldIschemia.median / 60)}h` : '-'}
                    />
                    <MetricRow
                      label="Rango"
                      value={clinicalData.transplantMetrics.coldIschemia.min && clinicalData.transplantMetrics.coldIschemia.max
                        ? `${Math.round(clinicalData.transplantMetrics.coldIschemia.min / 60)}h - ${Math.round(clinicalData.transplantMetrics.coldIschemia.max / 60)}h`
                        : '-'}
                    />
                    <p className="text-xs text-gray-500 pt-2 border-t border-dark-400">
                      Datos de {clinicalData.transplantMetrics.coldIschemia.count} trasplantes
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Isquemia Caliente */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>🔥</span> Isquemia Caliente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <MetricRow
                      label="Promedio"
                      value={clinicalData.transplantMetrics.warmIschemia.avg ? `${clinicalData.transplantMetrics.warmIschemia.avg} min` : '-'}
                    />
                    <MetricRow
                      label="Mediana"
                      value={clinicalData.transplantMetrics.warmIschemia.median ? `${clinicalData.transplantMetrics.warmIschemia.median} min` : '-'}
                    />
                    <MetricRow
                      label="Rango"
                      value={clinicalData.transplantMetrics.warmIschemia.min && clinicalData.transplantMetrics.warmIschemia.max
                        ? `${clinicalData.transplantMetrics.warmIschemia.min} - ${clinicalData.transplantMetrics.warmIschemia.max} min`
                        : '-'}
                    />
                    <p className="text-xs text-gray-500 pt-2 border-t border-dark-400">
                      Datos de {clinicalData.transplantMetrics.warmIschemia.count} trasplantes
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Demografía y Severidad */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Demografía */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>👤</span> Demografía
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    {/* Edad */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Edad al Trasplante</h4>
                      <div className="space-y-2">
                        <MetricRow label="Promedio" value={clinicalData.demographics.age.avg ? `${clinicalData.demographics.age.avg} años` : '-'} />
                        <MetricRow label="Mediana" value={clinicalData.demographics.age.median ? `${clinicalData.demographics.age.median} años` : '-'} />
                        <MetricRow label="Rango" value={clinicalData.demographics.age.min && clinicalData.demographics.age.max ? `${clinicalData.demographics.age.min} - ${clinicalData.demographics.age.max} años` : '-'} />
                      </div>
                    </div>

                    {/* Sexo */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Distribución por Sexo</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-400">Masculino</span>
                          <span className="text-sm font-medium text-blue-400">{clinicalData.demographics.sex.M} ({((clinicalData.demographics.sex.M / clinicalData.summary.totalTransplants) * 100).toFixed(0)}%)</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-400">Femenino</span>
                          <span className="text-sm font-medium text-pink-400">{clinicalData.demographics.sex.F} ({((clinicalData.demographics.sex.F / clinicalData.summary.totalTransplants) * 100).toFixed(0)}%)</span>
                        </div>
                        {clinicalData.demographics.sex.noData > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-400">Sin datos</span>
                            <span className="text-sm font-medium text-gray-500">{clinicalData.demographics.sex.noData}</span>
                          </div>
                        )}
                      </div>
                      {/* Mini bar chart */}
                      <div className="mt-3 h-3 rounded-full overflow-hidden bg-dark-400 flex">
                        <div className="bg-blue-500" style={{ width: `${(clinicalData.demographics.sex.M / clinicalData.summary.totalTransplants) * 100}%` }} />
                        <div className="bg-pink-500" style={{ width: `${(clinicalData.demographics.sex.F / clinicalData.summary.totalTransplants) * 100}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Grupo Sanguíneo */}
                  <div className="mt-6 pt-4 border-t border-dark-400">
                    <h4 className="text-sm font-medium text-gray-400 mb-3">Grupo Sanguíneo</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(clinicalData.demographics.bloodGroup)
                        .filter(([_, count]) => count > 0)
                        .sort((a, b) => b[1] - a[1])
                        .map(([group, count]) => (
                          <span key={group} className="px-3 py-1.5 text-sm bg-red-500/20 text-red-400 rounded-lg">
                            {group}: {count} ({((count / clinicalData.summary.totalTransplants) * 100).toFixed(0)}%)
                          </span>
                        ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Severidad */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>📊</span> Severidad
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    {/* MELD */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Score MELD</h4>
                      <div className="space-y-2">
                        <MetricRow label="Promedio" value={clinicalData.severity.meld.avg || '-'} />
                        <MetricRow label="Mediana" value={clinicalData.severity.meld.median || '-'} />
                        <MetricRow label="Rango" value={clinicalData.severity.meld.min && clinicalData.severity.meld.max ? `${clinicalData.severity.meld.min} - ${clinicalData.severity.meld.max}` : '-'} />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">n = {clinicalData.severity.meld.count}</p>
                    </div>

                    {/* Child-Pugh */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Child-Pugh</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-400">Child A</span>
                          <span className="text-sm font-medium text-green-400">{clinicalData.severity.childPugh.A}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-400">Child B</span>
                          <span className="text-sm font-medium text-yellow-400">{clinicalData.severity.childPugh.B}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-400">Child C</span>
                          <span className="text-sm font-medium text-red-400">{clinicalData.severity.childPugh.C}</span>
                        </div>
                        {clinicalData.severity.childPugh.NO_EVALUADO > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-400">Sin evaluar</span>
                            <span className="text-sm font-medium text-gray-500">{clinicalData.severity.childPugh.NO_EVALUADO}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* MELD-Na */}
                  {clinicalData.severity.meldNa.count > 0 && (
                    <div className="mt-6 pt-4 border-t border-dark-400">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">MELD-Na</h4>
                      <div className="flex gap-6">
                        <MetricRow label="Promedio" value={clinicalData.severity.meldNa.avg || '-'} inline />
                        <MetricRow label="Rango" value={clinicalData.severity.meldNa.min && clinicalData.severity.meldNa.max ? `${clinicalData.severity.meldNa.min} - ${clinicalData.severity.meldNa.max}` : '-'} inline />
                        <span className="text-xs text-gray-500">(n={clinicalData.severity.meldNa.count})</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Etiologías */}
            {clinicalData.etiologies.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>🔬</span> Etiologías Principales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {clinicalData.etiologies.map((etiology, idx) => (
                      <div key={etiology.name} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-500 w-6">{idx + 1}.</span>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-300">{etiology.name}</span>
                            <span className="text-sm font-medium text-surgical-400">{etiology.count} ({etiology.percentage}%)</span>
                          </div>
                          <div className="h-2 bg-dark-400 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-surgical-500 transition-all"
                              style={{ width: `${etiology.percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lista de Espera */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span>⏳</span> Lista de Espera (Último Año)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* KPIs del último año */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="text-center p-4 bg-dark-500 rounded-lg border border-surgical-600">
                    <p className="text-4xl font-bold text-surgical-400">{clinicalData.waitingList.addedLastYear || 0}</p>
                    <p className="text-sm text-gray-400 mt-1">Ingresados a lista</p>
                  </div>
                  <div className="text-center p-4 bg-dark-500 rounded-lg border border-green-600">
                    <p className="text-4xl font-bold text-green-400">{clinicalData.waitingList.transplantedLastYear || 0}</p>
                    <p className="text-sm text-gray-400 mt-1">Trasplantados</p>
                  </div>
                </div>

                {/* Tiempo en lista */}
                <p className="text-sm text-gray-300 mb-3">Tiempo en lista (pacientes trasplantados)</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-dark-600 rounded-lg">
                    <p className="text-2xl font-bold text-surgical-400">{clinicalData.waitingList.avgWaitingDays || '-'}</p>
                    <p className="text-xs text-gray-400 mt-1">Promedio (días)</p>
                  </div>
                  <div className="text-center p-3 bg-dark-600 rounded-lg">
                    <p className="text-2xl font-bold text-blue-400">{clinicalData.waitingList.medianWaitingDays || '-'}</p>
                    <p className="text-xs text-gray-400 mt-1">Mediana (días)</p>
                  </div>
                  <div className="text-center p-3 bg-dark-600 rounded-lg">
                    <p className="text-2xl font-bold text-green-400">{clinicalData.waitingList.minWaitingDays || '-'}</p>
                    <p className="text-xs text-gray-400 mt-1">Mínimo (días)</p>
                  </div>
                  <div className="text-center p-3 bg-dark-600 rounded-lg">
                    <p className="text-2xl font-bold text-amber-400">{clinicalData.waitingList.maxWaitingDays || '-'}</p>
                    <p className="text-xs text-gray-400 mt-1">Máximo (días)</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-4 text-center">
                  Basado en {clinicalData.waitingList.dataCount} pacientes con datos de admisión y trasplante
                </p>
              </CardContent>
            </Card>

            {/* Tendencia Anual */}
            {clinicalData.yearlyTrend.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>📈</span> Tendencia Anual
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <Bar
                      data={{
                        labels: clinicalData.yearlyTrend.map(y => y.year),
                        datasets: [
                          {
                            label: 'Total Trasplantes',
                            data: clinicalData.yearlyTrend.map(y => y.total),
                            backgroundColor: 'rgba(0, 160, 160, 0.6)',
                            borderColor: '#00a0a0',
                            borderWidth: 1,
                            borderRadius: 4,
                          },
                          {
                            label: 'Retrasplantes',
                            data: clinicalData.yearlyTrend.map(y => y.retransplants),
                            backgroundColor: 'rgba(168, 85, 247, 0.6)',
                            borderColor: '#a855f7',
                            borderWidth: 1,
                            borderRadius: 4,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top',
                            labels: { color: '#9ca3af', usePointStyle: true },
                          },
                          tooltip: {
                            backgroundColor: '#1f2937',
                            titleColor: '#f3f4f6',
                            bodyColor: '#d1d5db',
                            borderColor: '#374151',
                            borderWidth: 1,
                          },
                        },
                        scales: {
                          x: {
                            grid: { display: false },
                            ticks: { color: '#9ca3af' },
                          },
                          y: {
                            beginAtZero: true,
                            grid: { color: '#374151' },
                            ticks: { color: '#9ca3af', stepSize: 5 },
                          },
                        },
                      }}
                    />
                  </div>
                  {/* Tabla de datos anuales */}
                  <div className="mt-6 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-dark-400">
                          <th className="px-4 py-2 text-left text-gray-400">Año</th>
                          <th className="px-4 py-2 text-center text-gray-400">Total</th>
                          <th className="px-4 py-2 text-center text-gray-400">Retrasplantes</th>
                          <th className="px-4 py-2 text-center text-gray-400">Hepato-Renal</th>
                          <th className="px-4 py-2 text-center text-gray-400">MELD Prom.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-400">
                        {clinicalData.yearlyTrend.map(y => (
                          <tr key={y.year} className="hover:bg-dark-500">
                            <td className="px-4 py-2 font-medium text-gray-200">{y.year}</td>
                            <td className="px-4 py-2 text-center text-surgical-400 font-medium">{y.total}</td>
                            <td className="px-4 py-2 text-center text-purple-400">{y.retransplants} ({y.retransplantRate}%)</td>
                            <td className="px-4 py-2 text-center text-green-400">{y.hepatoRenal} ({y.hepatoRenalRate}%)</td>
                            <td className="px-4 py-2 text-center text-gray-300">{y.avgMeld || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Mensaje si no hay datos clínicos */}
        {activeTab === 'clinical' && !clinicalData && !loading && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 text-center">
            <span className="text-3xl">📊</span>
            <h3 className="text-lg font-medium text-yellow-400 mt-2">Sin datos clínicos</h3>
            <p className="text-sm text-gray-400 mt-1">
              No hay datos de trasplantes disponibles para mostrar KPIs clínicos.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

// Helper functions
function formatMonth(monthStr) {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('es-UY', { year: 'numeric', month: 'short' });
}

// Components
function SummaryCard({ title, value, subtitle, icon, isOnTarget }) {
  return (
    <div className={`border rounded-lg p-4 backdrop-blur-sm ${
      isOnTarget === undefined
        ? 'bg-dark-500/50 border-dark-300'
        : isOnTarget
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-yellow-500/10 border-yellow-500/30'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-400">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${
            isOnTarget === undefined
              ? 'text-surgical-400'
              : isOnTarget
                ? 'text-green-400'
                : 'text-yellow-400'
          }`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className="text-2xl opacity-50">{icon}</div>
      </div>
    </div>
  );
}

function KPICardWithTrend({ indicator, colorScheme, trendData, trendKey, isPdfIndicator = false, nonComplianceReasons = [], description = '' }) {
  const colors = {
    blue: { main: '#3b82f6', light: 'rgba(59, 130, 246, 0.2)', text: 'text-blue-400' },
    green: { main: '#22c55e', light: 'rgba(34, 197, 94, 0.2)', text: 'text-green-400' },
    purple: { main: '#a855f7', light: 'rgba(168, 85, 247, 0.2)', text: 'text-purple-400' },
    amber: { main: '#f59e0b', light: 'rgba(245, 158, 11, 0.2)', text: 'text-amber-400' },
  };

  const color = colors[colorScheme] || colors.blue;
  const rate = parseFloat(indicator.rate) || 0;
  const target = indicator.target;
  const isOnTarget = rate >= target;

  // Badge de origen de datos
  const dataSourceBadge = {
    manual: { text: 'Dato Manual', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    automated: { text: 'Automático', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
    pending: { text: 'Pendiente', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
    none: { text: 'Sin datos', className: 'bg-gray-500/20 text-gray-500 border-gray-500/30' },
  };

  const sourceBadge = dataSourceBadge[indicator.dataSource] || null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg">{indicator.name}</CardTitle>
          <div className="flex items-center gap-2">
            {sourceBadge && (
              <span className={`text-xs px-2 py-1 rounded border ${sourceBadge.className}`}>
                {sourceBadge.text}
              </span>
            )}
            <span className="text-xs px-2 py-1 rounded bg-dark-400 text-gray-400">{indicator.objective}</span>
          </div>
        </div>
        {description && (
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
        )}
        {indicator.note && (
          <p className="text-xs text-amber-500/80 mt-1 italic">{indicator.note}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Métricas principales */}
        <div className="grid grid-cols-2 gap-4">
          {/* Gauge */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-28 h-28">
              <Doughnut
                data={{
                  datasets: [{
                    data: [rate, 100 - rate],
                    backgroundColor: [
                      isOnTarget ? '#22c55e' : color.main,
                      '#374151',
                    ],
                    borderWidth: 0,
                  }],
                }}
                options={{
                  cutout: '70%',
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false },
                  },
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className={`text-xl font-bold ${isOnTarget ? 'text-green-400' : color.text}`}>
                  {rate}%
                </span>
                <span className="text-xs text-gray-500">Meta: {target}%</span>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col justify-center space-y-1">
            {isPdfIndicator ? (
              <>
                <DetailRow label="Enviados" value={indicator.sent} color="text-green-400" />
                <DetailRow label="No enviados" value={indicator.notSent} color="text-gray-400" />
                <DetailRow label="Total" value={indicator.totalEvaluated} color="text-gray-300" />
              </>
            ) : (
              <>
                <DetailRow label="Aplicado" value={indicator.applied} color="text-green-400" />
                <DetailRow label="No aplicado" value={indicator.notApplied} color="text-red-400" />
                <DetailRow label="Sin evaluar" value={indicator.notEvaluated} color="text-gray-400" />
                <DetailRow label="Evaluados" value={indicator.totalEvaluated} color="text-gray-300" />
              </>
            )}
          </div>
        </div>

        {/* Gráfico de tendencia individual */}
        {trendData && trendData.length > 1 && (
          <div className="pt-2 border-t border-dark-400">
            <p className="text-xs text-gray-400 mb-2">Tendencia mensual</p>
            <div className="h-32">
              <IndividualTrendChart
                data={trendData}
                dataKey={trendKey}
                color={color.main}
                lightColor={color.light}
                target={target}
              />
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Progreso hacia meta</span>
            <span>{Math.min(100, Math.round((rate / target) * 100))}%</span>
          </div>
          <div className="h-2 bg-dark-400 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${isOnTarget ? 'bg-green-500' : ''}`}
              style={{
                width: `${Math.min(100, (rate / target) * 100)}%`,
                backgroundColor: isOnTarget ? undefined : color.main
              }}
            />
          </div>
        </div>

        {/* Razones de no cumplimiento */}
        {nonComplianceReasons && nonComplianceReasons.length > 0 && (
          <div className="pt-2 border-t border-dark-400">
            <p className="text-xs text-gray-400 mb-2">Razones de no cumplimiento ({nonComplianceReasons.length})</p>
            <div className="max-h-24 overflow-y-auto space-y-1">
              {nonComplianceReasons.slice(0, 5).map((reason, i) => (
                <p key={i} className="text-xs text-gray-500 bg-dark-500 rounded px-2 py-1 truncate" title={reason}>
                  {reason}
                </p>
              ))}
              {nonComplianceReasons.length > 5 && (
                <p className="text-xs text-gray-500 italic">
                  +{nonComplianceReasons.length - 5} más...
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value, color }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-400">{label}</span>
      <span className={`text-sm font-medium ${color}`}>{value}</span>
    </div>
  );
}

function RateCell({ value, target }) {
  if (value === null || value === undefined) {
    return <span className="text-gray-500">-</span>;
  }

  const numValue = parseFloat(value);
  const isOnTarget = numValue >= target;

  return (
    <span className={`font-medium ${isOnTarget ? 'text-green-400' : 'text-yellow-400'}`}>
      {value}%
    </span>
  );
}

function IndividualTrendChart({ data, dataKey, color, lightColor, target }) {
  const chartData = {
    labels: data.map((d) => {
      const [year, month] = d.month.split('-');
      return `${month}/${year.slice(2)}`;
    }),
    datasets: [
      {
        data: data.map((d) => parseFloat(d[dataKey]) || null),
        borderColor: color,
        backgroundColor: lightColor,
        tension: 0.3,
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1f2937',
        titleColor: '#f3f4f6',
        bodyColor: '#d1d5db',
        borderColor: '#374151',
        borderWidth: 1,
        callbacks: {
          label: (context) => `${context.raw}%`,
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: { display: false },
        ticks: {
          color: '#6b7280',
          font: { size: 9 },
          maxRotation: 0,
        },
      },
      y: {
        min: 0,
        max: 100,
        grid: {
          color: '#374151',
          drawBorder: false,
        },
        ticks: {
          color: '#6b7280',
          font: { size: 9 },
          stepSize: 50,
          callback: (value) => value + '%',
        },
      },
    },
  };

  return <Line data={chartData} options={options} />;
}

function CombinedTrendChart({ data }) {
  const chartData = {
    labels: data.map((d) => formatMonth(d.month)),
    datasets: [
      {
        label: 'Prot. Reposición (Meta: 80%)',
        data: data.map((d) => parseFloat(d.bloodReplacementRate) || null),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
        fill: false,
      },
      {
        label: 'Profilaxis ATB (Meta: 100%)',
        data: data.map((d) => parseFloat(d.antibioticRate) || null),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.3,
        fill: false,
      },
      {
        label: 'PDF Enviado (Meta: 100%)',
        data: data.map((d) => parseFloat(d.pdfSentRate) || null),
        borderColor: '#a855f7',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        tension: 0.3,
        fill: false,
      },
      {
        label: 'Fast Track (Meta: 70%)',
        data: data.map((d) => parseFloat(d.fastTrackRate) || null),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.3,
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#9ca3af',
          usePointStyle: true,
          padding: 15,
          font: { size: 11 },
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: '#1f2937',
        titleColor: '#f3f4f6',
        bodyColor: '#d1d5db',
        borderColor: '#374151',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { color: '#374151' },
        ticks: { color: '#9ca3af' },
      },
      y: {
        min: 0,
        max: 100,
        grid: { color: '#374151' },
        ticks: {
          color: '#9ca3af',
          callback: (value) => value + '%',
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  return <Line data={chartData} options={options} />;
}

function VolumeChart({ data }) {
  const chartData = {
    labels: data.map((d) => formatMonth(d.month)),
    datasets: [
      {
        label: 'Trasplantes',
        data: data.map((d) => d.total),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: '#3b82f6',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1f2937',
        titleColor: '#f3f4f6',
        bodyColor: '#d1d5db',
        borderColor: '#374151',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af' },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#374151' },
        ticks: {
          color: '#9ca3af',
          stepSize: 1,
        },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
}

// Clinical KPIs Components
function ClinicalStatCard({ title, value, subtitle, icon, color = 'surgical' }) {
  const colorClasses = {
    surgical: 'bg-surgical-500/10 border-surgical-500/30 text-surgical-400',
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    green: 'bg-green-500/10 border-green-500/30 text-green-400',
    red: 'bg-red-500/10 border-red-500/30 text-red-400',
  };

  return (
    <div className={`border rounded-lg p-4 ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-xs text-gray-400 uppercase tracking-wider">{title}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function MetricRow({ label, value, inline = false }) {
  if (inline) {
    return (
      <span className="text-sm">
        <span className="text-gray-400">{label}:</span>{' '}
        <span className="font-medium text-gray-200">{value}</span>
      </span>
    );
  }
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-200">{value}</span>
    </div>
  );
}
