import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

export interface NotificationData {
  type: NotificationType;
  title?: string;
  message: string;
  dismissible?: boolean;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.css'
})
export class NotificationComponent implements OnInit, OnDestroy, OnChanges {
  @Input() notification: NotificationData | null = null;
  @Input() position: 'top' | 'bottom' = 'top';
  @Output() dismissed = new EventEmitter<void>();

  private autoCloseTimeout?: number;

  ngOnInit() {
    this.setupAutoClose();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['notification'] && changes['notification'].currentValue) {
      this.setupAutoClose();
    }
  }

  ngOnDestroy() {
    this.clearAutoCloseTimeout();
  }

  private setupAutoClose() {
    this.clearAutoCloseTimeout();

    if (this.notification?.autoClose) {
      const delay = this.notification.autoCloseDelay || 5000;
      this.autoCloseTimeout = window.setTimeout(() => {
        this.dismiss();
      }, delay);
    }
  }

  private clearAutoCloseTimeout() {
    if (this.autoCloseTimeout) {
      clearTimeout(this.autoCloseTimeout);
      this.autoCloseTimeout = undefined;
    }
  }

  dismiss() {
    this.dismissed.emit();
  }

  getAlertClass(): string {
    if (!this.notification) return '';

    const typeMap = {
      success: 'alert-success',
      warning: 'alert-warning',
      error: 'alert-danger',
      info: 'alert-info'
    };

    return typeMap[this.notification.type] || 'alert-info';
  }

}
