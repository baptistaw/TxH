// src/lib/api.js - Cliente API con fetch nativo y autenticación

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
 * Obtener token del localStorage (client-side only)
 */
function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

/**
 * Cliente fetch con configuración base
 */
async function fetcher(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const token = getToken();

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

    // Si es 401, limpiar token y redirigir a login
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
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
 * API de Autenticación
 */
export const authApi = {
  // Login
  login: async (email, password) => {
    const data = await api.post('/auth/login', { email, password });

    if (typeof window !== 'undefined' && data.token) {
      localStorage.setItem('token', data.token);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    }

    return data;
  },

  // Logout
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  },

  // Obtener usuario actual
  me: () => {
    return api.get('/auth/me');
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

  // Obtener resultados postoperatorios
  getPostop: (caseId) => {
    return api.get(`/cases/${caseId}/postop`);
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
};

export default api;
