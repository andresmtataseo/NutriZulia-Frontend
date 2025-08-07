import { Injectable, inject } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError, RoutesRecognized } from '@angular/router';
import { filter } from 'rxjs/operators';

import { PreloaderService } from './preloader.service';

@Injectable({
  providedIn: 'root'
})
export class RouterPreloaderService {
  private readonly router = inject(Router);
  private readonly preloaderService = inject(PreloaderService);
  private currentUrl: string = '';
  private navigationTimeout: number | null = null;

  /**
   * Inicializa el servicio y configura los listeners de navegación
   */
  init(): void {
    this.currentUrl = this.router.url;
    this.setupNavigationListeners();
  }

  /**
   * Configura los listeners para eventos de navegación del router
   */
  private setupNavigationListeners(): void {
    // Listener para inicio de navegación
    this.router.events
      .pipe(filter(event => event instanceof NavigationStart))
      .subscribe((event: NavigationStart) => {
        this.handleNavigationStart(event);
      });

    // Listener para fin de navegación (exitosa, cancelada o con error)
    this.router.events
      .pipe(
        filter(event => 
          event instanceof NavigationEnd || 
          event instanceof NavigationCancel || 
          event instanceof NavigationError
        )
      )
      .subscribe((event) => {
        this.handleNavigationEnd(event);
      });
  }

  /**
   * Maneja el inicio de una navegación
   */
  private handleNavigationStart(event: NavigationStart): void {
    const config = this.preloaderService.getConfig();
    
    // Verificar si el preloader está habilitado para cambios de ruta
    if (!config.showOnRouteChange) {
      return;
    }

    // Verificar si la ruta está excluida
    if (this.preloaderService.isRouteExcluded(event.url)) {
      return;
    }

    // Verificar si estamos navegando a la misma ruta
    const targetUrl = this.normalizeUrl(event.url);
    const currentUrl = this.normalizeUrl(this.currentUrl);
    
    if (targetUrl === currentUrl) {
      // Navegación a la misma ruta, no mostrar preloader
      return;
    }

    // Limpiar timeout anterior si existe
    if (this.navigationTimeout) {
      clearTimeout(this.navigationTimeout);
    }

    // Determinar el mensaje según la ruta de destino
    const message = this.getRouteMessage(event.url);
    
    // Mostrar preloader
    this.preloaderService.show(message, 'route');

    // Timeout de seguridad para ocultar el preloader
    this.navigationTimeout = window.setTimeout(() => {
      this.preloaderService.forceHide();
      this.navigationTimeout = null;
    }, config.maxDisplayTime);
  }

  /**
   * Maneja el fin de una navegación
   */
  private handleNavigationEnd(event: NavigationEnd | NavigationCancel | NavigationError): void {
    const config = this.preloaderService.getConfig();
    
    if (!config.showOnRouteChange) {
      return;
    }

    // Limpiar timeout de seguridad
    if (this.navigationTimeout) {
      clearTimeout(this.navigationTimeout);
      this.navigationTimeout = null;
    }

    // Actualizar URL actual si la navegación fue exitosa
    if (event instanceof NavigationEnd) {
      this.currentUrl = event.url;
    }

    // Ocultar preloader
    this.preloaderService.hide();

    // Log de errores de navegación para debugging
    if (event instanceof NavigationError) {
      console.warn('Navigation error:', event.error);
    } else if (event instanceof NavigationCancel) {
      console.info('Navigation cancelled:', event.reason);
    }
  }

  /**
   * Obtiene un mensaje personalizado según la ruta de destino
   */
  private getRouteMessage(url: string): string {
    // Mapeo de rutas a mensajes personalizados
    const routeMessages: Record<string, string> = {
      '/dashboard': 'Cargando panel principal...',
      '/login': 'Iniciando sesión...',
      '/profile': 'Cargando perfil...',
      '/settings': 'Cargando configuración...',
      '/reports': 'Cargando reportes...',
      '/users': 'Cargando usuarios...',
      '/patients': 'Cargando pacientes...',
      '/appointments': 'Cargando citas...',
      '/nutrition': 'Cargando planes nutricionales...'
    };

    // Buscar coincidencia exacta
    if (routeMessages[url]) {
      return routeMessages[url];
    }

    // Buscar coincidencia parcial
    for (const [route, message] of Object.entries(routeMessages)) {
      if (url.startsWith(route)) {
        return message;
      }
    }

    // Mensaje por defecto
    return 'Cargando página...';
  }

  /**
   * Muestra manualmente el preloader para una navegación específica
   */
  showForRoute(url: string, message?: string): void {
    const finalMessage = message || this.getRouteMessage(url);
    this.preloaderService.show(finalMessage, 'route');
  }

  /**
   * Oculta manualmente el preloader de ruta
   */
  hideForRoute(): void {
    this.preloaderService.hide();
  }

  /**
   * Fuerza el ocultamiento del preloader de ruta
   */
  forceHideForRoute(): void {
    this.preloaderService.forceHide();
  }

  /**
   * Normaliza una URL para comparación
   */
  private normalizeUrl(url: string): string {
    // Remover fragmentos y query parameters para comparación
    const urlWithoutFragment = url.split('#')[0];
    const urlWithoutQuery = urlWithoutFragment.split('?')[0];
    
    // Remover trailing slash excepto para la raíz
    return urlWithoutQuery === '/' ? '/' : urlWithoutQuery.replace(/\/$/, '');
  }
}