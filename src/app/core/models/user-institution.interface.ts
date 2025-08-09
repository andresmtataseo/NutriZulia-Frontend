export interface UserInstitution {
  id: number;
  institucionId?: number;
  usuarioId?: number;
  rolId?: number;
  fechaInicio: string;
  fechaFin: string | null;
  isEnabled: boolean;
}
