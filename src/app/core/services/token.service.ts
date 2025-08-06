import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private readonly ACCESS_TOKEN_KEY = 'access_token';

  setToken(accessToken: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
  }

  getToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  clearToken(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
  }

  isTokenExpired(token?: string): boolean {
    const tokenToCheck = token || this.getToken();
    if (!tokenToCheck) return true;

    try {
      const payload = JSON.parse(atob(tokenToCheck.split('.')[1]));
      const currentTime = Math.floor(Date.now());
      return payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  getTokenExpirationDate(token?: string): Date | null {
    const tokenToCheck = token || this.getToken();
    if (!tokenToCheck) return null;

    try {
      const payload = JSON.parse(atob(tokenToCheck.split('.')[1]));
      return new Date(payload.exp);
    } catch (error) {
      return null;
    }
  }
}
