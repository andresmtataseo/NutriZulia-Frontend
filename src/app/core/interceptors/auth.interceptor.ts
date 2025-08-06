import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../../features/auth/services';
import { API_ENDPOINTS } from '../constants';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // URLs que no requieren autenticación
  const excludedUrls = [
    API_ENDPOINTS.AUTH.LOGIN,
    API_ENDPOINTS.AUTH.FORGOT_PASSWORD
  ];

  if (excludedUrls.some(url => req.url.includes(url))) {
    return next(req);
  }

  // Obtener token de acceso
  const token = authService.getToken();

  if (token) {
    // Clonar la request y agregar el header de autorización
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    return next(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Si el token expiró (401), hacer logout
        if (error.status === 401) {
          authService.logout();
        }

        return throwError(() => error);
      })
    );
  }

  return next(req);
};
