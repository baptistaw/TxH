// src/lib/auth.js - Utilidades de autenticación

/**
 * Obtener token del localStorage
 */
export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

/**
 * Guardar token en localStorage
 */
export function setToken(token) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
}

/**
 * Remover token del localStorage
 */
export function removeToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

/**
 * Obtener usuario del localStorage
 */
export function getUser() {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;

  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Guardar usuario en localStorage
 */
export function setUser(user) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('user', JSON.stringify(user));
}

/**
 * Verificar si está autenticado
 */
export function isAuthenticated() {
  return !!getToken();
}

/**
 * Verificar si tiene un rol específico
 */
export function hasRole(role) {
  const user = getUser();
  if (!user || !user.role) return false;
  return user.role === role;
}

/**
 * Verificar si tiene alguno de los roles
 */
export function hasAnyRole(roles = []) {
  const user = getUser();
  if (!user || !user.role) return false;
  return roles.includes(user.role);
}

/**
 * Decodificar JWT (simple, sin validación)
 * NOTA: Solo para leer claims, NO para validar
 */
export function decodeToken(token) {
  if (!token) return null;

  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Verificar si el token está expirado
 */
export function isTokenExpired(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;

  const now = Date.now() / 1000;
  return decoded.exp < now;
}

/**
 * Logout - limpiar todo y redirigir
 */
export function logout() {
  removeToken();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
