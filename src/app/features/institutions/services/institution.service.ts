import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { API_ENDPOINTS, API_PREFIX } from '../../../core/constants/api-endpoints';
import { ApiResponse } from '../../../core/models/api-response.interface';
import { Institucion } from '../../../core/models/catalog/institucion.interface';
import {
  InstitucionConUsuarios,
  PageResponse,
  InstitutionSearchParams
} from '../models/institution.interface';

@Injectable({
  providedIn: 'root'
})
export class InstitutionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /**
   * Obtiene instituciones con sus usuarios asociados de forma paginada
   */
  getInstitutionsWithUsers(params: InstitutionSearchParams = {}): Observable<PageResponse<InstitucionConUsuarios>> {
    let httpParams = new HttpParams();

    if (params.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.size !== undefined) {
      httpParams = httpParams.set('size', params.size.toString());
    }
    if (params.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
    }
    if (params.sortDir) {
      httpParams = httpParams.set('sortDir', params.sortDir);
    }
    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }

    return this.http.get<PageResponse<InstitucionConUsuarios>>(
      `${this.baseUrl}${API_PREFIX}/catalog/institutions/get-all/users`,
      { params: httpParams }
    );
  }

  /**
   * Obtiene una institución específica por ID con sus usuarios
   */
  getInstitutionById(id: number): Observable<ApiResponse<InstitucionConUsuarios>> {
    return this.http.get<ApiResponse<InstitucionConUsuarios>>(
      `${this.baseUrl}${API_PREFIX}${API_ENDPOINTS.CATALOG.INSTITUTIONS}/${id}`
    );
  }

  /**
   * Crea una nueva institución
   */
  createInstitution(institutionData: Omit<Institucion, 'id'>): Observable<ApiResponse<Institucion>> {
    return this.http.post<ApiResponse<Institucion>>(
      `${this.baseUrl}${API_PREFIX}${API_ENDPOINTS.CATALOG.INSTITUTIONS}`,
      institutionData
    );
  }

  /**
   * Actualiza una institución existente
   */
  updateInstitution(id: number, institutionData: Partial<Institucion>): Observable<ApiResponse<Institucion>> {
    return this.http.put<ApiResponse<Institucion>>(
      `${this.baseUrl}${API_PREFIX}${API_ENDPOINTS.CATALOG.INSTITUTIONS}/${id}`,
      institutionData
    );
  }
}
