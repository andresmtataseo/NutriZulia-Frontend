export interface ChangePasswordRequest {
  clave_actual: string;
  clave_nueva: string;
  clave_nueva_confirmacion: string;
}