import { Injectable, inject } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { Observable, map } from 'rxjs'

import { environment } from '../../../environments/environment'
import { API_ENDPOINTS, API_PREFIX } from '../constants/api-endpoints'
import { ApiResponse } from '../models/api-response.interface'
import { TipoInstitucion } from '../models/catalog/tipo-institucion.interface'
import { MunicipioSanitario } from '../models/catalog/municipio-sanitario.interface'
import { Institucion } from '../models/catalog/institucion.interface'

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient)
  private readonly baseUrl = environment.apiUrl

  getInstitutionTypes(): Observable<TipoInstitucion[]> {
    return this.http
      .get<ApiResponse<TipoInstitucion[]>>(`${this.baseUrl}${API_PREFIX}${API_ENDPOINTS.CATALOG.INSTITUTIONS_TYPES}`)
      .pipe(map(response => response.data || []))
  }

  getHealthMunicipalities(): Observable<MunicipioSanitario[]> {
    return this.http
      .get<ApiResponse<MunicipioSanitario[]>>(`${this.baseUrl}${API_PREFIX}${API_ENDPOINTS.CATALOG.HEALTH_MUNICIPALITIES}`)
      .pipe(map(response => response.data || []))
  }

  // Corregido: usar HttpParams con municipioSanitarioId
  getInstitucionesByMunicipioSanitario(municipioId: number): Observable<Institucion[]> {
    const params = new HttpParams().set('municipioSanitarioId', municipioId.toString())
    return this.http
      .get<ApiResponse<Institucion[]>>(`${this.baseUrl}${API_PREFIX}${API_ENDPOINTS.CATALOG.INSTITUTIONS_BY_MUNICIPIO_SANITARIO}`, { params })
      .pipe(map(response => response.data || []))
  }
}