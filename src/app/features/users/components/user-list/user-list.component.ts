import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, switchMap, catchError, of } from 'rxjs';

import { UsersService } from '../../services/users.service';
import { UserWithInstitutions, PageResponse, UserSearchParams, InstitutionRole, User } from '../../models/user.interface';
import { UserCreateModalComponent } from '../user-create-modal/user-create-modal.component';
import { UserDetailModalComponent } from '../user-detail-modal/user-detail-modal.component';
import { UserDetail } from '../../../../core/models/user-detail.interface';
import { NotificationService } from '../../../../shared/services/notification.service';
import { NotificationComponent } from '../../../../shared/components/notification/notification.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, UserCreateModalComponent, UserDetailModalComponent, NotificationComponent],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css']
})
export class UserListComponent implements OnInit {
  private usersService = inject(UsersService);
  public notificationService = inject(NotificationService);
  private searchSubject = new Subject<string>();

  // Signals para el estado del componente
  usersResponse = signal<PageResponse<UserWithInstitutions> | null>(null);
  loading = signal<boolean>(false);

  // Parámetros de búsqueda y paginación
  searchTerm = signal<string>('');
  currentPage = signal<number>(0);
  pageSize = signal<number>(10);
  sortBy = signal<string>('nombres');
  sortDirection = signal<'asc' | 'desc'>('asc');

  // Signal para controlar el modal de creación
  showCreateModal = signal<boolean>(false);

  // Signals para controlar el modal de detalles
  showDetailModal = signal<boolean>(false);
  selectedUser = signal<UserDetail | null>(null);

  ngOnInit(): void {
    this.setupSearch();
    this.loadUsers();
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      distinctUntilChanged(),
      debounceTime(500), // Aumentado a 500ms para dar más tiempo al usuario
      switchMap(searchTerm => {
        this.searchTerm.set(searchTerm);
        this.currentPage.set(0);
        this.loading.set(true);
        return this.performSearchRequest();
      })
    ).subscribe(response => {
      this.loading.set(false);
      if (response) {
        this.usersResponse.set(response);
      }
    });
  }

  private performSearchRequest() {
    const params: UserSearchParams = {
      page: this.currentPage(),
      size: this.pageSize(),
      search: this.searchTerm(),
      sortBy: this.sortBy(),
      sortDirection: this.sortDirection()
    };

    return this.usersService.getUsersWithInstitutions(params).pipe(
      catchError(error => {
        console.error('Error loading users:', error);
        this.notificationService.showError('Error al cargar los usuarios. Por favor, intente nuevamente.');
        return of(null);
      })
    );
  }

  private performSearch() {
    this.loading.set(true);
    return this.performSearchRequest();
  }

  loadUsers(): void {
    this.performSearch().subscribe(response => {
      this.loading.set(false);
      if (response) {
        this.usersResponse.set(response);
      }
    });
  }

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target && target.value !== undefined) {
      this.searchSubject.next(target.value);
    }
  }

  onSearchEnter(): void {
    // Cancelar cualquier búsqueda pendiente del debounce
    this.searchSubject.next('');
    // Ejecutar búsqueda inmediata
    this.currentPage.set(0);
    this.loadUsers();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadUsers();
  }

  onPageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.pageSize.set(Number(target.value));
    this.currentPage.set(0);
    this.loadUsers();
  }

  onSortByChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.sortBy.set(target.value);
    this.currentPage.set(0);
    this.loadUsers();
  }

  onSortDirectionChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.sortDirection.set(target.value as 'asc' | 'desc');
    this.currentPage.set(0);
    this.loadUsers();
  }

  /**
   * Obtiene el número del primer registro mostrado
   */
  getStartRecord(response: PageResponse<UserWithInstitutions>): number {
    if (!response || response.empty || response.totalElements === 0) {
      return 0;
    }
    return (response.page * response.size) + 1;
  }

  /**
   * Obtiene el número del último registro mostrado
   */
  getEndRecord(response: PageResponse<UserWithInstitutions>): number {
    if (!response || response.empty || response.totalElements === 0) {
      return 0;
    }
    return Math.min((response.page + 1) * response.size, response.totalElements);
  }

  /**
   * Obtiene los números de página para mostrar en la paginación
   */
  getPageNumbers(response: PageResponse<UserWithInstitutions>): number[] {
    const totalPages = response.totalPages;
    const currentPage = response.page;
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i);
    }

    const startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);

    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  }

  /**
   * Obtiene la clase CSS para el badge del rol
   */
  getRoleBadgeClass(roleName: string): string {
    const roleClasses: { [key: string]: string } = {
      'Nutricionista Sup': 'bg-danger-subtle text-danger',
      'Nutricionista': 'bg-info-subtle text-info',
      'Administrador': 'bg-success-subtle text-success',
      'Supervisor': 'bg-warning-subtle text-warning',
    };

    return roleClasses[roleName] || 'bg-secondary-subtle text-secondary';
  }

  /**
   * Maneja el hover sobre las filas de usuario para agrupar visualmente
   */
  onUserRowHover(userId: number, isHovering: boolean): void {
    // Seleccionar todas las filas del mismo usuario
    const rows = document.querySelectorAll(`tr[data-user-id="${userId}"]`);

    rows.forEach(row => {
      if (isHovering) {
        row.classList.add('hovered');
        // También agregar la clase a todas las celdas para asegurar el efecto
        const cells = row.querySelectorAll('td');
        cells.forEach(cell => {
          cell.style.backgroundColor = 'rgba(0, 123, 255, 0.05)';
        });
      } else {
        row.classList.remove('hovered');
        // Remover el estilo inline de las celdas
        const cells = row.querySelectorAll('td');
        cells.forEach(cell => {
          cell.style.backgroundColor = '';
        });
      }
    });
  }

  /**
   * Expone Math para usar en el template
   */
  Math = Math;

  trackByUserId(index: number, user: UserWithInstitutions): number {
    return user.id;
  }

  trackByInstitutionId(index: number, institution: InstitutionRole): number {
    return institution.institucionId;
  }

  /**
   * Abrir modal de detalles de usuario
   */
  openDetailModal(user: UserWithInstitutions): void {
    this.loading.set(true);

    this.usersService.getUserDetail(user.id).subscribe({
      next: (userDetail) => {
        this.selectedUser.set(userDetail);
        this.showDetailModal.set(true);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading user details:', error);
        this.notificationService.showError('Error al cargar los detalles del usuario');
        this.loading.set(false);
      }
    });
  }

  /**
   * Editar usuario
   */
  editUser(user: UserWithInstitutions): void {
    console.log('Editar usuario:', user);
    // TODO: Implementar modal o formulario para editar el usuario
  }

  /**
   * Asignar usuario a una institución
   */
  assignUserToInstitution(user: UserWithInstitutions): void {
    console.log('Asignar usuario a institución:', user);
    // TODO: Implementar modal para asignar el usuario a una institución
  }

  /**
   * Alternar el estado del usuario
   */
  toggleUserStatus(user: UserWithInstitutions): void {
    console.log('Cambiar estado del usuario:', user);
    const action = user.isEnabled ? 'desactivar' : 'activar';
    const message = `¿Está seguro que desea ${action} al usuario ${user.nombres} ${user.apellidos}?`;

    if (confirm(message)) {
      // TODO: Implementar llamada al servicio para cambiar el estado del usuario
      console.log(`${action} usuario confirmado`);
    }
  }

  /**
   * Ver detalles de la asignación usuario-institución
   */
  viewUserInstitutionDetails(user: UserWithInstitutions, institutionRole: InstitutionRole): void {
    console.log('Ver detalles:', { user, institutionRole });
    // TODO: Implementar modal o navegación para ver detalles
  }

  /**
   * Editar la asignación usuario-institución
   */
  editUserInstitution(user: UserWithInstitutions, institutionRole: InstitutionRole): void {
    console.log('Editar asignación:', { user, institutionRole });
    // TODO: Implementar modal o formulario para editar la asignación
  }

  /**
   * Alternar el estado de la asignación usuario-institución
   */
  toggleUserInstitutionStatus(user: UserWithInstitutions, institutionRole: InstitutionRole): void {
    console.log('Cambiar estado:', { user, institutionRole });
    // TODO: Implementar llamada al servicio para cambiar el estado
    const action = institutionRole.isEnabled ? 'suspender' : 'activar';
    const message = `¿Está seguro que desea ${action} la asignación de ${user.nombres} ${user.apellidos} en ${institutionRole.institucionNombre}?`;

    if (confirm(message)) {
      // Aquí iría la llamada al servicio
      console.log(`${action} asignación confirmado`);
    }
  }

  /**
   * Remover usuario de la institución
   */
  removeUserFromInstitution(user: UserWithInstitutions, institutionRole: InstitutionRole): void {
    console.log('Remover de institución:', { user, institutionRole });
    const message = `¿Está seguro que desea remover a ${user.nombres} ${user.apellidos} de ${institutionRole.institucionNombre}?\n\nEsta acción no se puede deshacer.`;

    if (confirm(message)) {
      // TODO: Implementar llamada al servicio para remover la asignación
      console.log('Remoción confirmada');
    }
  }

  /**
   * Abrir modal de creación de usuario
   */
  openCreateModal(): void {
    this.showCreateModal.set(true);
  }

  /**
   * Cerrar modal de creación de usuario
   */
  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  /**
   * Manejar la creación exitosa de un usuario
   */
  onUserCreated(user: User): void {
    console.log('Usuario creado exitosamente:', user);
    this.closeCreateModal();
    // Recargar la lista de usuarios para mostrar el nuevo usuario
    this.loadUsers();
  }

  /**
   * Cerrar modal de detalles de usuario
   */
  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedUser.set(null);
  }

  /**
   * Manejar la actualización exitosa de un usuario
   */
  onUserUpdated(user: UserDetail): void {
    console.log('Usuario actualizado exitosamente:', user);
    // Recargar la lista de usuarios para mostrar los cambios
    this.loadUsers();
  }
}
