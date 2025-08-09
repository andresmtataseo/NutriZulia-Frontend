/**
 * Constantes de endpoints de la API
 * Centraliza todas las rutas de la API para facilitar el mantenimiento
 */

/**
 * Prefijo base para todas las APIs
 */
export const API_PREFIX = '/api/v1' as const;

export const API_ENDPOINTS = {
  // Autenticación
  AUTH: {
    LOGIN: '/auth/sign-in',
    LOGOUT: '/auth/logout',
    FORGOT_PASSWORD: '/auth/forgot-password',
    CHANGE_PASSWORD: '/auth/change-password',
    CHECK_AUTH: '/auth/check',
  },
  USER: {
    INSTITUTIONS_USER: '/user/institutions-by-user',
    USERS_GET_ALL: '/user/get-all',
    USERS_WITH_INSTITUTIONS: '/user/get-all/institutions',
    USERS_CREATE: '/user/create',
    USERS_CHECK_CEDULA: '/user/check-cedula',
    USERS_CHECK_EMAIL: '/user/check-email',
    USERS_CHECK_PHONE: '/user/check-phone',
    USERS_GET_DETAIL: '/user/detail',
    USERS_UPDATE: '/user/update',
    USERS_ASSIGN_INSTITUTION: '/user/assign-institution',
    USERS_UPDATE_INSTITUTION: '/user/update-institution',
    USERS_REMOVE_INSTITUTION: '/user/remove-institution',
    USERS_HISTORY: '/user/history',
  },
  CATALOG: {
    STATES: '/catalog/states',
    HEALTH_MUNICIPALITIES: '/catalog/health-municipalities',
    INSTITUTIONS: '/catalog/institutions',
    INSTITUTIONS_TYPES: '/catalog/institution-types',
    ROLES: '/catalog/roles',
  }
} as const;

/**
 * Tipo para los endpoints de la API
 */
export type ApiEndpoint = typeof API_ENDPOINTS;
