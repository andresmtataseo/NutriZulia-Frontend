import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

import { API_ENDPOINTS } from '../../../core/constants';
import { getApiUrl } from '../../../core/config';
import { 
  ApiResponse, 
  LoginRequest, 
  LoginResponse, 
  User, 
  AuthState,
  ForgotPasswordRequest 
} from '../../../core/models';
import { AuthStorageService } from './auth-storage.service';

/**
 * Servicio principal de autenticación
 * Maneja login, logout, estado de autenticación y gestión de tokens
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private authStorage = inject(AuthStorageService);

  // Estado reactivo con signals
  private authStateSignal = signal<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: false,
    error: null
  });

  // Subject para notificaciones de cambios de autenticación
  private authStatusSubject = new BehaviorSubject<boolean>(false);

  // Getters públicos para el estado
  public readonly authState = this.authStateSignal.asReadonly();
  public readonly isAuthenticated = computed(() => this.authState().isAuthenticated);
  public readonly currentUser = computed(() => this.authState().user);
  public readonly isLoading = computed(() => this.authState().isLoading);
  public readonly authError = computed(() => this.authState().error);
  public readonly authStatus$ = this.authStatusSubject.asObservable();

  constructor() {
    this.initializeAuthState();
  }

  /**
   * Inicializa el estado de autenticación al cargar la aplicación
   */
  private initializeAuthState(): void {
    const token = this.authStorage.getToken();
    const userData = this.authStorage.getUserData();

    if (token && !this.authStorage.isTokenExpired(token) && userData) {
      this.updateAuthState({
        isAuthenticated: true,
        user: userData,
        token,
        isLoading: false,
        error: null
      });
      this.authStatusSubject.next(true);
    } else {
      this.clearAuthState();
    }
  }

  /**
   * Realiza el login del usuario
   * @param credentials - Credenciales de login (cédula y clave)
   * @returns Observable con la respuesta del servidor
   */
  login(credentials: LoginRequest): Observable<ApiResponse<LoginResponse>> {
    this.updateAuthState({ ...this.authState(), isLoading: true, error: null });

    const loginUrl = getApiUrl(API_ENDPOINTS.AUTH.LOGIN);

    return this.http.post<ApiResponse<LoginResponse>>(loginUrl, credentials).pipe(
      tap(response => {
        if (response.data) {
          this.handleLoginSuccess(response.data);
        }
      }),
      catchError(error => this.handleAuthError(error))
    );
  }

  /**
   * Solicita la recuperación de contraseña
   * @param request - Datos de la solicitud (cédula)
   * @returns Observable con la respuesta del servidor
   */
  forgotPassword(request: ForgotPasswordRequest): Observable<ApiResponse<any>> {
    const forgotPasswordUrl = getApiUrl(API_ENDPOINTS.AUTH.FORGOT_PASSWORD);

    return this.http.post<ApiResponse<any>>(forgotPasswordUrl, request).pipe(
      catchError(error => this.handleAuthError(error))
    );
  }

  /**
   * Maneja el éxito del login
   * @param loginData - Datos de respuesta del login
   */
  private handleLoginSuccess(loginData: LoginResponse): void {
    // Guardar token y datos del usuario
    this.authStorage.saveToken(loginData.token);
    this.authStorage.saveUserData(loginData.user);

    // Actualizar estado
    this.updateAuthState({
      isAuthenticated: true,
      user: loginData.user,
      token: loginData.token,
      isLoading: false,
      error: null
    });

    // Notificar cambio de estado
    this.authStatusSubject.next(true);
  }

  /**
   * Realiza el logout del usuario
   * Intenta invalidar el token en el servidor, pero siempre limpia el estado local
   * @returns Observable con la respuesta del logout
   */
  logout(): Observable<ApiResponse<any>> {
    this.updateAuthState({ ...this.authState(), isLoading: true });

    const logoutUrl = getApiUrl(API_ENDPOINTS.AUTH.LOGOUT);
    const token = this.getToken();

    // Si no hay token, hacer logout local directamente
     if (!token) {
       this.performLocalLogout();
       return of({
         status: 200,
         message: 'Sesión cerrada exitosamente',
         data: null,
         timestamp: new Date().toISOString(),
         path: '/auth/logout'
       });
     }

    // Intentar logout en el servidor
    return this.http.post<ApiResponse<any>>(logoutUrl, {}).pipe(
      tap(() => {
        this.performLocalLogout();
      }),
      catchError((error: HttpErrorResponse) => {
         // Incluso si falla el logout en el servidor, limpiar estado local
         this.performLocalLogout();
         
         // Retornar éxito ya que el logout local se completó
         return of({
           status: 200,
           message: 'Sesión cerrada exitosamente',
           data: null,
           timestamp: new Date().toISOString(),
           path: '/auth/logout'
         });
       })
    );
  }

  /**
   * Realiza el logout local (limpia estado y almacenamiento)
   */
  private performLocalLogout(): void {
    // Limpiar almacenamiento
    this.authStorage.clearAuthData();

    // Limpiar estado
    this.clearAuthState();

    // Notificar cambio de estado
    this.authStatusSubject.next(false);

    // Redirigir al login
    this.router.navigate(['/login']);
  }

  /**
   * Obtiene el token actual
   * @returns El token de autenticación o null
   */
  getToken(): string | null {
    return this.authStorage.getToken();
  }

  /**
   * Verifica si el usuario está autenticado
   * @returns true si está autenticado, false en caso contrario
   */
  isUserAuthenticated(): boolean {
    const token = this.authStorage.getToken();
    return token !== null && !this.authStorage.isTokenExpired(token);
  }

  /**
   * Obtiene los datos del usuario actual
   * @returns Los datos del usuario o null
   */
  getCurrentUser(): User | null {
    return this.authStorage.getUserData();
  }

  /**
   * Verifica y actualiza el estado de autenticación
   * Útil para verificar la validez del token
   */
  checkAuthStatus(): void {
    const isValid = this.isUserAuthenticated();
    
    if (!isValid && this.authState().isAuthenticated) {
      this.logout();
    } else if (isValid && !this.authState().isAuthenticated) {
      this.initializeAuthState();
    }
  }

  /**
   * Actualiza el estado de autenticación
   * @param newState - Nuevo estado parcial
   */
  private updateAuthState(newState: Partial<AuthState>): void {
    this.authStateSignal.update(current => ({ ...current, ...newState }));
  }

  /**
   * Limpia el estado de autenticación
   */
  private clearAuthState(): void {
    this.updateAuthState({
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false,
      error: null
    });
  }

  /**
   * Maneja errores de autenticación
   * @param error - Error HTTP
   * @returns Observable con el error
   */
  private handleAuthError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Error de autenticación';

    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.status === 401) {
      errorMessage = 'Credenciales inválidas';
    } else if (error.status === 0) {
      errorMessage = 'Error de conexión con el servidor';
    }

    this.updateAuthState({
      ...this.authState(),
      isLoading: false,
      error: errorMessage
    });

    return throwError(() => error);
  }
}