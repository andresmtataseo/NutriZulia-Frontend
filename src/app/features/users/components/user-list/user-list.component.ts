import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, switchMap, catchError, of } from 'rxjs';

import { UsersService } from '../../services/users.service';
import { UserWithInstitutions, PageResponse, UserSearchParams, InstitutionRole } from '../../models/user.interface';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css']
})
export class UserListComponent implements OnInit {
  private usersService = inject(UsersService);
  private searchSubject = new Subject<string>();

  // Signals para el estado del componente
  usersResponse = signal<PageResponse<UserWithInstitutions> | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  // Parámetros de búsqueda y paginación
  searchTerm = signal<string>('');
  currentPage = signal<number>(0);
  pageSize = signal<number>(10);
  sortBy = signal<string>('nombres');
  sortDirection = signal<'asc' | 'desc'>('asc');

  ngOnInit(): void {
    this.setupSearch();
    this.loadUsers();
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(searchTerm => {
        this.searchTerm.set(searchTerm);
        this.currentPage.set(0);
        return this.performSearch();
      })
    ).subscribe();
  }

  private performSearch() {
    this.loading.set(true);
    this.error.set(null);

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
        this.error.set('Error al cargar los usuarios. Por favor, intente nuevamente.');
        return of(null);
      })
    );
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
    this.searchSubject.next(target.value);
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
   * Ver detalles del usuario (sin institución específica)
   */
  viewUserDetails(user: UserWithInstitutions): void {
    console.log('Ver detalles del usuario:', user);
    // TODO: Implementar modal o navegación para ver detalles del usuario
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
}
