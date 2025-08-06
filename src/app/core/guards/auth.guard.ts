import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { AuthService } from '../../features/auth/services';

/**
 * Guard de autenticación para proteger rutas
 * Verifica si el usuario está autenticado antes de permitir el acceso
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Verificar estado de autenticación
  authService.checkAuthStatus();

  if (authService.isUserAuthenticated()) {
    return true;
  }

  // Redirigir al login si no está autenticado
  router.navigate(['/auth/login'], {
    queryParams: { returnUrl: state.url }
  });
  
  return false;
};

/**
 * Guard para rutas públicas (como login)
 * Redirige al dashboard si el usuario ya está autenticado
 */
export const publicGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Verificar estado de autenticación
  authService.checkAuthStatus();

  if (authService.isUserAuthenticated()) {
    // Redirigir al dashboard si ya está autenticado
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};