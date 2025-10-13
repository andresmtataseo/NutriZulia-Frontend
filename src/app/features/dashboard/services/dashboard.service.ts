import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { API_PREFIX, API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.interface';
import { ChartResponseDto } from '../models/chart.models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  private buildParams(params: Record<string, string | number | undefined>): HttpParams {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return httpParams;
  }

  getConsultasPorMes(inicio: string, fin: string, municipioId?: number, institucionId?: number): Observable<ChartResponseDto> {
    const params = this.buildParams({ inicio, fin, municipioId, institucionId });
    const url = `${this.baseUrl}${API_PREFIX}${API_ENDPOINTS.DASHBOARD.CONSULTATIONS_PER_MONTH}`;
    return this.http.get<ApiResponse<ChartResponseDto>>(url, { params }).pipe(map(r => r.data!));
  }

  getInstitucionesActivasPorMunicipio(municipioId?: number): Observable<ChartResponseDto> {
    const params = this.buildParams({ municipioId });
    const url = `${this.baseUrl}${API_PREFIX}${API_ENDPOINTS.DASHBOARD.ACTIVE_INSTITUTIONS_BY_MUNICIPALITY}`;
    return this.http.get<ApiResponse<ChartResponseDto>>(url, { params }).pipe(map(r => r.data!));
  }

  getUsuariosActivosPorInstitucion(municipioId?: number): Observable<ChartResponseDto> {
    const params = this.buildParams({ municipioId });
    const url = `${this.baseUrl}${API_PREFIX}${API_ENDPOINTS.DASHBOARD.ACTIVE_USERS_BY_INSTITUTION}`;
    return this.http.get<ApiResponse<ChartResponseDto>>(url, { params }).pipe(map(r => r.data!));
  }

  getDistribucionGrupoEtario(inicio: string, fin: string, institucionId?: number, municipioId?: number): Observable<ChartResponseDto> {
    const params = this.buildParams({ inicio, fin, institucionId, municipioId });
    const url = `${this.baseUrl}${API_PREFIX}${API_ENDPOINTS.DASHBOARD.AGE_GROUP_DISTRIBUTION}`;
    return this.http.get<ApiResponse<ChartResponseDto>>(url, { params }).pipe(map(r => r.data!));
  }

  getEstadoNutricionalPorGrupoEtario(inicio: string, fin: string, institucionId?: number, municipioId?: number): Observable<ChartResponseDto> {
    const params = this.buildParams({ inicio, fin, institucionId, municipioId });
    const url = `${this.baseUrl}${API_PREFIX}${API_ENDPOINTS.DASHBOARD.NUTRITIONAL_STATUS_BY_AGE_GROUP}`;
    return this.http.get<ApiResponse<ChartResponseDto>>(url, { params }).pipe(map(r => r.data!));
  }
}