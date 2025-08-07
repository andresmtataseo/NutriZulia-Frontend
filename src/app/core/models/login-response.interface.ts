import { Rol } from './rol.interface';
import { User } from './user.interface';

export interface LoginResponse {
  token: string;
  type: string;
  user: User;
  rol: Rol;
}
