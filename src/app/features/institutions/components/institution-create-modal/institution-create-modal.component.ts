import { Component, EventEmitter, Input, Output, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { catchError, of, forkJoin } from 'rxjs';

import { InstitutionService } from '../../services/institution.service';
import { CatalogService } from '../../../../core/services/catalog.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { NotificationComponent } from '../../../../shared/components/notification/notification.component';
import { Institucion } from '../../../../core/models/catalog/institucion.interface';
import { TipoInstitucion } from '../../../../core/models/catalog/tipo-institucion.interface';
import { MunicipioSanitario } from '../../../../core/models/catalog/municipio-sanitario.interface';
import { ApiResponse } from '../../../../core/models/api-response.interface';

@Component({
  selector: 'app-institution-create-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NotificationComponent],
  templateUrl: './institution-create-modal.component.html',
  styleUrls: ['./institution-create-modal.component.css']
})
export class InstitutionCreateModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private institutionService = inject(InstitutionService);
  private catalogService = inject(CatalogService);
  public notificationService = inject(NotificationService);

  @Input() show = false;
  @Output() close = new EventEmitter<void>();
  @Output() institutionCreated = new EventEmitter<Institucion>();

  // Signals para el estado del componente
  loading = signal<boolean>(false);
  submitting = signal<boolean>(false);
  loadingTipos = signal<boolean>(false);
  loadingMunicipios = signal<boolean>(false);
  error = signal<string | null>(null);

  // Signals para los catálogos
  tiposInstituciones = signal<TipoInstitucion[]>([]);
  municipiosSanitarios = signal<MunicipioSanitario[]>([]);

  institutionForm!: FormGroup;

  ngOnInit(): void {
    this.initializeForm();
    this.loadCatalogs();
  }

  private initializeForm(): void {
    this.institutionForm = this.fb.group({
      nombre: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(100),
        this.spanishAlphabeticValidator
      ]],
      tipo_institucion_id: ['', [
        Validators.required
      ]],
      municipio_sanitario_id: ['', [
        Validators.required
      ]]
    });
  }

  private loadCatalogs(): void {
    this.loading.set(true);
    this.loadingTipos.set(true);
    this.loadingMunicipios.set(true);

    forkJoin({
      tipos: this.catalogService.getInstitutionTypes().pipe(
        catchError(error => {
          console.error('Error loading institution types:', error);
          this.notificationService.showError('Error al cargar los tipos de instituciones');
          return of([]);
        })
      ),
      municipios: this.catalogService.getHealthMunicipalities().pipe(
        catchError(error => {
          console.error('Error loading health municipalities:', error);
          this.notificationService.showError('Error al cargar los municipios sanitarios');
          return of([]);
        })
      )
    }).subscribe({
      next: ({ tipos, municipios }) => {
        this.tiposInstituciones.set(tipos);
        this.municipiosSanitarios.set(municipios);
        this.loadingTipos.set(false);
        this.loadingMunicipios.set(false);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading catalogs:', error);
        this.notificationService.showError('Error al cargar los catálogos');
        this.loadingTipos.set(false);
        this.loadingMunicipios.set(false);
        this.loading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.institutionForm.valid && !this.submitting()) {
      this.submitting.set(true);
      this.error.set(null);

      const formData = this.institutionForm.value;

      // Crear el objeto de institución según la interfaz
      const institutionData: Omit<Institucion, 'id'> = {
        nombre: formData.nombre.trim().toUpperCase(),
        tipo_institucion_id: parseInt(formData.tipo_institucion_id),
        municipio_sanitario_id: parseInt(formData.municipio_sanitario_id)
      };

      this.institutionService.createInstitution(institutionData).subscribe({
        next: (response: ApiResponse<Institucion>) => {
          this.submitting.set(false);
          this.notificationService.showSuccess('Institución creada exitosamente');
          this.institutionCreated.emit(response.data);
          this.resetForm();
          this.onClose();
        },
        error: (error) => {
          this.submitting.set(false);
          console.error('Error creating institution:', error);

          let errorMessage = 'Error al crear la institución';
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.status === 409) {
            errorMessage = 'Ya existe una institución con este nombre';
          } else if (error.status === 400) {
            errorMessage = 'Datos inválidos. Verifique la información ingresada';
          }

          this.error.set(errorMessage);
          this.notificationService.showError(errorMessage);
        }
      });
    } else {
      // Marcar todos los campos como tocados para mostrar errores
      Object.keys(this.institutionForm.controls).forEach(key => {
        this.institutionForm.get(key)?.markAsTouched();
      });
    }
  }

  onClose(): void {
    this.resetForm();
    this.close.emit();
  }

  private resetForm(): void {
    this.institutionForm.reset();
    this.error.set(null);
    this.submitting.set(false);

    // Resetear valores por defecto
    this.institutionForm.patchValue({
      nombre: '',
      tipo_institucion_id: '',
      municipio_sanitario_id: ''
    });
  }

  // Validador personalizado para permitir solo letras del alfabeto español y puntos, y rechazar entradas solo con espacios
  private spanishAlphabeticValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value as string;
    if (value === null || value === undefined) {
      return null; // Dejar que otros validadores (required) manejen null/undefined
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return { whitespaceOnly: true };
    }
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s.]+$/;
    return regex.test(value) ? null : { invalidAlphabetic: true };
  }

  // Métodos de utilidad para validación
  isFieldInvalid(fieldName: string): boolean {
    const field = this.institutionForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.institutionForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) {
        return 'Este campo es obligatorio';
      }
      if (field.errors['minlength']) {
        return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      }
      if (field.errors['maxlength']) {
        return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
      }
      // Mensajes específicos para el campo nombre con el validador personalizado
      if (fieldName === 'nombre') {
        if (field.errors['invalidAlphabetic']) {
          return 'Formato inválido. Solo se permiten letras del alfabeto español y puntos';
        }
        if (field.errors['whitespaceOnly']) {
          return 'El nombre no puede ser solo espacios en blanco';
        }
      }
      if (field.errors['pattern']) {
        return 'Formato inválido. Solo se permiten letras, números, espacios, guiones y puntos';
      }
    }
    return '';
  }
}
