import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validador para número de cédula (solo números)
 */
export function numeroCedulaValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Si está vacío, lo maneja el validador required
    }

    const numero = control.value.toString();

    // Solo números
    if (!/^\d+$/.test(numero)) {
      return {
        invalidNumeroCedula: {
          message: 'El número de cédula debe contener solo números'
        }
      };
    }

    return null;
  };
}

/**
 * Utilidad para obtener el mensaje de error de un control
 */
export function getErrorMessage(control: AbstractControl): string {
  if (!control.errors) return '';

  const errors = control.errors;

  if (errors['required']) return 'Este campo es requerido';
  if (errors['invalidNumeroCedula']) return errors['invalidNumeroCedula'].message;

  return 'Campo inválido';
}
