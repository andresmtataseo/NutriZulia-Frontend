import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../services/auth.service';
import { LoginRequest } from '../../../../core/models';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  loginForm: FormGroup;
  isSubmitting = signal(false);

  constructor() {
    this.loginForm = this.fb.group({
    documentType: ['V', [Validators.required]],
    documentNumber: ['', [Validators.required, Validators.pattern(/^\d{1,8}$/)]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });
  }

  get isLoading() {
    return this.authService.isLoading();
  }

  get authError() {
    return this.authService.authError();
  }

  onSubmit(): void {
    if (this.loginForm.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);
      this.authService.clearError();

      const credentials: LoginRequest = this.loginForm.value;

      this.authService.login(credentials).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          // Redirigir al dashboard o página principal
          this.router.navigate(['/dashboard']);
        },
        error: () => {
          this.isSubmitting.set(false);
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['pattern']) {
        if (fieldName === 'documentNumber') return 'La cédula debe contener solo números (máximo 8 dígitos)';
      }
      if (field.errors['minlength']) {
        if (fieldName === 'password') return 'La contraseña debe tener al menos 6 caracteres';
      }
    }
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field?.invalid && field.touched);
  }
}
