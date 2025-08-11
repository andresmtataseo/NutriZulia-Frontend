import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { API_ENDPOINTS, API_PREFIX } from '../../../core/constants/api-endpoints';
import { ApiResponse } from '../../../core/models/api-response.interface';
import {
  User,
  UserWithInstitutions,
  PageResponse,
  UserSearchParams,
  CreateUserRequest
} from '../models/user.interface';
import {
  UserDetail,
  UserUpdateRequest,
  InstitutionAssignmentRequest,
  UserInstitutionUpdateRequest,
  UserHistoryEntry
} from '../../../core/models/user-detail.interface';
import { Institucion, Rol } from '../../../core/models';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /**
   * Obtiene usuarios con sus instituciones de forma paginada
   */
  getUsersWithInstitutions(params: UserSearchParams = {}): Observable<PageResponse<UserWithInstitutions>> {
    let httpParams = new HttpParams();

    if (params.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.size !== undefined) {
      httpParams = httpParams.set('size', params.size.toString());
    }
    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
    }
    if (params.sortDirection) {
      httpParams = httpParams.set('sortDir', params.sortDirection);
    }

    return this.http.get<PageResponse<UserWithInstitutions>>(
      `${this.baseUrl}${API_PREFIX}${API_ENDPOINTS.USER.USERS_WITH_INSTITUTIONS}`,
      { params: httpParams }
    );
  }

  /**
   * Obtiene todos los usuarios (método original)
   */
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}${API_PREFIX}${API_ENDPOINTS.USER.USERS_GET_ALL}`);
  }


  /**
   * Crear un nuevo usuario
   */
  createUser(userData: CreateUserRequest): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(`${this.baseUrl}${API_PREFIX}${API_ENDPOINTS.USER.USERS_CREATE}`, userData);
  }

  /**
   * Verifica si una cédula está disponible
   */
  checkCedulaAvailability(cedula: string): Observable<boolean> {
    const params = new HttpParams().set('cedula', cedula);
    return this.http.get<boolean>(`${this.baseUrl}${API_PREFIX}${API_ENDPOINTS.USER.USERS_CHECK_CEDULA}`, { params });
  }

  /**
   * Verifica si un correo electrónico está disponible
   */
  checkEmailAvailability(email: string): Observable<boolean> {
    const params = new HttpParams().set('email', email);
    return this.http.get<boolean>(`${this.baseUrl}${API_PREFIX}${API_ENDPOINTS.USER.USERS_CHECK_EMAIL}`, { params });
  }

  /**
   * Verifica si un número de teléfono está disponible
   */
  checkPhoneAvailability(phone: string): Observable<boolean> {
    const params = new HttpParams().set('phone', phone);
    return this.http.get<boolean>(`${this.baseUrl}${API_PREFIX}${API_ENDPOINTS.USER.USERS_CHECK_PHONE}`, { params });
  }

  /**
   * Obtener detalles de un usuario específico
   */
  getUserDetail(userId: number): Observable<UserDetail> {
    const params = new HttpParams().set('idUsuario', userId.toString());
    return this.http.get<ApiResponse<UserDetail>>(`${this.baseUrl}${API_PREFIX}${API_ENDPOINTS.USER.USERS_GET_DETAIL}`, { params })
      .pipe(
        map(response => response.data!)
      );
  }

  /**
   * Actualizar información de un usuario
   */
  updateUser(userId: number, userData: UserUpdateRequest): Observable<ApiResponse<UserDetail>> {
    const params = new HttpParams().set('idUsuario', userId.toString());
    return this.http.put<ApiResponse<UserDetail>>(`${this.baseUrl}${API_PREFIX}${API_ENDPOINTS.USER.USERS_UPDATE}`, userData, { params });
  }

  /**
   * Asignar usuario a una institución
   */
  assignUserToInstitution(assignmentData: InstitutionAssignmentRequest): Observable<ApiResponse<any>> {
    // Mapear los datos al formato esperado por el backend
    const backendRequest = {
      usuario_id: assignmentData.usuarioId,
      institucion_id: assignmentData.institucionId,
      rol_id: assignmentData.rolId,
      is_enabled: true
    };

    return this.http.post<ApiResponse<any>>(`${this.baseUrl}${API_PREFIX}${API_ENDPOINTS.USER.USERS_ASSIGN_INSTITUTION}`, backendRequest);
  }

  /**
   * Actualizar asignación de usuario a institución
   */
  updateUserInstitution(updateData: UserInstitutionUpdateRequest): Observable<any> {
    // Mapear los datos al formato esperado por el backend
    const backendRequest = {
      rol_id: updateData.rolId,
      is_enabled: updateData.isEnabled
    };

    const params = new HttpParams().set('id', updateData.id.toString());

    return this.http.put(`${this.baseUrl}${API_PREFIX}${API_ENDPOINTS.USER.USERS_UPDATE_INSTITUTION}`, backendRequest, { params });
  }

  /**
   * Remover usuario de una institución
   */
  removeUserFromInstitution(assignmentId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}${API_PREFIX}${API_ENDPOINTS.USER.USERS_REMOVE_INSTITUTION}/${assignmentId}`);
  }

  /**
   * Obtener historial de un usuario
   */
  getUserHistory(userId: number): Observable<UserHistoryEntry[]> {
    return this.http.get<UserHistoryEntry[]>(`${this.baseUrl}${API_PREFIX}${API_ENDPOINTS.USER.USERS_HISTORY}/${userId}`);
  }

  /**
   * Obtener lista de instituciones
   */
  getInstitutions(): Observable<Institucion[]> {
    return this.http.get<ApiResponse<Institucion[]>>(`${this.baseUrl}${API_PREFIX}${API_ENDPOINTS.CATALOG.INSTITUTIONS}`)
      .pipe(
        map(response => response.data!)
      );
  }

  /**
   * Obtener lista de roles
   */
  getRoles(): Observable<Rol[]> {
    return this.http.get<ApiResponse<Rol[]>>(`${this.baseUrl}${API_PREFIX}${API_ENDPOINTS.CATALOG.ROLES}`)
      .pipe(
        map(response => response.data!)
      );
  }

}
