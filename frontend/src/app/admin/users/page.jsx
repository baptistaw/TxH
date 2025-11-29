'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';

export default function UsersManagement() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    specialty: '',
    phone: '',
    userRole: 'VIEWER',
    password: '',
    isActive: true,
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/');
      return;
    }

    if (user && user.role === 'ADMIN') {
      loadUsers();
    }
  }, [user, authLoading, router, searchTerm, roleFilter, activeFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = {
        search: searchTerm,
        role: roleFilter,
      };
      if (activeFilter !== '') {
        params.active = activeFilter;
      }
      const data = await adminApi.listUsers(params);
      setUsers(data.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      specialty: '',
      phone: '',
      userRole: 'VIEWER',
      password: '',
      isActive: true,
    });
    setShowModal(true);
  };

  const handleEdit = (userData) => {
    setEditingUser(userData);
    setFormData({
      name: userData.name,
      email: userData.email,
      specialty: userData.specialty || '',
      phone: userData.phone || '',
      userRole: userData.userRole,
      password: '',
      isActive: userData.isActive !== undefined ? userData.isActive : true,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingUser) {
        await adminApi.updateUser(editingUser.id, formData);
        alert('Usuario actualizado exitosamente');
      } else {
        if (!formData.password) {
          alert('La contraseña es requerida para crear un usuario');
          return;
        }
        await adminApi.createUser(formData);
        alert('Usuario creado exitosamente');
      }

      setShowModal(false);
      loadUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      alert(error.message || 'Error al guardar usuario');
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('¿Está seguro de eliminar este usuario?')) {
      return;
    }

    try {
      await adminApi.deleteUser(userId);
      alert('Usuario eliminado exitosamente');
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error.message || 'Error al eliminar usuario');
    }
  };

  if (authLoading || (loading && users.length === 0)) {
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
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Gestión de Usuarios</h1>
          <p className="text-gray-400 mt-1">Administrar usuarios del sistema</p>
        </div>

        {/* Filtros y búsqueda */}
        <Card>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full md:w-48 px-4 py-2 bg-dark-500 border border-dark-400 text-gray-300 rounded-lg focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
                >
                  <option value="">Todos los roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="ANESTESIOLOGO">Anestesiólogo</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>
              <div>
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className="w-full md:w-48 px-4 py-2 bg-dark-500 border border-dark-400 text-gray-300 rounded-lg focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
                >
                  <option value="">Todos los estados</option>
                  <option value="true">Activos</option>
                  <option value="false">Inactivos</option>
                </select>
              </div>
              <Button onClick={handleCreate}>+ Crear Usuario</Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de usuarios */}
        <Card>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-dark-400">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Especialidad
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actividad
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-400">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-dark-500 transition-colors">
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-100">{u.name}</div>
                        <div className="text-xs text-gray-500">ID: {u.id}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-300">
                        {u.email}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-300">
                        {u.specialty || '-'}
                      </td>
                      <td className="px-4 py-4">
                        <Badge
                          variant={
                            u.userRole === 'ADMIN'
                              ? 'danger'
                              : u.userRole === 'ANESTESIOLOGO'
                              ? 'info'
                              : 'default'
                          }
                        >
                          {u.userRole}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={u.isActive !== false ? 'success' : 'default'}>
                          {u.isActive !== false ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-400">
                        {u._count?.procedures || 0} proc. / {u._count?.preopEvaluations || 0} preop
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-medium space-x-3">
                        <button
                          onClick={() => handleEdit(u)}
                          className="text-surgical-400 hover:text-surgical-300 transition-colors"
                        >
                          Editar
                        </button>
                        {u.userRole !== 'ADMIN' && (
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            Eliminar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {users.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-gray-500">No se encontraron usuarios</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de creación/edición */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-dark-600 border border-dark-400 rounded-lg shadow-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-dark-400">
              <h3 className="text-lg font-semibold text-gray-100">
                {editingUser ? 'Editar Usuario' : 'Crear Usuario'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Nombre completo *
                </label>
                <Input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email *
                </label>
                <Input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Especialidad
                </label>
                <Input
                  type="text"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Teléfono
                </label>
                <Input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Rol *
                </label>
                <select
                  required
                  value={formData.userRole}
                  onChange={(e) => setFormData({ ...formData, userRole: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-500 border border-dark-400 text-gray-300 rounded-lg focus:ring-2 focus:ring-surgical-500"
                >
                  <option value="VIEWER">Viewer</option>
                  <option value="ANESTESIOLOGO">Anestesiólogo</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Estado *
                </label>
                <select
                  required
                  value={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                  className="w-full px-3 py-2 bg-dark-500 border border-dark-400 text-gray-300 rounded-lg focus:ring-2 focus:ring-surgical-500"
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Contraseña {!editingUser && '*'}
                </label>
                <Input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? 'Dejar en blanco para no cambiar' : ''}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingUser ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
