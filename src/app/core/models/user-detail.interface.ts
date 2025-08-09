import { User, UserUpdateRequest } from './user.interface';
import { UserInstitution } from './user-institution.interface';
import { Institucion } from './catalog/institucion.interface';
import { Rol } from './rol.interface';

export interface UserDetail extends User {
  instituciones: UserInstitutionDetail[];
}

export interface UserInstitutionDetail extends UserInstitution {
  institucion: Institucion;
  rol: Rol;
}

export interface InstitutionAssignmentRequest {
  usuarioId: number;
  institucionId: number;
  rolId: number;
  fechaInicio: string;
  fechaFin?: string;
}

export interface UserInstitutionUpdateRequest {
  id: number;
  rolId?: number;
  fechaInicio: string;
  fechaFin?: string | null;
  isEnabled: boolean;
}

export interface UserHistoryEntry {
  id: number;
  accion: string;
  descripcion: string;
  fechaAccion: string;
  usuarioAccion: string;
  detalles?: any;
}

export interface UserModalData {
  user: UserDetail;
  mode: 'view' | 'edit';
}

// Re-export UserUpdateRequest for convenience
export type { UserUpdateRequest };