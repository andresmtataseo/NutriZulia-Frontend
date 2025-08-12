/**
 * Interfaces para instituciones con usuarios asociados
 */

export interface MunicipioSanitario {
  id: number;
  nombre: string;
}

export interface TipoInstitucion {
  id: number;
  nombre: string;
}

export interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
}

export interface UsuarioInstitucion {
  id: number;
  institucion_id: number;
  rol: Rol;
  fecha_inicio: string;
  fecha_fin: string | null;
  is_enabled: boolean;
}

export interface UsuarioConRol {
  id: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  genero: string;
  telefono: string;
  correo: string;
  is_enabled: boolean;
  usuario_institucion: UsuarioInstitucion;
}

export interface InstitucionConUsuarios {
  id: number;
  nombre: string;
  municipio_sanitario: MunicipioSanitario;
  tipo_institucion: TipoInstitucion;
  usuarios: UsuarioConRol[];
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

export interface InstitutionSearchParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
  search?: string;
}
