import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { API_ENDPOINTS, API_PREFIX } from '../../../core/constants/api-endpoints';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /**
   * Descarga el reporte anual para un municipio sanitario y año.
   * El backend devuelve un archivo Excel (octet-stream), por lo que usamos responseType 'blob'.
   */
  downloadAnnualReport(municipioSanitarioId: number, anio: number): Observable<Blob> {
    const params = new HttpParams()
      .set('municipioSanitarioId', municipioSanitarioId)
      .set('anio', anio);

    return this.http.get(`${this.baseUrl}${API_PREFIX}${API_ENDPOINTS.REPORT.ANNUAL}`,
      { params, responseType: 'blob' }
    );
  }

  /**
   * Obtiene la frescura de datos (JSON) por municipio sanitario.
   */
  getDataFreshnessByMunicipio(municipioSanitarioId: number): Observable<any> {
    const params = new HttpParams().set('municipioSanitarioId', municipioSanitarioId);
    return this.http.get(`${this.baseUrl}${API_PREFIX}${API_ENDPOINTS.REPORT.DATA_FRESHNESS}`, { params });
  }

  /**
   * Descarga el reporte trimestral para un municipio sanitario, año y número de trimestre [1..4].
   */
  downloadQuarterlyReport(municipioSanitarioId: number, anio: number, trimestre: number): Observable<Blob> {
    const params = new HttpParams()
      .set('municipioSanitarioId', municipioSanitarioId)
      .set('anio', anio)
      .set('trimestre', trimestre);

    return this.http.get(`${this.baseUrl}${API_PREFIX}${API_ENDPOINTS.REPORT.QUARTERLY}`,
      { params, responseType: 'blob' }
    );
  }

}
