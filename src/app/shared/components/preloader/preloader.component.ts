import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PreloaderService } from '../../services/preloader.service';

@Component({
  selector: 'app-preloader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './preloader.component.html',
  styleUrl: './preloader.component.scss'
})
export class PreloaderComponent {
  private readonly preloaderService = inject(PreloaderService);

  // Signals reactivos del servicio
  readonly isLoading = this.preloaderService.isLoading;
  readonly loadingMessage = this.preloaderService.loadingMessage;
  readonly loadingType = this.preloaderService.loadingType;

  // Computed para determinar el mensaje a mostrar
  readonly displayMessage = computed(() => {
    const message = this.loadingMessage();
    const type = this.loadingType();
    
    if (message) {
      return message;
    }

    // Mensajes por defecto según el tipo
    switch (type) {
      case 'route':
        return 'Cargando página...';
      case 'http':
        return 'Procesando solicitud...';
      default:
        return 'Cargando...';
    }
  });

  // Computed para clases CSS dinámicas
  readonly spinnerClasses = computed(() => {
    const type = this.loadingType();
    return {
      'spinner': true,
      'spinner--route': type === 'route',
      'spinner--http': type === 'http',
      'spinner--custom': type === 'custom'
    };
  });
}