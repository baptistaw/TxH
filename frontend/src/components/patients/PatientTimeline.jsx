'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { searchApi } from '@/lib/api';
import Spinner from '@/components/ui/Spinner';

export default function PatientTimeline({ patientId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'transplant', 'procedure', 'preop'

  useEffect(() => {
    loadTimeline();
  }, [patientId]);

  const loadTimeline = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await searchApi.getPatientTimeline(patientId);
      setData(response);
    } catch (err) {
      setError(err.message || 'Error al cargar timeline');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
        <p className="text-red-400">{error}</p>
        <button onClick={loadTimeline} className="mt-2 text-sm text-surgical-400 hover:underline">
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Filter events
  const filteredEvents = data.timeline.filter(event => {
    if (filter === 'all') return true;
    return event.type === filter;
  });

  return (
    <div className="space-y-6">
      {/* Patient Header */}
      <div className="bg-dark-500 rounded-lg p-4 border border-dark-400">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-surgical-500/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-surgical-400">
                {data.patient.name?.charAt(0) || 'P'}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-100">{data.patient.name}</h2>
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <span>CI: {data.patient.id}</span>
                {data.patient.age && <span>{data.patient.age} años</span>}
                {data.patient.sex && (
                  <span>{data.patient.sex === 'M' ? 'Masculino' : data.patient.sex === 'F' ? 'Femenino' : 'Otro'}</span>
                )}
                {data.patient.bloodGroup && (
                  <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">
                    {data.patient.bloodGroup}
                  </span>
                )}
              </div>
            </div>
          </div>
          {data.patient.transplanted && (
            <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium">
              Trasplantado
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          label="Total Eventos"
          value={data.stats.totalEvents}
          icon="📅"
        />
        <StatCard
          label="Evaluaciones"
          value={data.stats.preops}
          icon="🩺"
          color="purple"
        />
        <StatCard
          label="Procedimientos"
          value={data.stats.procedures}
          icon="🏥"
          color="green"
        />
        <StatCard
          label="Trasplantes"
          value={data.stats.transplants}
          icon="🫀"
          color="red"
        />
        <StatCard
          label="Días en Lista"
          value={data.stats.daysSinceAdmission || '-'}
          icon="⏱️"
          color="blue"
        />
      </div>

      {/* Filter buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-400 mr-2">Filtrar:</span>
        {[
          { key: 'all', label: 'Todos', icon: '📋' },
          { key: 'transplant', label: 'Trasplantes', icon: '🫀' },
          { key: 'procedure', label: 'Procedimientos', icon: '🏥' },
          { key: 'preop', label: 'Evaluaciones', icon: '🩺' },
          { key: 'admission', label: 'Admisión', icon: '📅' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
              filter === f.key
                ? 'bg-surgical-500 text-white'
                : 'bg-dark-500 text-gray-400 hover:bg-dark-400 hover:text-gray-300'
            }`}
          >
            <span>{f.icon}</span>
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-dark-400" />

        {/* Events */}
        <div className="space-y-0">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay eventos del tipo seleccionado
            </div>
          ) : (
            filteredEvents.map((event, index) => (
              <TimelineEvent
                key={event.id}
                event={event}
                isFirst={index === 0}
                isLast={index === filteredEvents.length - 1}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Stat Card component
function StatCard({ label, value, icon, color = 'surgical' }) {
  const colorClasses = {
    surgical: 'bg-surgical-500/10 text-surgical-400 border-surgical-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    green: 'bg-green-500/10 text-green-400 border-green-500/30',
    red: 'bg-red-500/10 text-red-400 border-red-500/30',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  };

  return (
    <div className={`rounded-lg p-3 border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs opacity-70">{label}</p>
        </div>
      </div>
    </div>
  );
}

// Timeline Event component
function TimelineEvent({ event, isFirst, isLast }) {
  const [expanded, setExpanded] = useState(false);

  const colorMap = {
    admission: { bg: 'bg-blue-500', ring: 'ring-blue-500/30' },
    preop: { bg: 'bg-purple-500', ring: 'ring-purple-500/30' },
    procedure: { bg: 'bg-green-500', ring: 'ring-green-500/30' },
    transplant: { bg: 'bg-red-500', ring: 'ring-red-500/30' },
  };

  const colors = colorMap[event.type] || colorMap.procedure;

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-UY', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('es-UY', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="relative pl-14 pb-8">
      {/* Node */}
      <div
        className={`absolute left-4 w-5 h-5 rounded-full ${colors.bg} ring-4 ${colors.ring} z-10 flex items-center justify-center`}
      >
        {event.type === 'transplant' && <span className="text-xs">🫀</span>}
      </div>

      {/* Content */}
      <div
        className={`bg-dark-500 rounded-lg border border-dark-400 overflow-hidden transition-all ${
          event.linkTo ? 'hover:border-surgical-500/50 cursor-pointer' : ''
        }`}
      >
        {/* Header */}
        <div
          className="p-4"
          onClick={() => event.linkTo && setExpanded(!expanded)}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{event.icon}</span>
              <div>
                <h4 className="font-medium text-gray-100">{event.title}</h4>
                {event.description && (
                  <p className="text-sm text-gray-400">{event.description}</p>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-medium text-gray-300">{formatDate(event.date)}</p>
              {event.date && <p className="text-xs text-gray-500">{formatTime(event.date)}</p>}
              {event.legacy && (
                <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">
                  Histórico
                </span>
              )}
            </div>
          </div>

          {/* Quick details */}
          {event.details && (
            <div className="mt-3 flex flex-wrap gap-2">
              {event.details.meld && (
                <span className="px-2 py-1 text-xs bg-dark-400 text-gray-300 rounded">
                  MELD: {event.details.meld}
                </span>
              )}
              {event.details.child && (
                <span className="px-2 py-1 text-xs bg-dark-400 text-gray-300 rounded">
                  Child: {event.details.child}
                </span>
              )}
              {event.details.location && (
                <span className="px-2 py-1 text-xs bg-dark-400 text-gray-300 rounded">
                  {event.details.location}
                </span>
              )}
              {event.details.duration && (
                <span className="px-2 py-1 text-xs bg-dark-400 text-gray-300 rounded">
                  {event.details.duration.hours}h {event.details.duration.minutes}min
                </span>
              )}
              {event.details.clinician && (
                <span className="px-2 py-1 text-xs bg-dark-400 text-gray-300 rounded">
                  Dr. {event.details.clinician}
                </span>
              )}
              {event.details.asa && (
                <span className="px-2 py-1 text-xs bg-dark-400 text-gray-300 rounded">
                  ASA {event.details.asa}
                </span>
              )}
            </div>
          )}

          {/* KPIs for transplants */}
          {event.type === 'transplant' && event.details && (
            <div className="mt-3 pt-3 border-t border-dark-400">
              <p className="text-xs text-gray-500 mb-2">Indicadores de Calidad:</p>
              <div className="flex flex-wrap gap-2">
                <KPIBadge
                  label="Prot. Reposición"
                  value={event.details.bloodReplacementProtocol}
                />
                <KPIBadge
                  label="Profilaxis ATB"
                  value={event.details.antibioticProphylaxisProtocol}
                />
                <KPIBadge
                  label="Fast Track"
                  value={event.details.fastTrackProtocol}
                />
              </div>
            </div>
          )}
        </div>

        {/* Expanded content with team */}
        {expanded && event.details?.team && event.details.team.length > 0 && (
          <div className="px-4 pb-4 border-t border-dark-400 pt-3">
            <p className="text-xs text-gray-500 mb-2">Equipo:</p>
            <div className="flex flex-wrap gap-2">
              {event.details.team.map((member, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 text-xs bg-dark-600 text-gray-300 rounded"
                >
                  {member.role}: {member.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Link to detail */}
        {event.linkTo && (
          <Link
            href={event.linkTo}
            className="block px-4 py-2 bg-dark-600 text-sm text-surgical-400 hover:text-surgical-300 transition-colors border-t border-dark-400"
          >
            Ver detalle →
          </Link>
        )}
      </div>
    </div>
  );
}

// KPI Badge component
function KPIBadge({ label, value }) {
  const getStyle = () => {
    if (value === true) return 'bg-green-500/20 text-green-400';
    if (value === false) return 'bg-red-500/20 text-red-400';
    return 'bg-gray-500/20 text-gray-400';
  };

  const getText = () => {
    if (value === true) return 'Sí';
    if (value === false) return 'No';
    return 'N/E';
  };

  return (
    <span className={`px-2 py-1 text-xs rounded ${getStyle()}`}>
      {label}: {getText()}
    </span>
  );
}
