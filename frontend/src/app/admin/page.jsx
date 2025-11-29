'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi } from '@/lib/api';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/');
      return;
    }

    if (user && user.role === 'ADMIN') {
      loadStats();
    }
  }, [user, authLoading, router]);

  const loadStats = async () => {
    try {
      const data = await adminApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
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

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-100">Panel de Administración</h1>
            <p className="text-gray-400 mt-1">Gestión del sistema de registro TxH</p>
          </div>
        </div>

        {/* Estadísticas principales */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Usuarios"
              value={stats.users?.total || 0}
              subtitle={`${stats.users?.byRole?.admin || 0} admins, ${stats.users?.byRole?.anestesiologo || 0} anestesiólogos`}
              icon="👥"
              color="medical"
            />
            <StatCard
              title="Pacientes"
              value={stats.patients || 0}
              subtitle="Registrados en el sistema"
              icon="🏥"
              color="surgical"
            />
            <StatCard
              title="Casos de Trasplante"
              value={stats.cases || 0}
              subtitle="Trasplantes hepáticos"
              icon="🫀"
              color="danger"
            />
            <StatCard
              title="Evaluaciones Preop"
              value={stats.preops || 0}
              subtitle="Total de evaluaciones"
              icon="📋"
              color="warning"
            />
          </div>
        )}

        {/* Menú de gestión */}
        <Card>
          <CardHeader>
            <CardTitle>Gestión del Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AdminMenuCard
                title="Usuarios"
                description="Gestionar usuarios del sistema"
                icon="👥"
                href="/admin/users"
              />
              <AdminMenuCard
                title="Pacientes"
                description="Ver y buscar pacientes"
                icon="🏥"
                href="/admin/patients"
              />
              <AdminMenuCard
                title="Etiologías"
                description="Catálogo de etiologías"
                icon="🔬"
                href="/admin/catalogs?tab=etiologies"
              />
              <AdminMenuCard
                title="Antibióticos"
                description="Catálogo de antibióticos"
                icon="💊"
                href="/admin/catalogs?tab=antibiotics"
              />
              <AdminMenuCard
                title="Protocolos ATB"
                description="Protocolos de antibióticos"
                icon="📖"
                href="/admin/protocols"
              />
              <AdminMenuCard
                title="Otros Catálogos"
                description="Posiciones, locaciones, etc."
                icon="📝"
                href="/admin/catalogs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Casos por mes */}
        {stats?.casesByMonth && stats.casesByMonth.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Casos por Mes (Últimos 12 meses)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-dark-400">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Mes
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Casos
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-400">
                    {stats.casesByMonth.map((item, index) => (
                      <tr key={index} className="hover:bg-dark-500 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {new Date(item.month).toLocaleDateString('es-UY', {
                            year: 'numeric',
                            month: 'long',
                          })}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-surgical-400">
                          {item.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

function StatCard({ title, value, subtitle, icon, color }) {
  const colorClasses = {
    medical: 'bg-medical-500/10 border-medical-500/30',
    surgical: 'bg-surgical-500/10 border-surgical-500/30',
    danger: 'bg-red-500/10 border-red-500/30',
    warning: 'bg-yellow-500/10 border-yellow-500/30',
  };

  const textClasses = {
    medical: 'text-medical-400',
    surgical: 'text-surgical-400',
    danger: 'text-red-400',
    warning: 'text-yellow-400',
  };

  return (
    <div className={`${colorClasses[color]} border rounded-lg p-6 backdrop-blur-sm`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className={`text-3xl font-bold mt-2 ${textClasses[color]}`}>{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="text-4xl opacity-50">{icon}</div>
      </div>
    </div>
  );
}

function AdminMenuCard({ title, description, icon, href }) {
  return (
    <Link
      href={href}
      className="bg-dark-500 hover:bg-dark-400 border border-dark-300 rounded-lg p-4 transition-all hover:border-surgical-500/50 group"
    >
      <div className="flex items-start space-x-3">
        <div className="text-3xl group-hover:scale-110 transition-transform">{icon}</div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-100 group-hover:text-surgical-400 transition-colors">
            {title}
          </h3>
          <p className="text-sm text-gray-400 mt-1">{description}</p>
        </div>
      </div>
    </Link>
  );
}
