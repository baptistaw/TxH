// src/lib/api.js - Cliente API con fetch nativo y autenticación Clerk

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

/**
 * Error personalizado para errores de API
 */
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Variable global para almacenar la función getToken de Clerk
 * Se inicializa desde AuthContext
 */
let clerkGetToken = null;

/**
 * Inicializar la función de obtención de token de Clerk
 * Llamado desde AuthContext cuando se monta
 */
export function initializeAuth(getTokenFn) {
  clerkGetToken = getTokenFn;
}

/**
 * Obtener token de Clerk (async)
 */
async function getToken() {
  if (typeof window === 'undefined') return null;

  // Intentar obtener token de Clerk
  if (clerkGetToken) {
    try {
      return await clerkGetToken();
    } catch (error) {
      console.error('Error getting Clerk token:', error);
      return null;
    }
  }

  return null;
}

/**
 * Cliente fetch con configuración base
 */
async function fetcher(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const token = await getToken();

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);

    // Si es 401, NO redirigir automáticamente - dejar que AuthContext maneje el estado
    if (response.status === 401) {
      throw new ApiError('No autorizado', 401, null);
    }

    // Parsear respuesta
    const contentType = response.headers.get('content-type');
    let data = null;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Si no es exitoso, lanzar error
    if (!response.ok) {
      throw new ApiError(
        data?.message || data?.error || 'Error en la solicitud',
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Error de red u otro
    throw new ApiError(
      error.message || 'Error de conexión',
      0,
      null
    );
  }
}

/**
 * API Client con métodos HTTP
 */
export const api = {
  // GET request
  get: (endpoint, params = {}) => {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    return fetcher(url, { method: 'GET' });
  },

  // POST request
  post: (endpoint, body) => {
    return fetcher(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // PUT request
  put: (endpoint, body) => {
    return fetcher(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  // PATCH request
  patch: (endpoint, body) => {
    return fetcher(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  // DELETE request
  delete: (endpoint) => {
    return fetcher(endpoint, { method: 'DELETE' });
  },
};

/**
 * API de Autenticación (Clerk)
 * Login/Logout manejados por Clerk directamente
 */
export const authApi = {
  // Obtener usuario actual (datos de BD local)
  me: () => {
    return api.get('/auth/me');
  },

  // Sincronizar usuario de Clerk con BD local (solo vincula clerkId, no toca roles)
  sync: () => {
    return api.post('/auth/sync');
  },

  // Actualizar perfil en BD local
  updateProfile: (data) => {
    return api.put('/auth/profile', data);
  },

  // Verificar si el bootstrap está disponible
  getBootstrapStatus: () => {
    return api.get('/auth/bootstrap/status');
  },

  // Ejecutar bootstrap (crear primer ADMIN)
  // Requiere: no haya ADMINs en BD + usuario sea org:admin en Clerk
  bootstrap: (data) => {
    return api.post('/auth/bootstrap', data);
  },
};

/**
 * API de Pacientes
 */
export const patientsApi = {
  // Listar pacientes con paginación y filtros
  list: (params = {}) => {
    return api.get('/patients', params);
  },

  // Obtener paciente por ID
  getById: (id) => {
    return api.get(`/patients/${id}`);
  },

  // Crear paciente
  create: (data) => {
    return api.post('/patients', data);
  },

  // Actualizar paciente
  update: (id, data) => {
    return api.put(`/patients/${id}`, data);
  },

  // Eliminar paciente
  delete: (id) => {
    return api.delete(`/patients/${id}`);
  },
};

/**
 * API de Casos de Trasplante
 */
export const casesApi = {
  // Listar casos con paginación y filtros
  list: (params = {}) => {
    return api.get('/cases', params);
  },

  // Obtener caso por ID
  getById: (id) => {
    return api.get(`/cases/${id}`);
  },

  // Crear caso
  create: (data) => {
    return api.post('/cases', data);
  },

  // Actualizar caso
  update: (id, data) => {
    return api.put(`/cases/${id}`, data);
  },

  // Eliminar caso
  delete: (id) => {
    return api.delete(`/cases/${id}`);
  },

  // Obtener equipo del caso
  getTeam: (caseId) => {
    return api.get(`/cases/${caseId}/team`);
  },

  // Obtener evaluación preoperatoria
  getPreop: (caseId) => {
    return api.get(`/cases/${caseId}/preop`);
  },

  // Obtener registros intraoperatorios
  getIntraop: (caseId) => {
    return api.get(`/cases/${caseId}/intraop`);
  },

  // Obtener registros de fluidos y hemoderivados
  getFluids: (caseId) => {
    return api.get(`/cases/${caseId}/fluids`);
  },

  // Obtener resultados postoperatorios
  getPostop: (caseId) => {
    return api.get(`/cases/${caseId}/postop`);
  },

  // Agregar miembro al equipo
  addTeamMember: (caseId, data) => {
    return api.post(`/cases/${caseId}/team`, data);
  },

  // Eliminar miembro del equipo
  removeTeamMember: (caseId, teamAssignmentId) => {
    return api.delete(`/cases/${caseId}/team/${teamAssignmentId}`);
  },

  // Obtener líneas y monitoreo
  getLinesMonitoring: (caseId) => {
    return api.get(`/cases/${caseId}/lines-monitoring`);
  },

  // Crear líneas y monitoreo
  createLinesMonitoring: (caseId, data) => {
    return api.post(`/cases/${caseId}/lines-monitoring`, data);
  },

  // Actualizar líneas y monitoreo
  updateLinesMonitoring: (caseId, data) => {
    return api.put(`/cases/${caseId}/lines-monitoring`, data);
  },

  // Eliminar líneas y monitoreo
  deleteLinesMonitoring: (caseId) => {
    return api.delete(`/cases/${caseId}/lines-monitoring`);
  },
};

/**
 * API de Evaluaciones Preoperatorias
 */
export const preopApi = {
  list: (params = {}) => {
    return api.get('/preop', params);
  },

  getById: (id) => {
    return api.get(`/preop/${id}`);
  },

  create: (data) => {
    return api.post('/preop', data);
  },

  update: (id, data) => {
    return api.put(`/preop/${id}`, data);
  },
};

/**
 * API de Registros Intraoperatorios
 */
export const intraopApi = {
  // Listar registros (filtrado por caso y fase)
  list: (params = {}) => {
    return api.get('/intraop', params);
  },

  // Obtener registro por ID
  getById: (id) => {
    return api.get(`/intraop/${id}`);
  },

  // Crear registro
  create: (data) => {
    return api.post('/intraop', data);
  },

  // Actualizar registro
  update: (id, data) => {
    return api.put(`/intraop/${id}`, data);
  },

  // Eliminar registro
  delete: (id) => {
    return api.delete(`/intraop/${id}`);
  },

  // Duplicar última fila de una fase
  duplicate: (caseId, phase) => {
    return api.post('/intraop/duplicate', { caseId, phase });
  },

  // Obtener estadísticas de una fase
  getStats: (caseId, phase) => {
    return api.get(`/intraop/stats/${caseId}/${phase}`);
  },
};

/**
 * API de Fluidos y Hemoderivados
 */
export const fluidsApi = {
  // Listar registros (filtrado por caso y fase)
  list: (params = {}) => {
    return api.get('/fluids', params);
  },

  // Obtener registro por ID
  getById: (id) => {
    return api.get(`/fluids/${id}`);
  },

  // Crear registro
  create: (data) => {
    return api.post('/fluids', data);
  },

  // Actualizar registro
  update: (id, data) => {
    return api.put(`/fluids/${id}`, data);
  },

  // Eliminar registro
  delete: (id) => {
    return api.delete(`/fluids/${id}`);
  },

  // Obtener totales por fase
  getTotals: (caseId, phase) => {
    return api.get(`/fluids/totals/${caseId}/${phase}`);
  },
};

/**
 * API de Fármacos
 */
export const drugsApi = {
  // Listar registros (filtrado por caso y fase)
  list: (params = {}) => {
    return api.get('/drugs', params);
  },

  // Obtener registro por ID
  getById: (id) => {
    return api.get(`/drugs/${id}`);
  },

  // Crear registro
  create: (data) => {
    return api.post('/drugs', data);
  },

  // Actualizar registro
  update: (id, data) => {
    return api.put(`/drugs/${id}`, data);
  },

  // Eliminar registro
  delete: (id) => {
    return api.delete(`/drugs/${id}`);
  },

  // Duplicar último registro
  duplicate: (caseId, phase) => {
    return api.post('/drugs/duplicate', { caseId, phase });
  },
};

/**
 * API de Equipo Clínico
 */
export const teamApi = {
  list: (params = {}) => {
    return api.get('/team', params);
  },

  getById: (id) => {
    return api.get(`/team/${id}`);
  },
};

/**
 * API de Exportaciones (PDF y CSV)
 */
export const exportsApi = {
  /**
   * Descargar caso como PDF
   * @param {string|number} caseId - ID del caso
   */
  downloadPDF: async (caseId) => {
    const url = `${API_URL}/exports/case/${caseId}/pdf`;
    const token = getToken();

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error('Error al descargar PDF');
    }

    // Descargar archivo
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `caso-${caseId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  /**
   * Enviar caso como PDF por email
   * @param {string|number} caseId - ID del caso
   * @param {string[]} recipients - Destinatarios (opcional, usa lista por defecto si no se especifica)
   */
  emailPDF: async (caseId, recipients = null) => {
    const url = `${API_URL}/exports/case/${caseId}/email`;
    return api.post(url, { recipients });
  },

  /**
   * Descargar caso como CSV
   * @param {string|number} caseId - ID del caso
   * @param {string} format - Formato: 'complete', 'summary', 'intraop'
   */
  downloadCSV: async (caseId, format = 'complete') => {
    const url = `${API_URL}/exports/case/${caseId}/csv?format=${format}`;
    const token = getToken();

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error('Error al descargar CSV');
    }

    // Descargar archivo
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `caso-${caseId}-${format}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  // ============================================================================
  // PREOP EXPORTS
  // ============================================================================

  /**
   * Descargar evaluación preoperatoria como PDF
   * @param {string} preopId - ID de la evaluación
   * @param {string} patientName - Nombre del paciente para el nombre del archivo
   */
  downloadPreopPDF: async (preopId, patientName = 'paciente') => {
    const url = `${API_URL}/exports/preop/${preopId}/pdf`;
    const token = getToken();

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error('Error al descargar PDF de evaluación');
    }

    // Descargar archivo
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    const safeName = patientName.replace(/\s+/g, '_');
    link.download = `evaluacion-pretrasplante-${safeName}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  /**
   * Enviar evaluación preoperatoria como PDF por email
   * @param {string} preopId - ID de la evaluación
   * @param {string[]} recipients - Destinatarios (opcional)
   */
  emailPreopPDF: async (preopId, recipients = null) => {
    const url = `${API_URL}/exports/preop/${preopId}/email`;
    return api.post(url, { recipients });
  },

  // ============================================================================
  // PROCEDURE EXPORTS
  // ============================================================================

  /**
   * Descargar procedimiento como PDF
   * @param {string} procedureId - ID del procedimiento
   * @param {string} patientName - Nombre del paciente para el nombre del archivo
   */
  downloadProcedurePDF: async (procedureId, patientName = 'paciente') => {
    const url = `${API_URL}/exports/procedure/${procedureId}/pdf`;
    const token = getToken();

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error('Error al descargar PDF del procedimiento');
    }

    // Descargar archivo
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    const safeName = patientName.replace(/\s+/g, '_');
    link.download = `procedimiento-${safeName}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  /**
   * Enviar procedimiento como PDF por email
   * @param {string} procedureId - ID del procedimiento
   * @param {string[]} recipients - Destinatarios (opcional)
   */
  emailProcedurePDF: async (procedureId, recipients = null) => {
    const url = `${API_URL}/exports/procedure/${procedureId}/email`;
    return api.post(url, { recipients });
  },
};

/**
 * API de Procedimientos Quirúrgicos
 */
export const proceduresApi = {
  // Listar procedimientos
  list: (params = {}) => {
    return api.get('/procedures', params);
  },

  // Obtener procedimiento por ID
  getById: (id) => {
    return api.get(`/procedures/${id}`);
  },

  // Crear procedimiento
  create: (data) => {
    return api.post('/procedures', data);
  },

  // Actualizar procedimiento
  update: (id, data) => {
    return api.put(`/procedures/${id}`, data);
  },

  // Eliminar procedimiento
  delete: (id) => {
    return api.delete(`/procedures/${id}`);
  },

  // Crear registro intraoperatorio
  createIntraopRecord: (procedureId, data) => {
    return api.post(`/procedures/${procedureId}/intraop`, data);
  },

  // Actualizar registro intraoperatorio
  updateIntraopRecord: (procedureId, recordId, data) => {
    return api.put(`/procedures/${procedureId}/intraop/${recordId}`, data);
  },

  // Eliminar registro intraoperatorio
  deleteIntraopRecord: (procedureId, recordId) => {
    return api.delete(`/procedures/${procedureId}/intraop/${recordId}`);
  },
};

/**
 * API de Administración
 */
export const adminApi = {
  // ============= USUARIOS =============
  // Listar usuarios
  listUsers: (params = {}) => {
    return api.get('/admin/users', params);
  },

  // Obtener usuario por ID
  getUserById: (id) => {
    return api.get(`/admin/users/${id}`);
  },

  // Crear usuario
  createUser: (data) => {
    return api.post('/admin/users', data);
  },

  // Actualizar usuario
  updateUser: (id, data) => {
    return api.put(`/admin/users/${id}`, data);
  },

  // Eliminar usuario
  deleteUser: (id) => {
    return api.delete(`/admin/users/${id}`);
  },

  // ============= PACIENTES =============
  // Listar pacientes con filtros
  listPatients: (params = {}) => {
    return api.get('/admin/patients', params);
  },

  // Obtener paciente completo
  getPatientById: (id) => {
    return api.get(`/admin/patients/${id}`);
  },

  // ============= CATÁLOGOS =============
  // Etiologías
  listEtiologies: (params = {}) => {
    return api.get('/admin/catalogs/etiologies', params);
  },

  createEtiology: (data) => {
    return api.post('/admin/catalogs/etiologies', data);
  },

  updateEtiology: (id, data) => {
    return api.put(`/admin/catalogs/etiologies/${id}`, data);
  },

  deleteEtiology: (id) => {
    return api.delete(`/admin/catalogs/etiologies/${id}`);
  },

  // Antibióticos
  listAntibiotics: () => {
    return api.get('/admin/catalogs/antibiotics');
  },

  createAntibiotic: (data) => {
    return api.post('/admin/catalogs/antibiotics', data);
  },

  updateAntibiotic: (id, data) => {
    return api.put(`/admin/catalogs/antibiotics/${id}`, data);
  },

  deleteAntibiotic: (id) => {
    return api.delete(`/admin/catalogs/antibiotics/${id}`);
  },

  // Posiciones
  listPositions: () => {
    return api.get('/admin/catalogs/positions');
  },

  createPosition: (data) => {
    return api.post('/admin/catalogs/positions', data);
  },

  updatePosition: (id, data) => {
    return api.put(`/admin/catalogs/positions/${id}`, data);
  },

  deletePosition: (id) => {
    return api.delete(`/admin/catalogs/positions/${id}`);
  },

  // Locaciones
  listLocations: (params = {}) => {
    return api.get('/admin/catalogs/locations', params);
  },

  createLocation: (data) => {
    return api.post('/admin/catalogs/locations', data);
  },

  updateLocation: (id, data) => {
    return api.put(`/admin/catalogs/locations/${id}`, data);
  },

  deleteLocation: (id) => {
    return api.delete(`/admin/catalogs/locations/${id}`);
  },

  // ============= PROTOCOLOS =============
  // Listar protocolos
  listProtocols: (params = {}) => {
    return api.get('/admin/protocols', params);
  },

  // Obtener protocolo por ID
  getProtocolById: (id) => {
    return api.get(`/admin/protocols/${id}`);
  },

  // Crear protocolo
  createProtocol: (data) => {
    return api.post('/admin/protocols', data);
  },

  // Actualizar protocolo
  updateProtocol: (id, data) => {
    return api.put(`/admin/protocols/${id}`, data);
  },

  // Desactivar protocolo
  deleteProtocol: (id) => {
    return api.delete(`/admin/protocols/${id}`);
  },

  // Fases de protocolo
  createPhase: (protocolId, data) => {
    return api.post(`/admin/protocols/${protocolId}/phases`, data);
  },

  updatePhase: (protocolId, phaseId, data) => {
    return api.put(`/admin/protocols/${protocolId}/phases/${phaseId}`, data);
  },

  deletePhase: (protocolId, phaseId) => {
    return api.delete(`/admin/protocols/${protocolId}/phases/${phaseId}`);
  },

  // Antibióticos de fase
  createPhaseAntibiotic: (protocolId, phaseId, data) => {
    return api.post(`/admin/protocols/${protocolId}/phases/${phaseId}/antibiotics`, data);
  },

  updatePhaseAntibiotic: (protocolId, phaseId, antibioticId, data) => {
    return api.put(`/admin/protocols/${protocolId}/phases/${phaseId}/antibiotics/${antibioticId}`, data);
  },

  deletePhaseAntibiotic: (protocolId, phaseId, antibioticId) => {
    return api.delete(`/admin/protocols/${protocolId}/phases/${phaseId}/antibiotics/${antibioticId}`);
  },

  // ============= ESTADÍSTICAS =============
  getStats: () => {
    return api.get('/admin/stats');
  },
};

/**
 * API de Catálogos (público)
 */
export const catalogsApi = {
  // Listar todos los catálogos
  list: () => {
    return api.get('/catalogs');
  },

  // Obtener catálogo por nombre
  getByName: (name, params = {}) => {
    const query = new URLSearchParams(params).toString();
    const url = query ? `/catalogs/${name}?${query}` : `/catalogs/${name}`;
    return api.get(url);
  },

  // ============= ADMIN =============

  // Actualizar catálogo
  updateCatalog: (catalogId, data) => {
    return api.put(`/catalogs/admin/${catalogId}`, data);
  },

  // Crear item en catálogo
  createItem: (catalogId, data) => {
    return api.post(`/catalogs/admin/${catalogId}/items`, data);
  },

  // Actualizar item
  updateItem: (itemId, data) => {
    return api.put(`/catalogs/admin/items/${itemId}`, data);
  },

  // Eliminar item (soft delete)
  deleteItem: (itemId) => {
    return api.delete(`/catalogs/admin/items/${itemId}`);
  },
};

// ============================================================================
// CLINICIANS API
// ============================================================================

export const cliniciansApi = {
  // Listar todos los clínicos
  list: async () => {
    const response = await api.get('/clinicians');
    return response.data || [];
  },
};

// ============================================================================
// POSTOP API
// ============================================================================

export const postopApi = {
  // Obtener resultado postoperatorio de un caso
  get: (caseId) => {
    return api.get(`/postop/${caseId}`);
  },

  // Crear resultado postoperatorio
  create: (data) => {
    return api.post('/postop', data);
  },

  // Actualizar resultado postoperatorio
  update: (caseId, data) => {
    return api.put(`/postop/${caseId}`, data);
  },
};

// ============================================================================
// MORTALITY API
// ============================================================================

export const mortalityApi = {
  // Obtener registro de mortalidad de un paciente
  get: (patientId) => {
    return api.get(`/mortality/patient/${patientId}`);
  },

  // Crear registro de mortalidad
  create: (data) => {
    return api.post('/mortality', data);
  },

  // Actualizar registro de mortalidad
  update: (patientId, data) => {
    return api.put(`/mortality/patient/${patientId}`, data);
  },
};

// ============================================================================
// ANALYTICS API - KPIs de Calidad
// ============================================================================

export const analyticsApi = {
  // Obtener KPIs de calidad
  getKPIs: (params = {}) => {
    return api.get('/analytics/kpis', params);
  },

  // Obtener años disponibles para filtro
  getAvailableYears: () => {
    return api.get('/analytics/kpis/years');
  },

  // Obtener KPIs clínicos (demografía, tiempos, severidad, etc.)
  getClinicalKPIs: (params = {}) => {
    return api.get('/analytics/clinical', params);
  },
};

// ============================================================================
// SEARCH API - Búsqueda Avanzada y Timeline
// ============================================================================

export const searchApi = {
  /**
   * Búsqueda global unificada en pacientes, procedimientos y preops
   * @param {string} query - Término de búsqueda (mínimo 2 caracteres)
   * @param {string} type - Tipo de búsqueda: 'all', 'patients', 'procedures', 'preops'
   * @param {number} limit - Límite de resultados por categoría
   */
  global: (query, type = 'all', limit = 10) => {
    return api.get('/search/global', { q: query, type, limit });
  },

  /**
   * Búsqueda avanzada de pacientes con múltiples filtros
   * @param {Object} params - Parámetros de búsqueda
   */
  advancedPatients: (params = {}) => {
    return api.get('/search/patients/advanced', params);
  },

  /**
   * Búsqueda avanzada de procedimientos con múltiples filtros
   * @param {Object} params - Parámetros de búsqueda
   */
  advancedProcedures: (params = {}) => {
    return api.get('/search/procedures/advanced', params);
  },

  /**
   * Obtener timeline completo de un paciente
   * @param {string} patientId - CI del paciente
   */
  getPatientTimeline: (patientId) => {
    return api.get(`/search/patients/${patientId}/timeline`);
  },
};

/**
 * API del Sistema de Asistencia ROTEM
 * Proporciona recomendaciones algorítmicas para reposición de hemoderivados
 * basadas en el protocolo PRO/T 3 y Algoritmo Hepático A5 de Werfen
 */
export const rotemApi = {
  /**
   * Obtener recomendaciones del algoritmo ROTEM
   * @param {Object} rotemData - Datos de ROTEM (ctExtem, a5Extem, a5Fibtem, etc.)
   * @param {string} phase - Fase quirúrgica actual
   * @param {Object} clinicalContext - Contexto clínico (peso, sangrado, labs, contraindicaciones)
   */
  getRecommendations: (rotemData, phase, clinicalContext) => {
    return api.post('/rotem/recommendations', {
      ...rotemData,
      phase,
      clinicalContext,
    });
  },

  /**
   * Obtener umbrales y constantes del algoritmo
   */
  getThresholds: () => {
    return api.get('/rotem/thresholds');
  },

  /**
   * Obtener historial de registros ROTEM de un caso
   * @param {string} caseId - ID del caso
   * @param {string} phase - Fase quirúrgica (opcional)
   */
  getHistory: (caseId, phase = null) => {
    const params = phase ? { phase } : {};
    return api.get(`/rotem/history/${caseId}`, params);
  },

  /**
   * Obtener último registro ROTEM con datos de laboratorio
   * @param {string} caseId - ID del caso
   */
  getLatestWithLabs: (caseId) => {
    return api.get(`/rotem/latest/${caseId}`);
  },

  /**
   * Obtener tendencia de un parámetro ROTEM
   * @param {string} caseId - ID del caso
   * @param {string} parameter - Parámetro a analizar (a5Extem, a5Fibtem, cli30, etc.)
   */
  getTrend: (caseId, parameter) => {
    return api.get(`/rotem/trend/${caseId}`, { parameter });
  },
};

export default api;
