/**
 * Constantes de endpoints de la API
 * Centraliza todas las rutas de la API para facilitar el mantenimiento
 */
export const API_ENDPOINTS = {
  // Autenticación
  AUTH: {
    LOGIN: '/auth/sign-in-admin',
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
  }
} as const;

/**
 * Tipo para los endpoints de la API
 */
export type ApiEndpoint = typeof API_ENDPOINTS;
