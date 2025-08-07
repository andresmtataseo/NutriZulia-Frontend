import { User } from './user.interface';

/**
 * Estado de autenticación de la aplicación
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}
