import { Component, EventEmitter, Input, Output, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { catchError, of } from 'rxjs';

import { UsersService } from '../../services/users.service';
import { CreateUserRequest, User } from '../../models/user.interface';

@Component({
  selector: 'app-user-create-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-create-modal.component.html',
  styleUrls: ['./user-create-modal.component.css']
})
export class UserCreateModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private usersService = inject(UsersService);

  @Input() show = false;
  @Output() close = new EventEmitter<void>();
  @Output() userCreated = new EventEmitter<User>();

  // Signals para el estado del componente
  loading = signal<boolean>(false);
  submitting = signal<boolean>(false);
  error = signal<string | null>(null);

  userForm!: FormGroup;

  ngOnInit(): void {
    this.initializeForm();
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
      prefijoTelefono: ['0424', Validators.required],
      numeroTelefono: ['', [
        Validators.required,
        Validators.pattern(/^\d{7}$/),
        Validators.minLength(7),
        Validators.maxLength(7)
      ]],
      correo: ['', [
        Validators.required,
        Validators.email,
        Validators.maxLength(100)
      ]],
      clave: ['', [
        Validators.required,
        Validators.minLength(8),
        this.passwordValidator
      ]],
      confirmarClave: ['', [
        Validators.required
      ]]
    }, {
      validators: this.passwordMatchValidator
    });
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

  // Validador personalizado para contraseñas
  private passwordValidator(control: AbstractControl): {[key: string]: any} | null {
    if (!control.value) return null;

    const password = control.value;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const valid = hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;

    if (!valid) {
      return { 'passwordStrength': true };
    }
    return null;
  }

  // Validador para confirmar contraseña
  private passwordMatchValidator(group: AbstractControl): {[key: string]: any} | null {
    const password = group.get('clave');
    const confirmPassword = group.get('confirmarClave');

    if (!password || !confirmPassword) return null;

    return password.value === confirmPassword.value ? null : { 'passwordMismatch': true };
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      this.submitting.set(true);
      this.error.set(null);

      const formValue = this.userForm.value;
      const createUserRequest: CreateUserRequest = {
        cedula: `${formValue.tipoCedula}-${formValue.numeroCedula}`,
        nombres: formValue.nombres.trim().toUpperCase(),
        apellidos: formValue.apellidos.trim().toUpperCase(),
        fechaNacimiento: this.formatDateToISO(formValue.fechaNacimiento),
        genero: this.normalizeGender(formValue.genero),
        telefono: `${formValue.prefijoTelefono}-${formValue.numeroTelefono}`,
        correo: formValue.correo.toLowerCase().trim(),
        clave: formValue.clave
      };

      this.usersService.createUser(createUserRequest).pipe(
        catchError(error => {
          console.error('Error creating user:', error);
          let errorMessage = 'Error al crear el usuario. Por favor, intente nuevamente.';

          if (error.status === 400) {
            errorMessage = 'Datos inválidos. Verifique la información ingresada.';
          } else if (error.status === 409) {
            errorMessage = 'Ya existe un usuario con esta cédula o correo electrónico.';
          }

          this.error.set(errorMessage);
          this.submitting.set(false);
          return of(null);
        })
      ).subscribe(user => {
        this.submitting.set(false);
        if (user) {
          this.userCreated.emit(user);
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
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.userForm.get(fieldName);
    if (!field || !field.errors) return '';

    const errors = field.errors;

    if (errors['required']) return `${this.getFieldLabel(fieldName)} es requerido`;
    if (errors['email']) return 'Ingrese un correo electrónico válido';
    if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
    if (errors['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres`;
    if (errors['pattern']) {
      if (fieldName === 'numeroCedula') return 'Solo números, máximo 8 dígitos';
      if (fieldName === 'numeroTelefono') return 'Solo números, exactamente 7 dígitos';
    }
    if (errors['futureDate']) return 'La fecha no puede ser futura';
    if (errors['tooOld']) return 'Fecha de nacimiento muy antigua';
    if (errors['tooYoung']) return 'Debe ser mayor de 18 años';
    if (errors['passwordStrength']) return 'Debe contener mayúscula, minúscula, número y carácter especial';
    if (errors['passwordMismatch']) return 'Las contraseñas no coinciden';

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
      'correo': 'Correo electrónico',
      'clave': 'Contraseña',
      'confirmarClave': 'Confirmación de contraseña'
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

    const genderMap: {[key: string]: string} = {
      'masculino': 'MASCULINO',
      'femenino': 'FEMENINO',
      'M': 'MASCULINO',
      'F': 'FEMENINO'
    };

    return genderMap[gender.toLowerCase()] || gender.toUpperCase();
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

  // Método para manejar el backdrop click
  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }
}
