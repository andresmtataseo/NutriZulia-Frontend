export interface User {
  id: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  genero: string;
  telefono: string;
  correo: string;
  isEnabled: boolean;
}

export interface UserWithInstitutions extends User {
  instituciones: InstitutionRole[];
}

export interface InstitutionRole {
  institucionId: number;
  institucionNombre: string;
  rolId: number;
  rolNombre: string;
  fechaInicio: string;
  fechaFin?: string;
  isEnabled: boolean;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface UserSearchParams {
  page?: number;
  size?: number;
  search?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface CreateUserRequest {
  cedula: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  genero: string;
  telefono: string;
  correo: string;
  clave: string;
}

export interface UpdateUserRequest extends Partial<CreateUserRequest> {
  isEnabled?: boolean;
}