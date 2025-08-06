import { environment } from '../../../environments/environment';

/**
 * Configuración base de la API
 */
export const API_CONFIG = {
  BASE_URL: environment.apiUrl,
  VERSION: 'v1',
  TIMEOUT: 30000,
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
} as const;

/**
 * Construye la URL completa para un endpoint de la API
 * @param endpoint - El endpoint relativo (ej: '/users/profile')
 * @returns La URL completa de la API
 */
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}/api/${API_CONFIG.VERSION}${endpoint}`;
};

/**
 * Reemplaza parámetros en un endpoint
 * @param endpoint - El endpoint con parámetros (ej: '/users/:id')
 * @param params - Objeto con los parámetros a reemplazar
 * @returns El endpoint con los parámetros reemplazados
 */
export const replaceParams = (endpoint: string, params: Record<string, string | number>): string => {
  let result = endpoint;
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(`:${key}`, String(value));
  });
  return result;
};

/**
 * Construye la URL completa con parámetros reemplazados
 * @param endpoint - El endpoint con parámetros
 * @param params - Objeto con los parámetros a reemplazar
 * @returns La URL completa con parámetros reemplazados
 */
export const getApiUrlWithParams = (
  endpoint: string,
  params: Record<string, string | number>
): string => {
  const endpointWithParams = replaceParams(endpoint, params);
  return getApiUrl(endpointWithParams);
};