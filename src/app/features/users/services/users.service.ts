import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import {
  User,
  UserWithInstitutions,
  PageResponse,
  UserSearchParams,
  CreateUserRequest
} from '../models/user.interface';

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
      `${this.baseUrl}/api/v1${API_ENDPOINTS.USER.USERS_WITH_INSTITUTIONS}`,
      { params: httpParams }
    );
  }

  /**
   * Obtiene todos los usuarios (método original)
   */
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/api/v1${API_ENDPOINTS.USER.USERS_GET_ALL}`);
  }


  /**
   * Crea un nuevo usuario
   */
  createUser(user: CreateUserRequest): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/api/v1${API_ENDPOINTS.USER.USERS_CREATE}`, user);
  }

}
