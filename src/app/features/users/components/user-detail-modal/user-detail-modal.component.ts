import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { UsersService } from '../../services/users.service';
import { UserDetail, UserUpdateRequest, InstitutionAssignmentRequest, UserInstitutionUpdateRequest, UserHistoryEntry, UserInstitutionDetail } from '../../../../core/models/user-detail.interface';
import { Institucion, Rol } from '../../../../core/models';

@Component({
  selector: 'app-user-detail-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-detail-modal.component.html',
  styleUrls: ['./user-detail-modal.component.css']
})
export class UserDetailModalComponent implements OnInit, OnChanges {
  private fb = inject(FormBuilder);
  private usersService = inject(UsersService);

  @Input() show = false;
  @Input() user: UserDetail | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() userUpdated = new EventEmitter<UserDetail>();

  // Signals para el estado del componente
  activeTab = signal<'personal' | 'institutions' | 'assignment' | 'history'>('personal');
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  // Datos para los formularios
  institutions = signal<Institucion[]>([]);
  roles = signal<Rol[]>([]);
  userHistory = signal<UserHistoryEntry[]>([]);

  // Formularios
  personalForm!: FormGroup;
  assignmentForm!: FormGroup;

  // Signals computados
  canEdit = computed(() => this.user?.isEnabled ?? false);
  hasInstitutions = computed(() => (this.user?.instituciones?.length ?? 0) > 0);

  ngOnInit(): void {
    this.initializeForms();
    this.loadCatalogData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user'] && this.user) {
      this.updatePersonalForm();
      this.loadUserHistory();
    }
  }

  private initializeForms(): void {
    this.personalForm = this.fb.group({
      nombres: ['', [Validators.required, Validators.minLength(2)]],
      apellidos: ['', [Validators.required, Validators.minLength(2)]],
      cedula: ['', [Validators.required, Validators.pattern(/^\d{7,8}$/)]],
      correo: ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.pattern(/^\d{10,11}$/)]],
      fechaNacimiento: ['', Validators.required],
      genero: ['', Validators.required],
      isEnabled: [true]
    });

    this.assignmentForm = this.fb.group({
      institucionId: ['', Validators.required],
      rolId: ['', Validators.required],
      fechaInicio: ['', Validators.required],
      fechaFin: ['']
    });
  }

  private updatePersonalForm(): void {
    if (this.user) {
      this.personalForm.patchValue({
        nombres: this.user.nombres,
        apellidos: this.user.apellidos,
        cedula: this.user.cedula,
        correo: this.user.correo,
        telefono: this.user.telefono,
        fechaNacimiento: this.user.fechaNacimiento,
        genero: this.user.genero,
        isEnabled: this.user.isEnabled
      });
    }
  }

  private loadCatalogData(): void {
    this.loading.set(true);

    // Cargar instituciones
    this.usersService.getInstitutions().subscribe({
      next: (institutions) => {
        this.institutions.set(institutions);
      },
      error: (error) => {
        console.error('Error loading institutions:', error);
        this.error.set('Error al cargar las instituciones');
      }
    });

    // Cargar roles
    this.usersService.getRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
      },
      error: (error) => {
        console.error('Error loading roles:', error);
        this.error.set('Error al cargar los roles');
      }
    });

    // TODO: Cargar estados cuando esté disponible el endpoint
    // this.usersService.getStates().subscribe({
    //   next: (states) => {
    //     this.states.set(states);
    //   },
    //   error: (error) => {
    //     console.error('Error loading states:', error);
    //   }
    // });

    this.loading.set(false);
  }

  private loadUserHistory(): void {
    if (!this.user) return;

    this.loading.set(true);
    this.usersService.getUserHistory(this.user.id).subscribe({
      next: (history) => {
        this.userHistory.set(history);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading user history:', error);
        this.error.set('Error al cargar el historial del usuario');
        this.loading.set(false);
      }
    });
  }

  setActiveTab(tab: 'personal' | 'institutions' | 'assignment' | 'history'): void {
    this.activeTab.set(tab);
    this.clearMessages();

    if (tab === 'history' && this.userHistory().length === 0) {
      this.loadUserHistory();
    }
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  closeModal(): void {
    this.clearMessages();
    this.activeTab.set('personal');
    this.close.emit();
  }

  private clearMessages(): void {
    this.error.set(null);
    this.success.set(null);
  }

  // Gestión de datos personales
  onPersonalFormSubmit(): void {
    if (this.personalForm.invalid || !this.user) return;

    this.loading.set(true);
    this.clearMessages();

    const updateRequest: UserUpdateRequest = {
      ...this.personalForm.value
    };

    this.usersService.updateUser(this.user.id, updateRequest).subscribe({
      next: (updatedUser) => {
        this.success.set('Datos personales actualizados correctamente');
        this.userUpdated.emit(updatedUser);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error updating user:', error);
        this.error.set('Error al actualizar los datos del usuario');
        this.loading.set(false);
      }
    });
  }

  // Gestión de asignaciones institucionales
  onAssignmentFormSubmit(): void {
    if (this.assignmentForm.invalid || !this.user) return;

    this.loading.set(true);
    this.clearMessages();

    const assignmentRequest: InstitutionAssignmentRequest = {
      usuarioId: this.user.id,
      ...this.assignmentForm.value
    };

    this.usersService.assignUserToInstitution(assignmentRequest).subscribe({
      next: (assignment) => {
        this.success.set('Usuario asignado a la institución correctamente');
        this.assignmentForm.reset();
        // Recargar datos del usuario
        this.reloadUserData();
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error assigning user to institution:', error);
        this.error.set('Error al asignar el usuario a la institución');
        this.loading.set(false);
      }
    });
  }

  updateInstitutionAssignment(assignment: UserInstitutionDetail): void {
    // TODO: Implementar modal o formulario inline para editar asignación
    console.log('Update assignment:', assignment);
  }

  toggleInstitutionAssignment(assignment: UserInstitutionDetail): void {
    if (!this.user) return;

    this.loading.set(true);
    this.clearMessages();

    const updateRequest: UserInstitutionUpdateRequest = {
      id: assignment.id,
      rolId: assignment.rolId,
      fechaInicio: assignment.fechaInicio,
      fechaFin: assignment.fechaFin,
      isEnabled: !assignment.isEnabled
    };

    this.usersService.updateUserInstitution(updateRequest).subscribe({
      next: () => {
        const action = assignment.isEnabled ? 'desactivada' : 'activada';
        this.success.set(`Asignación ${action} correctamente`);
        this.reloadUserData();
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error updating institution assignment:', error);
        this.error.set('Error al actualizar la asignación');
        this.loading.set(false);
      }
    });
  }

  removeInstitutionAssignment(assignment: UserInstitutionDetail): void {
    if (!this.user) return;

    const institutionName = assignment.institucion.nombre;
    const confirmMessage = `¿Está seguro que desea remover la asignación de ${this.user.nombres} ${this.user.apellidos} de ${institutionName}?\n\nEsta acción no se puede deshacer.`;

    if (!confirm(confirmMessage)) return;

    this.loading.set(true);
    this.clearMessages();

    this.usersService.removeUserFromInstitution(assignment.id).subscribe({
      next: () => {
        this.success.set('Asignación removida correctamente');
        this.reloadUserData();
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error removing institution assignment:', error);
        this.error.set('Error al remover la asignación');
        this.loading.set(false);
      }
    });
  }

  private reloadUserData(): void {
    if (!this.user) return;

    this.usersService.getUserDetail(this.user.id).subscribe({
      next: (userDetail) => {
        this.user = userDetail;
        this.userUpdated.emit(userDetail);
      },
      error: (error) => {
        console.error('Error reloading user data:', error);
      }
    });
  }

  // Utilidades para el template
  getRoleBadgeClass(roleName: string): string {
    const roleClasses: { [key: string]: string } = {
      'Nutricionista Sup': 'bg-danger text-white',
      'Nutricionista': 'bg-info text-white',
      'Administrador': 'bg-success text-white',
      'Supervisor': 'bg-warning text-dark',
    };

    return roleClasses[roleName] || 'bg-secondary text-white';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES');
  }

  getFormControlError(controlName: string, formGroup: FormGroup = this.personalForm): string | null {
    const control = formGroup.get(controlName);
    if (!control || !control.errors || !control.touched) return null;

    const errors = control.errors;
    if (errors['required']) return `${controlName} es requerido`;
    if (errors['email']) return 'Formato de correo inválido';
    if (errors['pattern']) return 'Formato inválido';
    if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres`;

    return 'Campo inválido';
  }
}