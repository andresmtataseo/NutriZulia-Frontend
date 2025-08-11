import { Component, EventEmitter, Input, OnChanges, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { UserInstitutionDetail } from '../../../../core/models/user-detail.interface';
import { Rol } from '../../../../core/models/rol.interface';
import { UserInstitutionUpdateRequest } from '../../../../core/models/user-detail.interface';
import { UsersService } from '../../services/users.service';
import { NotificationService } from '../../../../shared/services/notification.service';

@Component({
  selector: 'app-manage-assignment-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './manage-assignment-modal.component.html',
  styleUrl: './manage-assignment-modal.component.css'
})
export class ManageAssignmentModalComponent implements OnChanges {
  private fb = inject(FormBuilder);
  private usersService = inject(UsersService);
  private notificationService = inject(NotificationService);

  @Input() show = false;
  @Input() assignment: UserInstitutionDetail | null = null;
  @Input() roles: Rol[] = [];
  @Output() assignmentUpdated = new EventEmitter<void>();
  @Output() modalClosed = new EventEmitter<void>();

  form!: FormGroup;
  loading = signal(false);

  ngOnChanges(): void {
    if (this.assignment) {
      this.initializeForm();
    }
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      rolId: [this.assignment?.rol.id || '', Validators.required],
      isEnabled: [this.assignment?.isEnabled ?? true]
    });
  }

  get statusText(): string {
    return this.form?.get('isEnabled')?.value ? 'Activo' : 'Inactivo';
  }

  get statusBadgeClass(): string {
    return this.form?.get('isEnabled')?.value ? 'bg-success' : 'bg-danger';
  }

  onSubmit(): void {
    if (!this.assignment || !this.form.valid) return;

    this.loading.set(true);

    const updateRequest: UserInstitutionUpdateRequest = {
      id: this.assignment.id,
      rolId: this.form.get('rolId')?.value,
      isEnabled: this.form.get('isEnabled')?.value
    };

    this.usersService.updateUserInstitution(updateRequest).subscribe({
      next: () => {
        this.notificationService.showSuccess('Asignación actualizada correctamente');
        this.assignmentUpdated.emit();
        this.closeModal();
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error updating assignment:', error);
        const errorMessage = error.error?.message || 'Error al actualizar la asignación';
        this.notificationService.showError(errorMessage);
        this.loading.set(false);
      }
    });
  }

  closeModal(): void {
    this.show = false;
    this.modalClosed.emit();
  }
}
