'use client';

import { useState, useEffect } from 'react';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { preopApi } from '@/lib/api';

const STUDY_TYPES = [
  { value: 'ECG', label: 'Electrocardiograma (ECG)' },
  { value: 'ECoCardio', label: 'Ecocardiograma' },
  { value: 'Tomografia', label: 'Tomografía' },
  { value: 'PEG', label: 'PEG' },
  { value: 'RxTx', label: 'Radiografía de Tórax' },
  { value: 'FuncionRespiratoria', label: 'Función Respiratoria' },
  { value: 'CACG', label: 'CACG' },
  { value: 'AngioTAC', label: 'AngioTAC Cardíaco' },
  { value: 'InformeLab', label: 'Informe de Laboratorio' },
  { value: 'Otro', label: 'Otro estudio' },
];

export default function PreopAttachments({ preopId, editable = true }) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);

  // Form state
  const [selectedFile, setSelectedFile] = useState(null);
  const [studyType, setStudyType] = useState('');
  const [studyDate, setStudyDate] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadAttachments();
  }, [preopId]);

  useEffect(() => {
    // Cleanup blob URL when modal closes
    return () => {
      if (viewingImage?.imageUrl) {
        URL.revokeObjectURL(viewingImage.imageUrl);
      }
    };
  }, [viewingImage]);

  const loadAttachments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/preop/${preopId}/attachments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setAttachments(data.data || []);
    } catch (error) {
      console.error('Error loading attachments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tamaño (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Tamaño máximo: 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!selectedFile || !studyType) {
      alert('Por favor seleccione un archivo y tipo de estudio');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', studyType);
      if (studyDate) formData.append('studyDate', studyDate);
      if (description) formData.append('description', description);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/preop/${preopId}/attachments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al subir archivo');
      }

      // Reset form
      setSelectedFile(null);
      setStudyType('');
      setStudyDate('');
      setDescription('');
      setShowUploadForm(false);

      // Reload attachments
      await loadAttachments();

      alert('Archivo subido exitosamente');
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error al subir archivo');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (attachmentId, fileName) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/preop/${preopId}/attachments/${attachmentId}/download`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al descargar archivo');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error al descargar archivo');
    }
  };

  const handleDelete = async (attachmentId) => {
    if (!confirm('¿Está seguro de eliminar este archivo?')) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/preop/${preopId}/attachments/${attachmentId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al eliminar archivo');
      }

      await loadAttachments();
      alert('Archivo eliminado');
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Error al eliminar archivo');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-UY');
  };

  const isImage = (fileName) => {
    if (!fileName) return false;
    const ext = fileName.toLowerCase().split('.').pop();
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext);
  };

  const handleViewImage = async (attachment) => {
    try {
      // Cargar la imagen con autenticación
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/preop/${preopId}/attachments/${attachment.id}/download`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al cargar imagen');
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);

      setViewingImage({
        ...attachment,
        imageUrl,
      });
    } catch (error) {
      console.error('Error loading image:', error);
      alert('Error al cargar la imagen');
    }
  };

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Estudios Complementarios</CardTitle>
          {editable && (
            <Button
              onClick={() => setShowUploadForm(!showUploadForm)}
              variant={showUploadForm ? 'secondary' : 'primary'}
            >
              {showUploadForm ? 'Cancelar' : '+ Subir Estudio'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* Upload Form */}
        {showUploadForm && editable && (
          <form onSubmit={handleUpload} className="border border-dark-400 rounded-lg p-4 bg-dark-500 space-y-4">
            <h3 className="text-lg font-medium text-gray-100">Subir Nuevo Estudio</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tipo de Estudio *
                </label>
                <select
                  value={studyType}
                  onChange={(e) => setStudyType(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                >
                  <option value="">Seleccionar...</option>
                  {STUDY_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Fecha del Estudio
                </label>
                <input
                  type="date"
                  value={studyDate}
                  onChange={(e) => setStudyDate(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Descripción / Hallazgos
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                placeholder="Descripción opcional de hallazgos..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Archivo * (PDF, JPG, PNG - máx. 10MB)
              </label>
              <input
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                required
                className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-surgical-500 file:text-white hover:file:bg-surgical-600"
              />
              {selectedFile && (
                <p className="text-sm text-gray-400 mt-1">
                  Seleccionado: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowUploadForm(false);
                  setSelectedFile(null);
                  setStudyType('');
                  setStudyDate('');
                  setDescription('');
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? 'Subiendo...' : 'Subir Archivo'}
              </Button>
            </div>
          </form>
        )}

        {/* Attachments List */}
        <div className="space-y-3">
          {loading ? (
            <p className="text-gray-400 text-center py-8">Cargando archivos...</p>
          ) : attachments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No hay estudios complementarios adjuntos
            </p>
          ) : (
            attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="border border-dark-400 rounded-lg p-4 bg-dark-600 hover:bg-dark-500 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-surgical-500/20 text-surgical-400 border border-surgical-500/30">
                        {attachment.type}
                      </span>
                      <h4 className="text-gray-100 font-medium">{attachment.fileName}</h4>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-400 mt-2">
                      <div>
                        <span className="font-medium">Fecha de estudio:</span>{' '}
                        {formatDate(attachment.studyDate)}
                      </div>
                      <div>
                        <span className="font-medium">Tamaño:</span>{' '}
                        {formatFileSize(attachment.sizeBytes)}
                      </div>
                      <div>
                        <span className="font-medium">Subido:</span>{' '}
                        {formatDate(attachment.uploadedAt)}
                      </div>
                      <div>
                        <span className="font-medium">Formato:</span>{' '}
                        {attachment.mimeType?.split('/')[1]?.toUpperCase() || 'N/A'}
                      </div>
                    </div>

                    {attachment.description && (
                      <p className="text-sm text-gray-300 mt-2 italic">
                        {attachment.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {isImage(attachment.fileName) && (
                      <button
                        onClick={() => handleViewImage(attachment)}
                        className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                        title="Ver imagen"
                      >
                        👁 Ver
                      </button>
                    )}
                    <button
                      onClick={() => handleDownload(attachment.id, attachment.fileName)}
                      className="px-3 py-1 text-sm bg-surgical-500 hover:bg-surgical-600 text-white rounded transition-colors"
                      title="Descargar"
                    >
                      ⬇ Descargar
                    </button>
                    {editable && (
                      <button
                        onClick={() => handleDelete(attachment.id)}
                        className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                        title="Eliminar"
                      >
                        🗑 Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>

      {/* Modal para visualizar imagen */}
      {viewingImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingImage(null)}
        >
          <div
            className="relative max-w-6xl max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewingImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 text-2xl font-bold"
            >
              ✕ Cerrar
            </button>
            {viewingImage.imageUrl ? (
              <img
                src={viewingImage.imageUrl}
                alt={viewingImage.fileName}
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                style={{ backgroundColor: 'white' }}
              />
            ) : (
              <div className="text-white text-center py-8">
                <p>Cargando imagen...</p>
              </div>
            )}
            <div className="mt-4 text-white text-center">
              <p className="font-medium">{viewingImage.type}</p>
              <p className="text-sm text-gray-300">{viewingImage.fileName}</p>
              {viewingImage.description && (
                <p className="text-sm text-gray-400 italic mt-2">{viewingImage.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
