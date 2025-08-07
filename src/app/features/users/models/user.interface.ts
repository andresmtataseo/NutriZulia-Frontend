export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  institution?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  role: string;
  institution?: string;
}

export interface UpdateUserRequest extends Partial<CreateUserRequest> {
  isActive?: boolean;
}