import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { NotificationComponent } from '../../../../shared/components/notification/notification.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { CatalogService } from '../../../../core/services/catalog.service';
import { InstitutionService } from '../../../institutions/services/institution.service';
import { MunicipioSanitario } from '../../../../core/models/catalog/municipio-sanitario.interface';
import { Institucion } from '../../../../core/models/catalog/institucion.interface';

@Component({
  selector: 'app-report-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationComponent],
  templateUrl: './report-list.component.html'
})
export class ReportListComponent implements OnInit {
  // Servicios inyectados
  public notificationService = inject(NotificationService);
  private catalogService = inject(CatalogService);
  private institutionService = inject(InstitutionService);

  // Señales para el estado reactivo
  municipiosSanitarios = signal<MunicipioSanitario[]>([]);
  instituciones = signal<Institucion[]>([]);
  selectedMunicipioId = signal<number | null>(null);
  selectedInstitucionId = signal<number | null>(null);
  isLoadingInstituciones = signal<boolean>(false);

  ngOnInit(): void {
    this.loadMunicipiosSanitarios();
  }

  /**
   * Carga la lista de municipios sanitarios
   */
  private loadMunicipiosSanitarios(): void {
    this.catalogService.getHealthMunicipalities().subscribe({
      next: (municipios) => {
        this.municipiosSanitarios.set(municipios);
      },
      error: (error) => {
        console.error('Error al cargar municipios sanitarios:', error);
        this.notificationService.showError('Error al cargar los municipios sanitarios');
      }
    });
  }

  /**
   * Maneja el cambio de selección del municipio sanitario
   */
  onMunicipioChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const municipioId = target.value ? parseInt(target.value, 10) : null;
    
    this.selectedMunicipioId.set(municipioId);
    this.selectedInstitucionId.set(null); // Reset institución seleccionada
    this.instituciones.set([]); // Limpiar lista de instituciones

    if (municipioId) {
      this.loadInstituciones(municipioId);
    }
  }

  /**
   * Carga las instituciones por municipio sanitario
   */
  private loadInstituciones(municipioId: number): void {
    this.isLoadingInstituciones.set(true);
    
    this.institutionService.getInstitutionsByMunicipioSanitario(municipioId).subscribe({
      next: (response) => {
        this.instituciones.set(response.data || []);
        this.isLoadingInstituciones.set(false);
      },
      error: (error) => {
        console.error('Error al cargar instituciones:', error);
        this.notificationService.showError('Error al cargar las instituciones');
        this.isLoadingInstituciones.set(false);
      }
    });
  }

  /**
   * Maneja el cambio de selección de la institución
   */
  onInstitucionChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const institucionId = target.value ? parseInt(target.value, 10) : null;
    this.selectedInstitucionId.set(institucionId);
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}