export interface Institution {
  id: string;
  name: string;
  code: string;
  address: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInstitutionRequest {
  name: string;
  code: string;
  address: string;
  phone?: string;
  email?: string;
}

export interface UpdateInstitutionRequest extends Partial<CreateInstitutionRequest> {
  isActive?: boolean;
}