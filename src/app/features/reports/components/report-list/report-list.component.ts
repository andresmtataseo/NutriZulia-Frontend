import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { NotificationComponent } from '../../../../shared/components/notification/notification.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { CatalogService } from '../../../../core/services/catalog.service';
import { InstitutionService } from '../../../institutions/services/institution.service';
import { MunicipioSanitario } from '../../../../core/models/catalog/municipio-sanitario.interface';
import { Institucion } from '../../../../core/models/catalog/institucion.interface';
import { ReportService } from '../../services/report.service';

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
  private reportService = inject(ReportService);

  // Señales para el estado reactivo
  municipiosSanitarios = signal<MunicipioSanitario[]>([]);
  instituciones = signal<Institucion[]>([]);
  selectedMunicipioId = signal<number | null>(null);
  selectedInstitucionId = signal<number | null>(null);
  isLoadingInstituciones = signal<boolean>(false);
  isGeneratingReport = signal<boolean>(false);

  // Filtros de tiempo (nuevo)
  selectedYear = signal<number>(new Date().getFullYear());
  selectedPeriod = signal<string>('ANUAL');
  availableYears = signal<number[]>([]);
  selectedFechaInicio = signal<string>('');
  selectedFechaFin = signal<string>('');

  // Trimestre mapeado a número [1..4]
  getSelectedQuarter(): number | null {
    const period = this.selectedPeriod();
    switch (period) {
      case 'TRIMESTRE I': return 1;
      case 'TRIMESTRE II': return 2;
      case 'TRIMESTRE III': return 3;
      case 'TRIMESTRE IV': return 4;
      default: return null;
    }
  }

  // Estado de actualización de datos
  isLoadingFreshness = signal<boolean>(false);
  institucionFreshnessList = signal<any[]>([]);

  ngOnInit(): void {
    this.loadMunicipiosSanitarios();
    // Inicializar años disponibles y el rango de fechas por defecto
    this.availableYears.set(this.generateYears(10));
    this.computeDatesForSelection();
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

    // Reiniciar filtros de tiempo al cambiar municipio
    this.selectedYear.set(new Date().getFullYear());
    this.selectedPeriod.set('ANUAL');
    this.computeDatesForSelection();

    // Limpiar tabla de frescura
    this.institucionFreshnessList.set([]);

    if (municipioId) {
      this.loadInstituciones(municipioId);
      // Cargar frescura de datos automáticamente al seleccionar municipio
      this.fetchDataFreshness();
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

  /**
   * Maneja el cambio de año del filtro
   */
  onYearChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const year = parseInt(target.value, 10);
    this.selectedYear.set(year);
    this.computeDatesForSelection();
  }

  /**
   * Maneja el cambio de periodo del filtro
   */
  onPeriodChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const period = target.value;
    this.selectedPeriod.set(period);
    this.computeDatesForSelection();
  }

  /**
   * Genera una lista de años desde el actual hacia atrás
   */
  private generateYears(count: number): number[] {
    const current = new Date().getFullYear();
    return Array.from({ length: count }, (_, i) => current - i);
  }

  /**
   * Calcula fechaInicio y fechaFin en base al año y periodo seleccionados
   */
  private computeDatesForSelection(): void {
    const year = this.selectedYear();
    const period = this.selectedPeriod();
    let start = '';
    let end = '';

    switch (period) {
      case 'TRIMESTRE I':
        start = `${year}-01-01`;
        end = `${year}-03-31`;
        break;
      case 'TRIMESTRE II':
        start = `${year}-04-01`;
        end = `${year}-06-30`;
        break;
      case 'TRIMESTRE III':
        start = `${year}-07-01`;
        end = `${year}-09-30`;
        break;
      case 'TRIMESTRE IV':
        start = `${year}-10-01`;
        end = `${year}-12-31`;
        break;
      default: // ANUAL
        start = `${year}-01-01`;
        end = `${year}-12-31`;
        break;
    }

    this.selectedFechaInicio.set(start);
    this.selectedFechaFin.set(end);
    // Si existe lógica de recarga de reportes, invocarla aquí usando selectedFechaInicio() y selectedFechaFin()
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

  // Helper para descargar archivos Blob de forma reutilizable
  private downloadBlobFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  // Habilita/deshabilita el botón de exportación según los parámetros seleccionados
  canExport(): boolean {
    const municipioId = this.selectedMunicipioId();
    if (!municipioId || this.isGeneratingReport()) return false;
    const period = this.selectedPeriod();
    if (period === 'ANUAL') return true;
    const quarter = this.getSelectedQuarter();
    return quarter !== null;
  }

  // Exportación dinámica: decide entre anual y trimestral según el periodo seleccionado
  exportReport(): void {
    const municipioId = this.selectedMunicipioId();
    const year = this.selectedYear();
    const period = this.selectedPeriod();

    if (!municipioId) {
      this.notificationService.showError('Seleccione un municipio sanitario para generar el reporte');
      return;
    }

    this.isGeneratingReport.set(true);

    if (period === 'ANUAL') {
      this.reportService.downloadAnnualReport(municipioId, year).subscribe({
        next: (blob: Blob) => {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `reporte_anual_municipio_${municipioId}_${year}_${timestamp}.xlsx`;
          this.downloadBlobFile(blob, filename);
          this.notificationService.showSuccess('Reporte anual generado y descargado exitosamente');
          this.isGeneratingReport.set(false);
        },
        error: (error) => {
          console.error('Error al generar/descargar reporte anual:', error);
          const message = (error?.error?.message) ? error.error.message : 'Error al generar el reporte anual';
          this.notificationService.showError(message);
          this.isGeneratingReport.set(false);
        }
      });
    } else {
      const quarter = this.getSelectedQuarter();
      if (!quarter) {
        this.notificationService.showInfo('Selecciona un periodo trimestral (I, II, III, IV) para generar el reporte trimestral.');
        this.isGeneratingReport.set(false);
        return;
      }

      this.reportService.downloadQuarterlyReport(municipioId, year, quarter).subscribe({
        next: (blob: Blob) => {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `reporte_trimestral_municipio_${municipioId}_${year}_T${quarter}_${timestamp}.xlsx`;
          this.downloadBlobFile(blob, filename);
          this.notificationService.showSuccess('Reporte trimestral generado y descargado exitosamente');
          this.isGeneratingReport.set(false);
        },
        error: (error) => {
          console.error('Error al generar/descargar reporte trimestral:', error);
          const message = (error?.error?.message) ? error.error.message : 'Error al generar el reporte trimestral';
          this.notificationService.showError(message);
          this.isGeneratingReport.set(false);
        }
      });
    }
  }

  /**
   * Carga/Actualiza la actualización de datos por municipio sanitario seleccionado.
   */
  fetchDataFreshness(): void {
    const municipioId = this.selectedMunicipioId();
    if (!municipioId) {
      this.notificationService.showInfo('Seleccione un municipio sanitario para consultar la actualización de datos');
      return;
    }

    this.isLoadingFreshness.set(true);

    this.reportService.getDataFreshnessByMunicipio(municipioId).subscribe({
      next: (response) => {
        // La API generalmente responde con { data: InstitucionDataFreshness[] }
        const list = Array.isArray(response?.data)
          ? response.data
          : (Array.isArray(response) ? response : []);
        this.institucionFreshnessList.set(list);
        this.isLoadingFreshness.set(false);
      },
      error: (error) => {
        console.error('Error al obtener actualización de datos:', error);
        const message = (error?.error?.message) ? error.error.message : 'Error al consultar la actualización de datos';
        this.notificationService.showError(message);
        this.isLoadingFreshness.set(false);
      }
    });
  }

  /**
   * Helpers para presentación en la tabla de frescura
   */
  getFullName(user: any): string {
    return `${user.nombres} ${user.apellidos}`.trim();
  }

  formatDate(iso: string | null): string {
    if (!iso) return 'Sin registros';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Fecha inválida';
    return d.toLocaleString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  // Métodos de hover para efectos visuales (resalta todas las filas del mismo grupo de institución)
  onFreshnessRowHover(institutionId: number, isHovering: boolean): void {
    const rows = document.querySelectorAll(`[data-institution-id="${institutionId}"]`);
    rows.forEach(row => {
      if (isHovering) {
        row.classList.add('hovered');
        // Aplicar color de fondo a todas las celdas de las filas agrupadas
        const cells = row.querySelectorAll('td');
        cells.forEach(cell => {
          (cell as HTMLElement).style.backgroundColor = 'rgba(0, 123, 255, 0.05)';
        });
      } else {
        row.classList.remove('hovered');
        // Remover color de fondo
        const cells = row.querySelectorAll('td');
        cells.forEach(cell => {
          (cell as HTMLElement).style.backgroundColor = '';
        });
      }
    });
  }

}
