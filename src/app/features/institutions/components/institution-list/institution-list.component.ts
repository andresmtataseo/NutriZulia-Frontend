import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { NotificationComponent } from '../../../../shared/components/notification/notification.component';
import { NotificationService } from '../../../../shared/services/notification.service';

@Component({
  selector: 'app-institution-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationComponent],
  templateUrl: './institution-list.component.html',
  styleUrl: './institution-list.component.css'
})
export class InstitutionListComponent {
  // Servicios inyectados
  public notificationService = inject(NotificationService);

  // Signals para el estado del componente
  loading = signal(false);
  institutionsResponse = signal<any>(null);
  selectedInstitution = signal<any>(null);
  showCreateModal = signal(false);
  showDetailModal = signal(false);

  // Signals para filtros y búsqueda
  searchTerm = signal('');
  sortBy = signal('nombre');
  sortDirection = signal('asc');
  pageSize = signal(10);

  constructor() {
    // TODO: Inyectar servicios adicionales cuando estén disponibles
    // private institutionService = inject(InstitutionService);
  }

  // Métodos de búsqueda y filtros
  onSearchChange(event: any): void {
    this.searchTerm.set(event.target.value);
    // TODO: Implementar lógica de búsqueda
  }

  onSearchEnter(): void {
    // TODO: Implementar búsqueda al presionar Enter
  }

  onSortByChange(event: any): void {
    this.sortBy.set(event.target.value);
    // TODO: Implementar lógica de ordenamiento
  }

  onSortDirectionChange(event: any): void {
    this.sortDirection.set(event.target.value);
    // TODO: Implementar lógica de ordenamiento
  }

  onPageSizeChange(event: any): void {
    this.pageSize.set(Number(event.target.value));
    // TODO: Implementar cambio de tamaño de página
  }

  onPageChange(page: number): void {
    // TODO: Implementar cambio de página
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

  openDetailModal(institution: any): void {
    this.selectedInstitution.set(institution);
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedInstitution.set(null);
  }

  // Métodos de eventos
  onInstitutionCreated(institution: any): void {
    // TODO: Implementar lógica después de crear institución
    this.closeCreateModal();
  }

  onInstitutionUpdated(institution: any): void {
    // TODO: Implementar lógica después de actualizar institución
    this.closeDetailModal();
  }

  // Métodos auxiliares para paginación
  getStartRecord(response: any): number {
    return response.page * response.size + 1;
  }

  getEndRecord(response: any): number {
    const end = (response.page + 1) * response.size;
    return Math.min(end, response.totalElements);
  }

  getPageNumbers(response: any): number[] {
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
}
