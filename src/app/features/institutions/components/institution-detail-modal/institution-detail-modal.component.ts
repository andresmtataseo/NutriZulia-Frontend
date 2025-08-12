import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { catchError, of, Observable, forkJoin } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { InstitucionConUsuarios } from '../../models/institution.interface';
import { InstitutionService } from '../../services/institution.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { Institucion } from '../../../../core/models/catalog/institucion.interface';
import { ApiResponse } from '../../../../core/models/api-response.interface';
import { CatalogService } from '../../../../core/services/catalog.service';
import { TipoInstitucion } from '../../../../core/models/catalog/tipo-institucion.interface';
import { MunicipioSanitario } from '../../../../core/models/catalog/municipio-sanitario.interface';

@Component({
  selector: 'app-institution-detail-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './institution-detail-modal.component.html',
  styleUrls: ['./institution-detail-modal.component.css']
})
export class InstitutionDetailModalComponent implements OnInit, OnChanges {
  private fb = inject(FormBuilder);
  private institutionService = inject(InstitutionService);
  private notificationService = inject(NotificationService);
  private catalogService = inject(CatalogService);

  @Input() show = false;
  @Input() institution: InstitucionConUsuarios | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() institutionUpdated = new EventEmitter<InstitucionConUsuarios>();

  // Señales para el estado del componente
  activeTab = signal<'details' | 'users'>('details');
  loading = signal(false);
  updating = signal(false);
  
  // Signal interno para manejar los datos de la institución
  private institutionData = signal<InstitucionConUsuarios | null>(null);
  
  // Signals para los catálogos
  tiposInstituciones = signal<TipoInstitucion[]>([]);
  municipiosSanitarios = signal<MunicipioSanitario[]>([]);
  loadingCatalogs = signal(false);

  // Formulario
  institutionForm!: FormGroup;

  // Signals computados basados en institutionData
  canEdit = computed(() => this.institutionData() !== null);
  
  hasUsers = computed(() => (this.institutionData()?.usuarios?.length ?? 0) > 0);
  
  /**
   * Computed optimizado que calcula todas las estadísticas de usuarios en una sola pasada
   * Evita múltiples iteraciones sobre el array de usuarios
   */
  userStats = computed(() => {
    const users = this.institutionData()?.usuarios ?? [];
    const total = users.length;
    const active = users.filter(user => 
      user.is_enabled && user.usuario_institucion.is_enabled
    ).length;
    const inactive = total - active;
    
    return { total, active, inactive };
  });
  
  // Computed derivados para compatibilidad (si se necesitan individualmente)
  totalUsers = computed(() => this.userStats().total);
  activeUsers = computed(() => this.userStats().active);
  inactiveUsers = computed(() => this.userStats().inactive);
  
  // Getter para acceder a los datos de la institución
  get currentInstitution(): InstitucionConUsuarios | null {
    return this.institutionData();
  }

  ngOnInit(): void {
    this.initializeForm();
    this.loadCatalogs();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['institution']) {
      if (this.institution) {
        this.institutionData.set(this.institution);
        this.loadInstitutionDetails();
      } else {
        // Limpiar datos cuando no hay institución seleccionada
        this.institutionData.set(null);
        this.resetComponent();
      }
    }
  }

  private loadCatalogs(): void {
    this.loadingCatalogs.set(true);
    
    forkJoin({
      tiposInstituciones: this.catalogService.getInstitutionTypes(),
      municipiosSanitarios: this.catalogService.getHealthMunicipalities()
    }).pipe(
      catchError(error => {
        console.error('Error loading catalogs:', error);
        this.notificationService.showError('Error al cargar los catálogos');
        return of({ tiposInstituciones: [], municipiosSanitarios: [] });
      })
    ).subscribe(({ tiposInstituciones, municipiosSanitarios }) => {
      this.tiposInstituciones.set(tiposInstituciones);
      this.municipiosSanitarios.set(municipiosSanitarios);
      this.loadingCatalogs.set(false);
    });
  }

  private loadInstitutionDetails(): void {
    if (!this.institution?.id) {
      this.institutionData.set(null);
      this.resetComponent();
      return;
    }
    
    this.loading.set(true);
    
    this.institutionService.getInstitutionById(this.institution.id)
      .pipe(
        catchError(error => {
          console.error('Error loading institution details:', error);
          this.notificationService.showError('Error al cargar los detalles de la institución');
          this.loading.set(false);
          this.institutionData.set(null);
          return of(null);
        })
      )
      .subscribe(response => {
        this.loading.set(false);
        if (response?.data) {
          // Actualizar el signal interno con los datos completos del servidor
          const institutionWithUsers = {
            ...response.data,
            usuarios: response.data.usuarios || [] // Asegurar que usuarios sea un array
          };
          this.institutionData.set(institutionWithUsers);
          this.updateForm();
        } else {
          // Si no hay datos, resetear el componente
          this.institutionData.set(null);
          this.resetComponent();
        }
      });
  }

  private initializeForm(): void {
    this.institutionForm = this.fb.group({
      nombre: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100)
      ]],
      tipo_institucion_id: ['', Validators.required],
      municipio_sanitario_id: ['', Validators.required]
    });
  }

  private updateForm(): void {
    const institution = this.institutionData();
    if (institution) {
      this.institutionForm.patchValue({
        nombre: institution.nombre,
        tipo_institucion_id: institution.tipo_institucion.id,
        municipio_sanitario_id: institution.municipio_sanitario.id
      });
    }
  }

  /**
   * Resetea el estado del componente cuando no hay institución seleccionada
   */
  private resetComponent(): void {
    // Resetear señales de estado
    this.loading.set(false);
    this.updating.set(false);
    this.activeTab.set('details');
    
    // Resetear formulario
    if (this.institutionForm) {
      this.institutionForm.reset();
    }
  }

  setActiveTab(tab: 'details' | 'users'): void {
    this.activeTab.set(tab);
  }

  closeModal(): void {
    this.close.emit();
  }

  onFormSubmit(): void {
    const institution = this.institutionData();
    if (this.institutionForm.valid && institution) {
      this.updating.set(true);

      const formData = this.institutionForm.value;
      const updateData: Partial<Institucion> = {
        nombre: formData.nombre.trim().toUpperCase(),
        tipo_institucion_id: formData.tipo_institucion_id,
        municipio_sanitario_id: formData.municipio_sanitario_id
      };

      this.institutionService.updateInstitution(institution.id, updateData)
        .pipe(
          catchError(error => {
            console.error('Error updating institution:', error);
            this.updating.set(false);
            
            let errorMessage = 'Error al actualizar la institución';
            if (error.error?.message) {
              errorMessage = error.error.message;
            } else if (error.status === 409) {
              errorMessage = 'Ya existe una institución con este nombre';
            } else if (error.status === 400) {
              errorMessage = 'Datos inválidos. Verifique la información ingresada';
            } else if (error.status === 404) {
              errorMessage = 'Institución no encontrada';
            }
            
            this.notificationService.showError(errorMessage);
            return of(null);
          })
        )
        .subscribe(response => {
          this.updating.set(false);
          if (response?.data) {
            this.notificationService.showSuccess('Institución actualizada exitosamente');
            
            // Actualizar los datos locales con la respuesta del servidor
             const updatedInstitution: InstitucionConUsuarios = {
               ...institution,
               nombre: response.data.nombre,
               tipo_institucion: {
                 id: response.data.tipo_institucion_id,
                 nombre: this.tiposInstituciones().find(t => t.id === response.data?.tipo_institucion_id)?.nombre || ''
               },
               municipio_sanitario: {
                 id: response.data.municipio_sanitario_id,
                 nombre: this.municipiosSanitarios().find(m => m.id === response.data?.municipio_sanitario_id)?.nombre || ''
               }
             };
            
            this.institutionData.set(updatedInstitution);
            this.institutionUpdated.emit(updatedInstitution);
            this.closeModal();
          }
        });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.institutionForm.controls).forEach(key => {
      const control = this.institutionForm.get(key);
      control?.markAsTouched();
    });
  }

  // Getters y métodos de utilidad
  get institutionName(): string {
    return this.institutionData()?.nombre ?? 'Institución';
  }

  /**
   * Determina el estado completo del usuario considerando tanto el usuario como la asignación
   */
  getUserStatus(user: any): { isActive: boolean; statusText: string; statusClass: string; iconClass: string } {
    const userEnabled = user.is_enabled;
    const institutionUserEnabled = user.usuario_institucion?.is_enabled;
    const isActive = userEnabled && institutionUserEnabled;
    
    if (!userEnabled) {
      return {
        isActive: false,
        statusText: 'Usuario Inactivo',
        statusClass: 'bg-danger',
        iconClass: 'bi bi-person-x'
      };
    }
    
    if (!institutionUserEnabled) {
      return {
        isActive: false,
        statusText: 'Deshabilitado en Institución',
        statusClass: 'bg-warning text-dark',
        iconClass: 'bi bi-building-x'
      };
    }
    
    return {
      isActive: true,
      statusText: 'Activo',
      statusClass: 'bg-success',
      iconClass: 'bi bi-check-circle'
    };
  }

  /**
   * Clase CSS para badge de usuario basado en estado
   */
  getUserBadgeClass(isEnabled: boolean): string {
    return isEnabled ? 'bg-success' : 'bg-danger';
  }

  /**
   * Formatea fecha a formato local venezolano
   */
  formatDate(dateString: string): string {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('es-VE');
    } catch {
      return dateString;
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.institutionForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.institutionForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} es requerido`;
      }
      if (field.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} debe tener al menos ${field.errors['minlength'].requiredLength} caracteres`;
      }
      if (field.errors['maxlength']) {
        return `${this.getFieldLabel(fieldName)} no puede exceder ${field.errors['maxlength'].requiredLength} caracteres`;
      }
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'nombre': 'Nombre de la institución',
      'tipo_institucion_id': 'Tipo de institución',
      'municipio_sanitario_id': 'Municipio sanitario'
    };
    return labels[fieldName] || fieldName;
  }

  getRoleBadgeClass(roleName: string): string {
    const roleClasses: { [key: string]: string } = {
      'ADMINISTRADOR': 'bg-danger',
      'COORDINADOR': 'bg-warning text-dark',
      'NUTRICIONISTA': 'bg-primary',
      'MEDICO': 'bg-info text-dark',
      'ENFERMERO': 'bg-success'
    };
    return roleClasses[roleName.toUpperCase()] || 'bg-secondary';
  }
}