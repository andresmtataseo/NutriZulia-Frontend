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
        Validators.pattern(/^\d{7,8}$/)
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
      telefono: ['', [
        Validators.required,
        Validators.pattern(/^(\+58|0058|58)?[-\s]?[24]\d{2}[-\s]?\d{3}[-\s]?\d{4}$/)
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
    minDate.setFullYear(today.getFullYear() - 100);
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
        nombres: formValue.nombres.trim(),
        apellidos: formValue.apellidos.trim(),
        fechaNacimiento: formValue.fechaNacimiento,
        genero: formValue.genero,
        telefono: formValue.telefono,
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
      if (fieldName === 'numeroCedula') return 'Solo números, entre 7 y 8 dígitos';
      if (fieldName === 'telefono') return 'Formato: +58-424-123-4567 o 0424-123-4567';
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
      'telefono': 'Teléfono',
      'correo': 'Correo electrónico',
      'clave': 'Contraseña',
      'confirmarClave': 'Confirmación de contraseña'
    };
    return labels[fieldName] || fieldName;
  }

  // Método para manejar el backdrop click
  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }
}
