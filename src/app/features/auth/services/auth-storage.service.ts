import { Injectable } from '@angular/core';

/**
 * Servicio para gestionar el almacenamiento seguro de tokens de autenticación
 */
@Injectable({
  providedIn: 'root'
})
export class AuthStorageService {
  private readonly TOKEN_KEY = 'nutrizulia_auth_token';
  private readonly USER_KEY = 'nutrizulia_user_data';

  /**
   * Guarda el token de autenticación en localStorage
   * @param token - Token JWT a guardar
   */
  saveToken(token: string): void {
    try {
      localStorage.setItem(this.TOKEN_KEY, token);
    } catch (error) {
      console.error('Error al guardar el token:', error);
    }
  }

  /**
   * Obtiene el token de autenticación desde localStorage
   * @returns El token guardado o null si no existe
   */
  getToken(): string | null {
    try {
      return localStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('Error al obtener el token:', error);
      return null;
    }
  }

  /**
   * Guarda los datos del usuario en localStorage
   * @param userData - Datos del usuario a guardar
   */
  saveUserData(userData: any): void {
    try {
      localStorage.setItem(this.USER_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error('Error al guardar datos del usuario:', error);
    }
  }

  /**
   * Obtiene los datos del usuario desde localStorage
   * @returns Los datos del usuario o null si no existen
   */
  getUserData(): any | null {
    try {
      const userData = localStorage.getItem(this.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error al obtener datos del usuario:', error);
      return null;
    }
  }

  /**
   * Limpia todos los datos de autenticación del almacenamiento
   */
  clearAuthData(): void {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    } catch (error) {
      console.error('Error al limpiar datos de autenticación:', error);
    }
  }

  /**
   * Verifica si existe un token en el almacenamiento
   * @returns true si existe un token, false en caso contrario
   */
  hasToken(): boolean {
    return this.getToken() !== null;
  }

  /**
   * Verifica si el token ha expirado
   * @param token - Token a verificar (opcional, usa el almacenado si no se proporciona)
   * @returns true si el token ha expirado, false en caso contrario
   */
  isTokenExpired(token?: string): boolean {
    const tokenToCheck = token || this.getToken();
    
    if (!tokenToCheck) {
      return true;
    }

    try {
      const payload = JSON.parse(atob(tokenToCheck.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (error) {
      console.error('Error al verificar expiración del token:', error);
      return true;
    }
  }
}