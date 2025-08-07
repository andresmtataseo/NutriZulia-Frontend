import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { AuthService } from '../../features/auth/services';

/**
 * Tipos de protección para rutas
 */
type GuardType = 'protected' | 'public' | 'redirect';

/**
 * Factory para crear guards de autenticación unificados
 * @param guardType Tipo de protección: 'protected', 'public', o 'redirect'
 * @returns CanActivateFn configurado según el tipo
 */
const createAuthGuard = (guardType: GuardType): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Verificar estado de autenticación
    authService.checkAuthStatus();
    const isAuthenticated = authService.isUserAuthenticated();

    switch (guardType) {
      case 'protected':
        // Para rutas protegidas: permitir solo si está autenticado
        if (isAuthenticated) {
          return true;
        }
        // Redirigir al login con returnUrl si no está autenticado
        router.navigate(['/login'], {
          queryParams: { returnUrl: state.url }
        });
        return false;

      case 'public':
        // Para rutas públicas: permitir solo si NO está autenticado
        if (!isAuthenticated) {
          return true;
        }
        // Redirigir al dashboard si ya está autenticado
        router.navigate(['/dashboard']);
        return false;

      case 'redirect':
        // Para ruta raíz: redirigir según estado de autenticación
        if (isAuthenticated) {
          router.navigate(['/dashboard']);
        } else {
          router.navigate(['/login']);
        }
        return false; // Siempre redirige, nunca permite acceso directo

      default:
        return false;
    }
  };
};

/**
 * Guard para proteger rutas que requieren autenticación
 * Redirige al login si el usuario no está autenticado
 */
export const authGuard = createAuthGuard('protected');

/**
 * Guard para rutas públicas (como login)
 * Redirige al dashboard si el usuario ya está autenticado
 */
export const publicGuard = createAuthGuard('public');

/**
 * Guard para la ruta raíz que redirige inteligentemente
 * basado en el estado de autenticación del usuario
 */
export const redirectGuard = createAuthGuard('redirect');