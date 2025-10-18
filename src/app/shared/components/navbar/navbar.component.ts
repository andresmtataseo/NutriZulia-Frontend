import { Component, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthService } from '../../../features/auth/services/auth.service';
import { AuthStorageService } from '../../../features/auth/services/auth-storage.service';
declare var bootstrap: any;

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit, OnDestroy {
  currentUser = computed(() => this.authService.currentUser());
  private logoutModal: any;
  isLoggingOut = false;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private authStorageService: AuthStorageService,
    private router: Router
  ) {}

  /** Nombre completo (con fallback) */
  get userFullName(): string {
    const userData = this.authStorageService.getUserData();
    if (userData && userData.nombres && userData.apellidos) {
      return `${userData.nombres} ${userData.apellidos}`;
    }
    return 'Usuario';
  }

  /** Mostrar primer nombre y primer apellido */
  get userShortName(): string {
    const userData = this.authStorageService.getUserData();
    const firstName = userData?.nombres?.split(' ')?.[0] || '';
    const firstSurname = userData?.apellidos?.split(' ')?.[0] || '';
    const short = [firstName, firstSurname].filter(Boolean).join(' ');
    return short || 'Usuario';
  }

  /** Correo */
  get userEmail(): string {
    const userData = this.authStorageService.getUserData();
    return userData && userData.correo ? userData.correo : '';
  }

  /** Información adicional para el dropdown */
  get userCedula(): string {
    const userData = this.authStorageService.getUserData();
    return userData && userData.cedula ? userData.cedula : '';
  }

  /** Roles mapeados a etiquetas en español */
  get displayedRoles(): string[] {
    const rawRoles = (this.authStorageService.getUserRoles?.() ?? []) as string[];
    const toLabel = (code: string): string => {
      const c = (code || '').toUpperCase();
      if (c.includes('ADMIN')) return 'Administrador';
      if (c.includes('SUPERVISOR')) return 'Supervisor';
      if (c.includes('NUTRICIONISTA')) return 'Nutricionista';
      return code;
    };
    const labels = rawRoles.map(toLabel);
    return Array.from(new Set(labels));
  }
  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Cerrar sesión */
  showLogoutModal(): void {
    const el = document.getElementById('logoutConfirmModal');
    if (el) {
      this.logoutModal = new bootstrap.Modal(el, { backdrop: 'static', keyboard: false });
      this.logoutModal.show();
    }
  }

  hideLogoutModal(): void {
    if (this.logoutModal) {
      this.logoutModal.hide();
      this.logoutModal = null;
    }
  }

  confirmLogout(): void {
    if (this.isLoggingOut) return;
    this.isLoggingOut = true;
    // No cerrar el modal aquí; mantenerlo abierto hasta que termine el logout
    this.authService.logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isLoggingOut = false;
          this.hideLogoutModal();
        },
        error: () => {
          this.isLoggingOut = false;
          this.hideLogoutModal();
        }
      });
  }

  /** Acciones del menú */
  changePassword(): void {
    this.router.navigate(['/login'], { queryParams: { action: 'change-password' } });
  }
}
