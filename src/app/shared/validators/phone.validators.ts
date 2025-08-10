import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validador para números de teléfono venezolanos
 * Formato esperado: 04XX-XXXXXXX (ejemplo: 0424-6719783)
 */
export function venezuelanPhoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Si está vacío, lo maneja el validador required
    }

    const phone = control.value.toString().trim();
    
    // Patrón para teléfonos venezolanos: 04XX-XXXXXXX
    const phonePattern = /^(0414|0424|0412|0416|0426)-\d{7}$/;
    
    if (!phonePattern.test(phone)) {
      return {
        venezuelanPhone: {
          message: 'El teléfono debe tener el formato válido venezolano (0414, 0424, 0412, 0416, 0426 seguido de guión y 7 dígitos)',
          actualValue: phone,
          expectedFormat: '04XX-XXXXXXX'
        }
      };
    }

    return null;
  };
}

/**
 * Validador para prefijos de teléfono venezolanos
 */
export function venezuelanPhonePrefixValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const prefix = control.value.toString().trim();
    const validPrefixes = ['0414', '0424', '0412', '0416', '0426'];
    
    if (!validPrefixes.includes(prefix)) {
      return {
        invalidPrefix: {
          message: 'Prefijo de teléfono inválido',
          actualValue: prefix,
          validPrefixes: validPrefixes
        }
      };
    }

    return null;
  };
}

/**
 * Validador para el número de teléfono (sin prefijo)
 * Debe ser exactamente 7 dígitos
 */
export function phoneNumberValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const number = control.value.toString().trim();
    const numberPattern = /^\d{7}$/;
    
    if (!numberPattern.test(number)) {
      return {
        invalidPhoneNumber: {
          message: 'El número debe tener exactamente 7 dígitos',
          actualValue: number,
          expectedLength: 7
        }
      };
    }

    return null;
  };
}

/**
 * Función utilitaria para formatear un teléfono completo
 * @param prefix Prefijo del teléfono (04XX)
 * @param number Número del teléfono (7 dígitos)
 * @returns Teléfono formateado (04XX-XXXXXXX)
 */
export function formatVenezuelanPhone(prefix: string, number: string): string {
  if (!prefix || !number) {
    return '';
  }
  
  const cleanPrefix = prefix.trim();
  const cleanNumber = number.trim();
  
  // Validar que el prefijo y número sean válidos
  const validPrefixes = ['0414', '0424', '0412', '0416', '0426'];
  const numberPattern = /^\d{7}$/;
  
  if (!validPrefixes.includes(cleanPrefix) || !numberPattern.test(cleanNumber)) {
    return '';
  }
  
  return `${cleanPrefix}-${cleanNumber}`;
}

/**
 * Función utilitaria para separar un teléfono completo en prefijo y número
 * @param phone Teléfono completo (04XX-XXXXXXX)
 * @returns Objeto con prefijo y número separados
 */
export function parseVenezuelanPhone(phone: string): { prefix: string; number: string } {
  if (!phone) {
    return { prefix: '', number: '' };
  }

  const cleanPhone = phone.trim();
  
  // Si tiene guión, separar por guión
  if (cleanPhone.includes('-')) {
    const parts = cleanPhone.split('-');
    return {
      prefix: parts[0] || '',
      number: parts[1] || ''
    };
  }
  
  // Si no tiene guión pero tiene 11 caracteres (04XXXXXXXXX)
  if (cleanPhone.length === 11 && cleanPhone.startsWith('04')) {
    return {
      prefix: cleanPhone.substring(0, 4),
      number: cleanPhone.substring(4)
    };
  }
  
  // Si tiene menos de 4 caracteres, asumir que es solo prefijo
  if (cleanPhone.length <= 4) {
    return {
      prefix: cleanPhone,
      number: ''
    };
  }
  
  // Por defecto, intentar separar en 4 y el resto
  return {
    prefix: cleanPhone.substring(0, 4),
    number: cleanPhone.substring(4)
  };
}