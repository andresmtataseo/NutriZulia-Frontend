export interface User {
  id: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  genero: string;
  telefono?: string;
  correo: string;
  clave?: string;
  isEnabled: boolean;
}

export interface UserUpdateRequest {
  cedula: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  genero: string;
  telefono?: string;
  correo: string;
  isEnabled: boolean;
}
