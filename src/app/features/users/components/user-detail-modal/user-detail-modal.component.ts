import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { catchError, of, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

import { UsersService } from '../../services/users.service';
import { UserDetail, UserUpdateRequest, InstitutionAssignmentRequest, UserInstitutionDetail } from '../../../../core/models/user-detail.interface';
import { Institucion, Rol } from '../../../../core/models';
import { NotificationService } from '../../../../shared/services/notification.service';
import { venezuelanPhonePrefixValidator, phoneNumberValidator } from '../../../../shared/validators/phone.validators';
import { ManageAssignmentModalComponent } from '../manage-assignment-modal/manage-assignment-modal.component';

@Component({
  selector: 'app-user-detail-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ManageAssignmentModalComponent],
  templateUrl: './user-detail-modal.component.html'
})
export class UserDetailModalComponent implements OnInit, OnChanges {
  private fb = inject(FormBuilder);
  private usersService = inject(UsersService);
  private notificationService = inject(NotificationService);

  @Input() show = false;
  @Input() user: UserDetail | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() userUpdated = new EventEmitter<UserDetail>();

  // Señales para el estado del componente
  activeTab = signal<'personal' | 'institutions' | 'assignment'>('personal');
  institutions = signal<Institucion[]>([]);
  roles = signal<Rol[]>([]);
  loading = signal(false);
  checkingCedula = signal<boolean>(false);
  checkingEmail = signal<boolean>(false);
  checkingPhone = signal<boolean>(false);

  // Modal states
  showManageModal = signal(false);
  selectedAssignment = signal<UserInstitutionDetail | null>(null);

  // Signal para las instituciones del usuario actual
  userInstitutions = signal<UserInstitutionDetail[]>([]);

  // Formularios
  personalForm!: FormGroup;
  assignmentForm!: FormGroup;

  // Signals computados
  canEdit = computed(() => this.user?.isEnabled ?? false);
  hasInstitutions = computed(() => {
    const hasInst = this.userInstitutions().length > 0;
    console.log('hasInstitutions computed:', hasInst);
    console.log('userInstitutions signal:', this.userInstitutions());
    return hasInst;
  });

  ngOnInit(): void {
    this.initializeForms();
    this.loadCatalogData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user'] && this.user) {
      console.log('User data received in modal:', this.user);
      console.log('User institutions:', this.user.instituciones);

      // Actualizar el signal de instituciones del usuario
      this.userInstitutions.set(this.user.instituciones || []);

      this.updatePersonalForm();
    }
  }

  private initializeForms(): void {
    this.personalForm = this.fb.group({
      tipoCedula: ['V', Validators.required],
      numeroCedula: ['', [
        Validators.required,
        Validators.pattern(/^\d{1,8}$/),
        Validators.maxLength(8)
      ]],
      nombres: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
        this.spanishAlphabeticValidator
      ]],
      apellidos: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
        this.spanishAlphabeticValidator
      ]],
      fechaNacimiento: ['', [
        Validators.required,
        this.dateValidator
      ]],
      genero: ['', Validators.required],
      prefijoTelefono: ['', [
        venezuelanPhonePrefixValidator()
      ]],
      numeroTelefono: ['', [
        phoneNumberValidator(),
        Validators.minLength(7),
        Validators.maxLength(7)
      ]],
      correo: ['', [
        Validators.required,
        Validators.email,
        Validators.maxLength(100)
      ]],
      isEnabled: [true]
    });

    this.setupAvailabilityValidation();

    this.assignmentForm = this.fb.group({
      institucionId: ['', Validators.required],
      rolId: ['', Validators.required]
    });
  }



  private updatePersonalForm(): void {
    if (this.user) {
      // Separar cédula en tipo y número usando el guión como separador
      const cedulaParts = this.user.cedula.split('-');
      const tipoCedula = cedulaParts[0] || 'V';
      const numeroCedula = cedulaParts[1] || this.user.cedula;

      // Separar teléfono en prefijo y número
      let prefijoTelefono = '';
      let numeroTelefono = '';

      if (this.user.telefono) {
        if (this.user.telefono.includes('-')) {
          // Si tiene guión, usar el guión como separador
          const telefonoParts = this.user.telefono.split('-');
          prefijoTelefono = telefonoParts[0] || '';
          numeroTelefono = telefonoParts[1] || '';
        } else {
          // Si no tiene guión, tomar los primeros 4 dígitos como prefijo
          const telefonoLimpio = this.user.telefono.replace(/\D/g, ''); // Remover caracteres no numéricos
          if (telefonoLimpio.length >= 4) {
            prefijoTelefono = telefonoLimpio.substring(0, 4);
            numeroTelefono = telefonoLimpio.substring(4);
          } else {
            // Si tiene menos de 4 dígitos, todo va al número
            prefijoTelefono = '';
            numeroTelefono = telefonoLimpio;
          }
        }
      }

      this.personalForm.patchValue({
        nombres: this.user.nombres,
        apellidos: this.user.apellidos,
        tipoCedula: tipoCedula,
        numeroCedula: numeroCedula,
        correo: this.user.correo,
        prefijoTelefono: prefijoTelefono,
        numeroTelefono: numeroTelefono,
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
        this.notificationService.showError('Error al cargar las instituciones');
      }
    });

    // Cargar roles
    this.usersService.getRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
      },
      error: (error) => {
        console.error('Error loading roles:', error);
        this.notificationService.showError('Error al cargar los roles');
      }
    });

    this.loading.set(false);
  }

  private setupAvailabilityValidation(): void {
    // Validación de disponibilidad de cédula
    const tipoCedulaControl = this.personalForm.get('tipoCedula');
    const numeroCedulaControl = this.personalForm.get('numeroCedula');

    if (tipoCedulaControl && numeroCedulaControl) {
      // Combinar cambios de ambos controles para formar la cédula completa
      const cedulaChanges$ = numeroCedulaControl.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(numeroValue => {
          if (!numeroValue || numeroCedulaControl.invalid) {
            return of(null);
          }

          const cedulaCompleta = `${tipoCedulaControl.value}-${this.padCedulaWithZeros(numeroValue)}`;

          // No validar si es la misma cédula del usuario actual
          if (this.user && this.user.cedula === cedulaCompleta) {
            return of(null);
          }

          this.checkingCedula.set(true);

          return this.usersService.checkCedulaAvailability(cedulaCompleta).pipe(
            catchError(() => of(true)) // En caso de error, asumir disponible
          );
        })
      );

      cedulaChanges$.subscribe(isAvailable => {
        this.checkingCedula.set(false);
        if (isAvailable === false) {
          numeroCedulaControl.setErrors({ ...numeroCedulaControl.errors, 'cedulaNotAvailable': true });
        } else if (numeroCedulaControl.errors?.['cedulaNotAvailable']) {
          const errors = { ...numeroCedulaControl.errors };
          delete errors['cedulaNotAvailable'];
          numeroCedulaControl.setErrors(Object.keys(errors).length ? errors : null);
        }
      });
    }

    // Validación de disponibilidad de correo
    const correoControl = this.personalForm.get('correo');
    if (correoControl) {
      correoControl.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(email => {
          if (!email || correoControl.invalid) {
            return of(null);
          }

          const normalizedEmail = email.toLowerCase().trim();

          // No validar si es el mismo correo del usuario actual
          if (this.user && this.user.correo.toLowerCase() === normalizedEmail) {
            return of(null);
          }

          this.checkingEmail.set(true);

          return this.usersService.checkEmailAvailability(normalizedEmail).pipe(
            catchError(() => of(true)) // En caso de error, asumir disponible
          );
        })
      ).subscribe(isAvailable => {
        this.checkingEmail.set(false);
        if (isAvailable === false) {
          correoControl.setErrors({ ...correoControl.errors, 'emailNotAvailable': true });
        } else if (correoControl.errors?.['emailNotAvailable']) {
          const errors = { ...correoControl.errors };
          delete errors['emailNotAvailable'];
          correoControl.setErrors(Object.keys(errors).length ? errors : null);
        }
      });
    }

    // Validación de disponibilidad de teléfono
    const prefijoTelefonoControl = this.personalForm.get('prefijoTelefono');
    const numeroTelefonoControl = this.personalForm.get('numeroTelefono');

    if (prefijoTelefonoControl && numeroTelefonoControl) {
      // Combinar cambios de ambos controles para formar el teléfono completo
      const phoneChanges$ = numeroTelefonoControl.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(numeroValue => {
          // Solo validar si hay un número de teléfono, prefijo válido y es válido
          if (!numeroValue || numeroValue.trim() === '' ||
              !prefijoTelefonoControl.value || prefijoTelefonoControl.value.trim() === '' ||
              numeroTelefonoControl.invalid) {
            return of(null);
          }

          const telefonoCompleto = `${prefijoTelefonoControl.value}-${numeroValue}`;

          // No validar si es el mismo teléfono del usuario actual
          if (this.user && this.user.telefono === telefonoCompleto) {
            return of(null);
          }

          this.checkingPhone.set(true);

          return this.usersService.checkPhoneAvailability(telefonoCompleto).pipe(
            catchError(() => of(true)) // En caso de error, asumir disponible
          );
        })
      );

      phoneChanges$.subscribe(isAvailable => {
        this.checkingPhone.set(false);
        if (isAvailable === false) {
          numeroTelefonoControl.setErrors({ ...numeroTelefonoControl.errors, 'phoneNotAvailable': true });
        } else if (numeroTelefonoControl.errors?.['phoneNotAvailable']) {
          const errors = { ...numeroTelefonoControl.errors };
          delete errors['phoneNotAvailable'];
          numeroTelefonoControl.setErrors(Object.keys(errors).length ? errors : null);
        }
      });
    }
  }

  // Validador personalizado para fechas
  private dateValidator(control: AbstractControl): {[key: string]: any} | null {
    if (!control.value) return null;

    const inputDate = new Date(control.value);
    const today = new Date();
    const minDate = new Date();
    minDate.setFullYear(today.getFullYear() - 150);
    const maxDate = new Date();
    maxDate.setFullYear(today.getFullYear() - 18);

    if (inputDate > today) {
      return { 'futureDate': true };
    }
    if (inputDate < minDate) {
      return { 'tooOld': true };
    }
    if (inputDate > maxDate) {
      return { 'tooYoung': true };
    }
    return null;
  }

  // Validador personalizado para nombres y apellidos (solo alfabeto español y espacios)
  private spanishAlphabeticValidator = (control: AbstractControl): { [key: string]: any } | null => {
    const value = control.value;
    if (value === null || value === undefined) {
      return null; // se maneja con "required" si corresponde
    }
    if (typeof value === 'string') {
      // Detectar entradas de solo espacios
      if (value.trim() === '' && value.length > 0) {
        return { whitespaceOnly: true };
      }
      // Permitir letras con acentos y ñ, y espacios entre palabras
      const pattern = /^[A-Za-zÁÉÍÓÚáéíóúÑñ]+(?:\s+[A-Za-zÁÉÍÓÚáéíóúÑñ]+)*$/;
      return pattern.test(value) ? null : { invalidAlphabetic: true };
    }
    return { invalidAlphabetic: true };
  }

  // Validador para fechas de inicio (no puede ser en el pasado)


  setActiveTab(tab: 'personal' | 'institutions' | 'assignment'): void {
    this.activeTab.set(tab);
    this.clearMessages();
  }

  closeModal(): void {
    this.clearMessages();
    this.activeTab.set('personal');
    this.close.emit();
  }

  private clearMessages(): void {
    // Ya no necesitamos limpiar mensajes locales, el NotificationService maneja esto
  }

  // Gestión de datos personales
  onPersonalFormSubmit(): void {
    if (this.personalForm.invalid || !this.user) return;

    this.loading.set(true);
    this.clearMessages();

    const formValue = this.personalForm.value;

    // Normalizar y validar datos como en user-create-modal
    const updateRequest: UserUpdateRequest = {
      cedula: `${formValue.tipoCedula}-${this.padCedulaWithZeros(formValue.numeroCedula)}`,
      nombres: formValue.nombres.trim().toUpperCase(),
      apellidos: formValue.apellidos.trim().toUpperCase(),
      fecha_nacimiento: this.formatDateToISO(formValue.fechaNacimiento),
      genero: this.normalizeGender(formValue.genero),
      telefono: formValue.numeroTelefono && formValue.numeroTelefono.trim() !== '' &&
                 formValue.prefijoTelefono && formValue.prefijoTelefono.trim() !== ''
         ? `${formValue.prefijoTelefono}-${formValue.numeroTelefono}`
         : undefined,
      correo: formValue.correo.toLowerCase().trim(),
      is_enabled: formValue.isEnabled
    };

    console.log('Update request:', updateRequest);

    this.usersService.updateUser(this.user.id, updateRequest).subscribe({
      next: (response) => {
        // Usar el mensaje del servidor si está disponible
        const successMessage = response.message || 'Datos personales actualizados correctamente';
        this.notificationService.showSuccess(successMessage);

        // Actualizar los datos locales con la respuesta del servidor
        if (response.data) {
          this.user = response.data;
          this.userUpdated.emit(response.data);
        }
        this.loading.set(false);

        // Cerrar el modal después de una actualización exitosa
        this.closeModal();
      },
      error: (error) => {
        console.error('Error updating user:', error);
        let errorMessage = 'Error al actualizar los datos del usuario';

        // Priorizar mensaje del servidor si existe
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 400) {
          errorMessage = 'Datos inválidos. Verifique la información ingresada.';
        } else if (error.status === 409) {
          errorMessage = 'Ya existe un usuario con esta cédula o correo electrónico.';
        }

        this.notificationService.showError(errorMessage);
        this.loading.set(false);
      }
    });
  }

  // Gestión de asignaciones institucionales
  onAssignmentFormSubmit(): void {
    if (this.assignmentForm.invalid || !this.user) return;

    this.loading.set(true);
    this.clearMessages();

    const formValue = this.assignmentForm.value;
    const assignmentRequest: InstitutionAssignmentRequest = {
      usuarioId: this.user.id,
      institucionId: parseInt(formValue.institucionId),
      rolId: parseInt(formValue.rolId)
    };

    console.log('Assignment request:', assignmentRequest);

    this.usersService.assignUserToInstitution(assignmentRequest).subscribe({
      next: (response) => {
        console.log('Assignment response:', response);
        // Usar el mensaje del servidor si está disponible
        const successMessage = response.message || 'Usuario asignado a la institución correctamente';
        this.notificationService.showSuccess(successMessage);
        this.assignmentForm.reset();

        // Agregar un pequeño delay para asegurar que la base de datos se haya actualizado
        setTimeout(() => {
          console.log('Reloading user data after assignment...');
          this.reloadUserData();
        }, 500);

        this.loading.set(false);
        // Cambiar a la pestaña de instituciones para ver la nueva asignación
        this.setActiveTab('institutions');
      },
      error: (error) => {
        console.error('Error assigning user to institution:', error);
        let errorMessage = 'Error al asignar el usuario a la institución';

        // Manejar diferentes tipos de errores del servidor
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 409) {
          errorMessage = 'El usuario ya está asignado a esta institución con este rol';
        } else if (error.status === 404) {
          errorMessage = 'Usuario, institución o rol no encontrado';
        } else if (error.status === 400) {
          errorMessage = 'Datos inválidos. Verifique la información ingresada';
        }

        this.notificationService.showError(errorMessage);
        this.loading.set(false);
      }
    });
  }

  openManageModal(assignment: UserInstitutionDetail): void {
    this.selectedAssignment.set(assignment);
    this.showManageModal.set(true);
  }

  onManageModalClosed(): void {
    this.showManageModal.set(false);
    this.selectedAssignment.set(null);
  }

  onAssignmentUpdated(): void {
    this.reloadUserData();
    this.onManageModalClosed();
  }

  get userFullName(): string {
    return this.user ? `${this.user.nombres} ${this.user.apellidos}` : '';
  }

  removeInstitutionAssignment(assignment: UserInstitutionDetail): void {
    if (!this.user) return;

    const institutionName = assignment.institucion.nombre;
    const confirmMessage = `¿Está seguro que desea remover la asignación de ${this.user.nombres} ${this.user.apellidos} de ${institutionName}?\n\nEsta acción no se puede deshacer.`;

    if (!confirm(confirmMessage)) return;

    this.loading.set(true);
    this.clearMessages();

    this.usersService.removeUserFromInstitution(assignment.id).subscribe({
      next: (response) => {
        // Usar mensaje por defecto ya que la respuesta puede no tener propiedad message
        this.notificationService.showSuccess('Asignación removida correctamente');
        this.reloadUserData();
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error removing institution assignment:', error);
        const errorMessage = error.error?.message || 'Error al remover la asignación';
        this.notificationService.showError(errorMessage);
        this.loading.set(false);
      }
    });
  }

  private reloadUserData(): void {
    if (!this.user) return;

    console.log('Reloading user data for user ID:', this.user.id);

    this.usersService.getUserDetail(this.user.id).subscribe({
      next: (userDetail) => {
        console.log('User data reloaded:', userDetail);
        console.log('User institutions after reload:', userDetail.instituciones);
        this.user = userDetail;

        // Actualizar el signal de instituciones del usuario
        this.userInstitutions.set(userDetail.instituciones || []);

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
      'Nutricionista': 'bg-info-subtle text-info',
      'Administrador': 'bg-success-subtle text-success',
      'Supervisor': 'bg-warning-subtle text-warning',
    };

    return roleClasses[roleName] || 'bg-secondary text-white';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES');
  }

  // Métodos auxiliares para el template
  isFieldInvalid(fieldName: string): boolean {
    const field = this.personalForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.personalForm.get(fieldName);
    if (!field || !field.errors) return '';

    const errors = field.errors;

    if (errors['required']) return `${this.getFieldLabel(fieldName)} es requerido`;
    if (errors['invalidAlphabetic'] && (fieldName === 'nombres' || fieldName === 'apellidos')) {
      return `${this.getFieldLabel(fieldName)} solo puede contener letras del alfabeto español y espacios`;
    }
    if (errors['whitespaceOnly'] && (fieldName === 'nombres' || fieldName === 'apellidos')) {
      return `${this.getFieldLabel(fieldName)} no puede estar vacío ni contener solo espacios`;
    }
    if (errors['email']) return 'Formato de correo electrónico inválido';
    if (errors['minlength']) return `${this.getFieldLabel(fieldName)} debe tener al menos ${errors['minlength'].requiredLength} caracteres`;
    if (errors['maxlength']) return `${this.getFieldLabel(fieldName)} no puede exceder ${errors['maxlength'].requiredLength} caracteres`;
    if (errors['pattern']) return `${this.getFieldLabel(fieldName)} tiene un formato inválido`;
    if (errors['invalidDate']) return 'Fecha inválida';
    if (errors['futureDate']) return 'La fecha no puede ser futura';
    if (errors['cedulaNotAvailable']) return 'Esta cédula ya está registrada';
    if (errors['emailNotAvailable']) return 'Este correo electrónico ya está registrado';
    if (errors['phoneNotAvailable']) return 'Este teléfono ya está registrado';
    if (errors['invalidVenezuelanPhonePrefix']) return 'Prefijo inválido. Use: 0414, 0424, 0412, 0416 o 0426';
    if (errors['invalidPhoneNumber']) return 'Número inválido. Debe tener exactamente 7 dígitos';

    return 'Campo inválido';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'tipoCedula': 'Tipo de cédula',
      'numeroCedula': 'Número de cédula',
      'nombres': 'Nombres',
      'apellidos': 'Apellidos',
      'fechaNacimiento': 'Fecha de nacimiento',
      'genero': 'Género',
      'prefijoTelefono': 'Prefijo telefónico',
      'numeroTelefono': 'Número de teléfono',
      'correo': 'Correo electrónico'
    };
    return labels[fieldName] || fieldName;
  }

  getFormControlError(controlName: string, formGroup: FormGroup = this.personalForm): string | null {
    const control = formGroup.get(controlName);
    if (!control || !control.errors || !control.touched) return null;

    const errors = control.errors;
    if (errors['required']) return `${this.getControlLabel(controlName, formGroup)} es requerido`;
    if (errors['email']) return 'Formato de correo inválido';
    if (errors['pattern']) return 'Formato inválido';
    if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres`;

    return 'Campo inválido';
  }

  private getControlLabel(controlName: string, formGroup: FormGroup): string {
    if (formGroup === this.assignmentForm) {
      const assignmentLabels: { [key: string]: string } = {
        'institucionId': 'Institución',
        'rolId': 'Rol'
      };
      return assignmentLabels[controlName] || controlName;
    }

    // Labels para formulario personal (existente)
    const personalLabels: { [key: string]: string } = {
      'tipoCedula': 'Tipo de cédula',
      'numeroCedula': 'Número de cédula',
      'nombres': 'Nombres',
      'apellidos': 'Apellidos',
      'fechaNacimiento': 'Fecha de nacimiento',
      'genero': 'Género',
      'prefijoTelefono': 'Prefijo telefónico',
      'numeroTelefono': 'Número de teléfono',
      'correo': 'Correo electrónico'
    };
    return personalLabels[controlName] || controlName;
  }
  // Métodos auxiliares para normalización de datos
   private formatDateToISO(dateString: string): string {
    if (!dateString) return '';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    return date.toISOString().split('T')[0];
  }

  private normalizeGender(gender: string): string {
    if (!gender) return '';
    return gender.toUpperCase();
  }

  private padCedulaWithZeros(cedula: string): string {
    if (!cedula) return '';
    return cedula.padStart(8, '0');
  }

  // Métodos para manejo de entrada de datos
  onCedulaInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '');
    input.value = value;
    this.personalForm.get('numeroCedula')?.setValue(value);
  }

  onNumericInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '');
    input.value = value;
  }

  /**
   * Maneja el hover sobre las filas de asignaciones de instituciones
   */
  onAssignmentRowHover(assignmentId: number, isHovering: boolean): void {
    // Seleccionar la fila específica de la asignación
    const row = document.querySelector(`tr[data-assignment-id="${assignmentId}"]`);

    if (row) {
      if (isHovering) {
        row.classList.add('hovered');
        // También agregar el efecto a todas las celdas para asegurar el hover
        const cells = row.querySelectorAll('td');
        cells.forEach(cell => {
          (cell as HTMLElement).style.backgroundColor = 'rgba(0, 123, 255, 0.05)';
        });
      } else {
        row.classList.remove('hovered');
        // Remover el estilo inline para que vuelva al CSS normal
        const cells = row.querySelectorAll('td');
        cells.forEach(cell => {
          (cell as HTMLElement).style.backgroundColor = '';
        });
      }
    }
  }
}
