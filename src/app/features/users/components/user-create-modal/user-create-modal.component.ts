import { Component, EventEmitter, Input, Output, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { catchError, of, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

import { UsersService } from '../../services/users.service';
import { CreateUserRequest, User } from '../../models/user.interface';
import { NotificationService } from '../../../../shared/services/notification.service';
import { NotificationComponent } from '../../../../shared/components/notification/notification.component';
import { ApiResponse } from '../../../../core/models/api-response.interface';
import { numeroCedulaValidator } from '../../../auth/validators/auth.validators';
import { venezuelanPhonePrefixValidator, phoneNumberValidator } from '../../../../shared/validators/phone.validators';

@Component({
  selector: 'app-user-create-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NotificationComponent],
  templateUrl: './user-create-modal.component.html',
  styleUrls: ['./user-create-modal.component.css']
})
export class UserCreateModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private usersService = inject(UsersService);
  public notificationService = inject(NotificationService);

  @Input() show = false;
  @Output() close = new EventEmitter<void>();
  @Output() userCreated = new EventEmitter<User>();

  // Signals para el estado del componente
  loading = signal<boolean>(false);
  submitting = signal<boolean>(false);
  error = signal<string | null>(null);
  checkingCedula = signal<boolean>(false);
  checkingEmail = signal<boolean>(false);
  checkingPhone = signal<boolean>(false);

  userForm!: FormGroup;

  ngOnInit(): void {
    this.initializeForm();
    this.setupAvailabilityValidation();
  }

  private initializeForm(): void {
    this.userForm = this.fb.group({
      tipoCedula: ['V', Validators.required],
      numeroCedula: ['', [
        Validators.required,
        Validators.pattern(/^\d{1,8}$/),
        Validators.maxLength(8)
      ]],
      nombres: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50)
      ]],
      apellidos: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50)
      ]],
      fechaNacimiento: ['', [
        Validators.required,
        this.dateValidator
      ]],
      genero: ['', Validators.required],
      prefijoTelefono: [''],
      numeroTelefono: ['', [
        phoneNumberValidator(),
        Validators.minLength(7),
        Validators.maxLength(7)
      ]],
      correo: ['', [
        Validators.required,
        Validators.email,
        Validators.maxLength(100)
      ]]
    }, { validators: this.phoneValidator.bind(this) });
  }

  private setupAvailabilityValidation(): void {
    // Validación de disponibilidad de cédula
    const tipoCedulaControl = this.userForm.get('tipoCedula');
    const numeroCedulaControl = this.userForm.get('numeroCedula');

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
    const correoControl = this.userForm.get('correo');
    if (correoControl) {
      correoControl.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(email => {
          if (!email || correoControl.invalid) {
            return of(null);
          }

          this.checkingEmail.set(true);

          return this.usersService.checkEmailAvailability(email.toLowerCase().trim()).pipe(
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
     const prefijoTelefonoControl = this.userForm.get('prefijoTelefono');
     const numeroTelefonoControl = this.userForm.get('numeroTelefono');

     if (prefijoTelefonoControl && numeroTelefonoControl) {
       // Combinar cambios de ambos controles para formar el teléfono completo
       const phoneChanges$ = numeroTelefonoControl.valueChanges.pipe(
         debounceTime(500),
         distinctUntilChanged(),
         switchMap(numeroValue => {
           // Solo validar si hay un número de teléfono, prefijo válido y es válido
           // Ahora que el teléfono es opcional, solo validar si ambos campos tienen valor
           if (!numeroValue || numeroValue.trim() === '' ||
               !prefijoTelefonoControl.value || prefijoTelefonoControl.value.trim() === '') {
             return of(null);
           }

           // Verificar que el número sea válido antes de hacer la consulta
           if (numeroTelefonoControl.invalid) {
             return of(null);
           }

           const telefonoCompleto = `${prefijoTelefonoControl.value}-${numeroValue}`;
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

  // Validador personalizado para teléfono
  private phoneValidator(form: AbstractControl): {[key: string]: any} | null {
    const prefijoTelefono = form.get('prefijoTelefono')?.value;
    const numeroTelefono = form.get('numeroTelefono')?.value;

    // Si hay número de teléfono pero no hay prefijo
    if (numeroTelefono && numeroTelefono.trim() !== '' && (!prefijoTelefono || prefijoTelefono.trim() === '')) {
      return { 'phoneRequiresPrefix': true };
    }

    // Si hay prefijo pero no hay número
    if (prefijoTelefono && prefijoTelefono.trim() !== '' && (!numeroTelefono || numeroTelefono.trim() === '')) {
      return { 'prefixRequiresPhone': true };
    }

    // Si hay prefijo, validar que sea válido
    if (prefijoTelefono && prefijoTelefono.trim() !== '') {
      const validPrefixes = ['0414', '0424', '0412', '0416', '0426'];
      if (!validPrefixes.includes(prefijoTelefono)) {
        return { 'invalidVenezuelanPhonePrefix': true };
      }
    }

    return null;
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      this.submitting.set(true);
      this.error.set(null);

      const formValue = this.userForm.value;
      const createUserRequest: CreateUserRequest = {
        cedula: `${formValue.tipoCedula}-${this.padCedulaWithZeros(formValue.numeroCedula)}`,
        nombres: formValue.nombres.trim().toUpperCase(),
        apellidos: formValue.apellidos.trim().toUpperCase(),
        fecha_nacimiento: this.formatDateToISO(formValue.fechaNacimiento),
        genero: this.normalizeGender(formValue.genero),
        telefono: formValue.numeroTelefono && formValue.numeroTelefono.trim() !== '' &&
                  formValue.prefijoTelefono && formValue.prefijoTelefono.trim() !== ''
          ? `${formValue.prefijoTelefono}-${formValue.numeroTelefono}`
          : null,
        correo: formValue.correo.toLowerCase().trim(),
        is_enabled: true,
      };
      console.log(createUserRequest)
      this.usersService.createUser(createUserRequest).pipe(
        catchError(error => {
          console.error('Error creating user:', error);
          
          // Obtener mensaje del servidor si está disponible
          let errorMessage = 'Error al crear el usuario. Por favor, intente nuevamente.';
          
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.status === 400) {
            errorMessage = 'Datos inválidos. Verifique la información ingresada.';
          } else if (error.status === 409) {
            errorMessage = 'Ya existe un usuario con esta cédula o correo electrónico.';
          }

          this.notificationService.showError(errorMessage);
          this.submitting.set(false);
          return of(null);
        })
      ).subscribe((response: ApiResponse<User> | null) => {
        this.submitting.set(false);
        if (response && response.data) {
          // Mostrar mensaje de éxito del servidor
          const successMessage = response.message || 'Usuario creado exitosamente';
          this.notificationService.showSuccess(successMessage);
          
          this.userCreated.emit(response.data);
          this.resetForm();
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  onClose(): void {
    if (this.userForm.dirty && !this.submitting()) {
      const confirmClose = confirm('¿Está seguro que desea cerrar? Se perderán los datos ingresados.');
      if (!confirmClose) return;
    }

    this.resetForm();
    this.close.emit();
  }

  private resetForm(): void {
    this.userForm.reset();
    this.error.set(null);
    this.submitting.set(false);
    this.loading.set(false);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.userForm.controls).forEach(key => {
      const control = this.userForm.get(key);
      control?.markAsTouched();
    });
  }

  // Métodos auxiliares para el template
  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    const fieldInvalid = !!(field && field.invalid && (field.dirty || field.touched));
    
    // También verificar errores a nivel de formulario para campos de teléfono
    if ((fieldName === 'prefijoTelefono' || fieldName === 'numeroTelefono') && this.userForm.errors) {
      const hasPhoneErrors = !!(this.userForm.errors['phoneRequiresPrefix'] || 
                               this.userForm.errors['prefixRequiresPhone'] || 
                               this.userForm.errors['invalidVenezuelanPhonePrefix']);
      return fieldInvalid || hasPhoneErrors;
    }
    
    return fieldInvalid;
  }

  getFieldError(fieldName: string): string {
    const field = this.userForm.get(fieldName);
    if (!field || !field.errors) {
      // Verificar errores a nivel de formulario para campos de teléfono
      if ((fieldName === 'prefijoTelefono' || fieldName === 'numeroTelefono') && this.userForm.errors) {
        if (this.userForm.errors['phoneRequiresPrefix']) {
          return 'Si ingresa un número de teléfono, debe seleccionar un prefijo';
        }
        if (this.userForm.errors['prefixRequiresPhone']) {
          return 'Si selecciona un prefijo, debe ingresar un número de teléfono';
        }
        if (this.userForm.errors['invalidVenezuelanPhonePrefix']) {
          return 'Prefijo inválido. Use: 0414, 0424, 0412, 0416 o 0426';
        }
      }
      return '';
    }

    const errors = field.errors;

    if (errors['required']) return `${this.getFieldLabel(fieldName)} es requerido`;
    if (errors['email']) return 'Ingrese un correo electrónico válido';
    if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
    if (errors['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres`;
    if (errors['pattern']) {
      if (fieldName === 'numeroCedula') return 'Solo números, máximo 8 dígitos';
      if (fieldName === 'numeroTelefono') return 'Solo números, exactamente 7 dígitos';
    }
    if (errors['cedulaNotAvailable']) return 'Esta cédula ya está registrada';
    if (errors['emailNotAvailable']) return 'Este correo electrónico ya está registrado';
    if (errors['phoneNotAvailable']) return 'Este número de teléfono ya está registrado';
    if (errors['futureDate']) return 'La fecha no puede ser futura';
    if (errors['tooOld']) return 'Fecha de nacimiento muy antigua';
    if (errors['tooYoung']) return 'Debe ser mayor de 18 años';
    if (errors['invalidVenezuelanPhonePrefix']) return 'Prefijo inválido. Use: 0414, 0424, 0412, 0416 o 0426';
    if (errors['invalidPhoneNumber']) return 'Número inválido. Debe tener exactamente 7 dígitos';

    return 'Campo inválido';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: {[key: string]: string} = {
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

  // Método para formatear fecha a ISO 8601 (YYYY-MM-DD)
  private formatDateToISO(dateValue: string): string {
    if (!dateValue) return '';

    const date = new Date(dateValue);
    return date.toISOString().split('T')[0];
  }

  // Método para normalizar género a mayúsculas
  private normalizeGender(gender: string): string {
    if (!gender) return '';

    // Ya que ahora los valores del select son directamente MASCULINO/FEMENINO,
    // solo necesitamos asegurar que esté en mayúsculas
    return gender.toUpperCase();
  }

  // Método para rellenar la cédula con ceros a la izquierda
  private padCedulaWithZeros(cedula: string): string {
    if (!cedula) return '';
    return cedula.padStart(8, '0');
  }

  // Método para manejar input de cédula
  onCedulaInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    // Remover cualquier carácter que no sea dígito
    const numericValue = value.replace(/[^0-9]/g, '');

    // Limitar a 8 dígitos máximo
    const limitedValue = numericValue.slice(0, 8);

    // Actualizar el valor del input y el form control
    input.value = limitedValue;
    this.userForm.get('numeroCedula')?.setValue(limitedValue);
  }

  // Método para manejar input numérico
  onNumericInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    // Remover cualquier carácter que no sea dígito
    const numericValue = value.replace(/[^0-9]/g, '');

    // Limitar a 7 dígitos máximo
    const limitedValue = numericValue.slice(0, 7);

    // Actualizar el valor del input y el form control
    input.value = limitedValue;
    this.userForm.get('numeroTelefono')?.setValue(limitedValue);
  }
}
