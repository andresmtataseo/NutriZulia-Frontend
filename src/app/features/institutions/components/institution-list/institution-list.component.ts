import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { NotificationComponent } from '../../../../shared/components/notification/notification.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { InstitutionService } from '../../services/institution.service';
import { InstitucionConUsuarios, PageResponse, InstitutionSearchParams } from '../../models/institution.interface';
import { Institucion } from '../../../../core/models';
import { InstitutionCreateModalComponent } from '../institution-create-modal/institution-create-modal.component';
import { InstitutionDetailModalComponent } from '../institution-detail-modal/institution-detail-modal.component';

@Component({
  selector: 'app-institution-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationComponent, InstitutionCreateModalComponent, InstitutionDetailModalComponent],
  templateUrl: './institution-list.component.html'
})
export class InstitutionListComponent implements OnInit {
  // Servicios inyectados
  public notificationService = inject(NotificationService);
  private institutionService = inject(InstitutionService);

  // Signals para el estado del componente
  loading = signal(false);
  institutionsResponse = signal<PageResponse<InstitucionConUsuarios> | null>(null);
  selectedInstitution = signal<InstitucionConUsuarios | null>(null);
  showCreateModal = signal(false);
  showDetailModal = signal(false);

  // Signals para filtros y búsqueda
  searchTerm = signal('');
  sortBy = signal('nombre');
  sortDirection = signal<'ASC' | 'DESC'>('ASC');
  currentPage = signal(0);
  pageSize = signal(10);

  ngOnInit(): void {
    this.loadInstitutions();
  }

  // Métodos de búsqueda y filtros
  onSearchChange(event: any): void {
    this.searchTerm.set(event.target.value);
    this.currentPage.set(0); // Reset to first page when searching
    this.loadInstitutions();
  }

  onSearchEnter(): void {
    this.currentPage.set(0);
    this.loadInstitutions();
  }

  onSortByChange(event: any): void {
    this.sortBy.set(event.target.value);
    this.currentPage.set(0);
    this.loadInstitutions();
  }

  onSortDirectionChange(event: any): void {
    this.sortDirection.set(event.target.value);
    this.currentPage.set(0);
    this.loadInstitutions();
  }

  // Métodos de paginación
  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadInstitutions();
  }

  onPageSizeChange(event: any): void {
    this.pageSize.set(parseInt(event.target.value));
    this.currentPage.set(0);
    this.loadInstitutions();
  }

  // Método principal para cargar instituciones
  private loadInstitutions(): void {
    this.loading.set(true);

    const params: InstitutionSearchParams = {
      page: this.currentPage(),
      size: this.pageSize(),
      sortBy: this.sortBy(),
      sortDir: this.sortDirection(),
      search: this.searchTerm() || undefined
    };

    this.institutionService.getInstitutionsWithUsers(params).subscribe({
      next: (response) => {
        this.institutionsResponse.set(response);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading institutions:', error);
        this.notificationService.showError('Error al cargar las instituciones');
        this.loading.set(false);
      }
    });
  }

  // Métodos de hover para efectos visuales
  onInstitutionRowHover(institutionId: number, isHovering: boolean): void {
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

  // Métodos de modal
  openCreateModal(): void {
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  openDetailModal(institution: InstitucionConUsuarios): void {
    this.selectedInstitution.set(institution);
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedInstitution.set(null);
  }

  // Métodos de eventos
  onInstitutionCreated(institution: Institucion): void {
    this.closeCreateModal();
    this.loadInstitutions(); // Reload data after creation
    this.notificationService.showSuccess('Institución creada exitosamente');
  }

  onInstitutionUpdated(institution: InstitucionConUsuarios): void {
    this.closeDetailModal();
    this.loadInstitutions(); // Reload data after update
    this.notificationService.showSuccess('Institución actualizada exitosamente');
  }

  // Métodos auxiliares para la vista
  getStartRecord(response: PageResponse<InstitucionConUsuarios>): number {
    return response.page * response.size + 1;
  }

  getEndRecord(response: PageResponse<InstitucionConUsuarios>): number {
    const end = (response.page + 1) * response.size;
    return Math.min(end, response.totalElements);
  }

  getPageNumbers(response: PageResponse<InstitucionConUsuarios>): number[] {
    const totalPages = response.totalPages;
    const currentPage = response.page;
    const pages: number[] = [];

    // Mostrar máximo 5 páginas
    const maxPages = 5;
    let startPage = Math.max(0, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxPages - 1);

    // Ajustar si no hay suficientes páginas al final
    if (endPage - startPage + 1 < maxPages) {
      startPage = Math.max(0, endPage - maxPages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  // Método para determinar el estado completo del usuario en la institución
  getUserStatus(user: any): { isActive: boolean; statusText: string; statusClass: string; iconClass: string } {
    const userEnabled = user.is_enabled;
    const institutionUserEnabled = user.usuario_institucion?.is_enabled;

    // Determinar el estado final basado solo en los flags de habilitación
    const isActive = userEnabled && institutionUserEnabled;

    let statusText = '';
    let statusClass = '';
    let iconClass = '';

    if (!userEnabled) {
      statusText = 'Usuario Inactivo';
      statusClass = 'bg-danger';
      iconClass = 'bi bi-person-x';
    } else if (!institutionUserEnabled) {
      statusText = 'Deshabilitado en Institución';
      statusClass = 'bg-warning text-dark';
      iconClass = 'bi bi-building-x';
    } else {
      statusText = 'Activo';
      statusClass = 'bg-success';
      iconClass = 'bi bi-check-circle';
    }

    return {
      isActive,
      statusText,
      statusClass,
      iconClass
    };
  }
}
