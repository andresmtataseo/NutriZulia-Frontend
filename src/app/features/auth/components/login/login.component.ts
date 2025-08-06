import { Component, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NotificationComponent } from '../../../../shared/components/notification/notification.component';
import { NotificationService } from '../../../../shared/services/notification.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, NotificationComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private notificationService = inject(NotificationService);

  get notification() {
    return this.notificationService.notification;
  }

  login(form: NgForm) {
    const tipoCedula = form.value.tipoCedula;
    const numeroCedula = form.value.numeroCedula;

    const cedula = tipoCedula + '-' + numeroCedula;
    const password = form.value.clave;

    // Simulación de login - aquí iría la lógica real de autenticación
    if (!cedula || !password) {
      this.notificationService.showError('Por favor, completa todos los campos requeridos.');
      return;
    }

    if (cedula === 'V-12345678' && password === 'test123') {
      this.notificationService.showSuccess('¡Inicio de sesión exitoso!', 'Bienvenido');
    } else {
      this.notificationService.showError('Credenciales incorrectas. Verifica tu cédula y contraseña.');
    }

  }

  onNotificationDismissed() {
    this.notificationService.hide();
  }

}
