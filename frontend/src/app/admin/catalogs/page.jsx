'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { catalogsApi } from '@/lib/api';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';

export default function CatalogsManagement() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Estados principales
  const [catalogs, setCatalogs] = useState([]);
  const [selectedCatalog, setSelectedCatalog] = useState(null);
  const [catalogItems, setCatalogItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ code: '', label: '', description: '', order: 0, active: true });

  // Verificar autenticación
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/');
      return;
    }

    if (user && user.role === 'ADMIN') {
      loadCatalogs();
    }
  }, [user, authLoading, router]);

  // Cargar lista de catálogos disponibles
  const loadCatalogs = async () => {
    try {
      setLoading(true);
      const response = await catalogsApi.list();
      setCatalogs(response.data || []);

      // Seleccionar el primer catálogo por defecto
      if (response.data && response.data.length > 0) {
        loadCatalogItems(response.data[0]);
      }
    } catch (error) {
      console.error('Error loading catalogs:', error);
      alert('Error al cargar catálogos');
    } finally {
      setLoading(false);
    }
  };

  // Cargar items de un catálogo específico
  const loadCatalogItems = async (catalog) => {
    try {
      setItemsLoading(true);
      setSelectedCatalog(catalog);

      // En modo admin, incluir items inactivos
      const response = await catalogsApi.getByName(catalog.name, { includeInactive: true });
      setCatalogItems(response.items || []);
    } catch (error) {
      console.error('Error loading catalog items:', error);
      alert('Error al cargar items del catálogo');
    } finally {
      setItemsLoading(false);
    }
  };

  // Abrir modal para crear nuevo item
  const handleCreate = () => {
    setEditing(null);
    setFormData({
      code: '',
      label: '',
      description: '',
      order: catalogItems.length,
      active: true
    });
    setShowModal(true);
  };

  // Abrir modal para editar item
  const handleEdit = (item) => {
    setEditing(item);
    setFormData({
      code: item.code,
      label: item.label,
      description: item.description || '',
      order: item.order,
      active: item.active
    });
    setShowModal(true);
  };

  // Guardar item (crear o actualizar)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedCatalog) {
      alert('No hay catálogo seleccionado');
      return;
    }

    try {
      if (editing) {
        // Actualizar item existente
        await catalogsApi.updateItem(editing.id, formData);
        alert('Item actualizado exitosamente');
      } else {
        // Crear nuevo item
        await catalogsApi.createItem(selectedCatalog.id, formData);
        alert('Item creado exitosamente');
      }

      setShowModal(false);
      loadCatalogItems(selectedCatalog);
    } catch (error) {
      console.error('Error saving item:', error);
      alert(error.message || 'Error al guardar item');
    }
  };

  // Eliminar/desactivar item
  const handleDelete = async (item) => {
    if (!confirm('¿Está seguro de desactivar este elemento?')) {
      return;
    }

    try {
      await catalogsApi.deleteItem(item.id);
      alert('Item desactivado exitosamente');
      loadCatalogItems(selectedCatalog);
    } catch (error) {
      console.error('Error deleting item:', error);
      alert(error.message || 'Error al desactivar item');
    }
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  // Not authorized
  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-100">Gestión de Catálogos</h1>
            <p className="text-gray-400 mt-1">
              Administrar catálogos dinámicos del sistema
            </p>
          </div>
          <Link href="/admin">
            <Button variant="secondary">← Volver al Panel</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar con lista de catálogos */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Catálogos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {catalogs.map((catalog) => (
                  <button
                    key={catalog.id}
                    onClick={() => loadCatalogItems(catalog)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      selectedCatalog?.id === catalog.id
                        ? 'bg-surgical-900/30 border-2 border-surgical-500 text-surgical-300'
                        : 'bg-dark-500 border-2 border-transparent text-gray-300 hover:bg-dark-400'
                    }`}
                  >
                    <div className="font-medium">{catalog.label}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {catalog.name}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contenido principal - Items del catálogo */}
          <Card className="lg:col-span-3">
            {selectedCatalog ? (
              <>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>{selectedCatalog.label}</CardTitle>
                      <p className="text-sm text-gray-400 mt-1">
                        {selectedCatalog.description || 'Sin descripción'}
                      </p>
                    </div>
                    <Button onClick={handleCreate}>+ Agregar Item</Button>
                  </div>
                </CardHeader>

                <CardContent>
                  {itemsLoading ? (
                    <div className="flex justify-center py-12">
                      <Spinner />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-dark-400">
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Código
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Etiqueta
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Descripción
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Orden
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Estado
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-400">
                          {catalogItems.map((item) => (
                            <tr key={item.id} className="hover:bg-dark-500 transition-colors">
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-surgical-400">
                                {item.code}
                              </td>
                              <td className="px-4 py-4 text-sm font-medium text-gray-100">
                                {item.label}
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-400">
                                {item.description || '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-400">
                                {item.order}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <Badge variant={item.active ? 'success' : 'danger'}>
                                  {item.active ? 'Activo' : 'Inactivo'}
                                </Badge>
                              </td>
                              <td className="px-4 py-4 text-right text-sm font-medium space-x-3">
                                <button
                                  onClick={() => handleEdit(item)}
                                  className="text-surgical-400 hover:text-surgical-300 transition-colors"
                                >
                                  Editar
                                </button>
                                {item.active && (
                                  <button
                                    onClick={() => handleDelete(item)}
                                    className="text-red-400 hover:text-red-300 transition-colors"
                                  >
                                    Desactivar
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {catalogItems.length === 0 && (
                        <div className="text-center py-12">
                          <p className="text-gray-500">No hay items en este catálogo</p>
                          <Button onClick={handleCreate} className="mt-4">
                            + Agregar Primer Item
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </>
            ) : (
              <CardContent>
                <div className="text-center py-12">
                  <p className="text-gray-500">Selecciona un catálogo para ver sus items</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* Modal de creación/edición */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-dark-600 border border-dark-400 rounded-lg shadow-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-dark-400">
              <h3 className="text-lg font-semibold text-gray-100">
                {editing ? 'Editar Item' : 'Crear Item'}
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                {selectedCatalog?.label}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Código *
                </label>
                <Input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Ej: ASSE, M, I"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Identificador único del item (usado en la base de datos)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Etiqueta *
                </label>
                <Input
                  type="text"
                  required
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="Ej: ASSE, Masculino, ASA I"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Texto que se mostrará en la interfaz
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-dark-500 border border-dark-400 text-gray-300 rounded-lg focus:ring-2 focus:ring-surgical-500"
                  placeholder="Descripción opcional del item"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Orden
                </label>
                <Input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Orden de aparición en listas (menor número aparece primero)
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="h-4 w-4 text-surgical-600 focus:ring-surgical-500 border-dark-400 rounded bg-dark-500"
                />
                <label htmlFor="active" className="ml-2 block text-sm text-gray-300">
                  Activo
                </label>
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
                  {editing ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
