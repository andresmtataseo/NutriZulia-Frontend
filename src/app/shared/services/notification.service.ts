import { Injectable, signal } from '@angular/core';
import { NotificationData } from '../components/notification/notification.component';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private currentNotification = signal<NotificationData | null>(null);

  // Getter para acceder a la notificación actual
  get notification() {
    return this.currentNotification.asReadonly();
  }

  /**
   * Muestra una notificación de éxito
   */
  showSuccess(message: string, title?: string, options?: Partial<NotificationData>) {
    this.show({
      type: 'success',
      title: title || 'Éxito',
      message,
      autoClose: true,
      autoCloseDelay: 4000,
      ...options
    });
  }

  /**
   * Muestra una notificación de advertencia
   */
  showWarning(message: string, title?: string, options?: Partial<NotificationData>) {
    this.show({
      type: 'warning',
      title: title || 'Advertencia',
      message,
      autoClose: true,
      autoCloseDelay: 6000,
      ...options
    });
  }

  /**
   * Muestra una notificación de error
   */
  showError(message: string, title?: string, options?: Partial<NotificationData>) {
    this.show({
      type: 'error',
      title: title || 'Error',
      message,
      autoClose: true,
      autoCloseDelay: 7000,
      ...options
    });
  }

  /**
   * Muestra una notificación informativa
   */
  showInfo(message: string, title?: string, options?: Partial<NotificationData>) {
    this.show({
      type: 'info',
      title: title || 'Información',
      message,
      autoClose: true,
      autoCloseDelay: 5000,
      ...options
    });
  }

  /**
   * Muestra una notificación personalizada
   */
  show(notification: NotificationData) {
    this.currentNotification.set({
      dismissible: true,
      autoClose: false,
      autoCloseDelay: 5000,
      ...notification
    });
  }

  /**
   * Oculta la notificación actual
   */
  hide() {
    this.currentNotification.set(null);
  }

  /**
   * Verifica si hay una notificación visible
   */
  hasNotification(): boolean {
    return this.currentNotification() !== null;
  }
}
