import { Injectable, signal, computed } from '@angular/core';

export interface PreloaderState {
  isLoading: boolean;
  loadingCount: number;
  message?: string;
  type: 'route' | 'http' | 'custom';
}

export interface PreloaderConfig {
  minDisplayTime: number; // ms - evitar flashes
  maxDisplayTime: number; // ms - timeout de seguridad
  showOnRouteChange: boolean;
  showOnHttpRequests: boolean;
  excludedRoutes: string[];
  excludedHttpUrls: string[];
}

@Injectable({
  providedIn: 'root'
})
export class PreloaderService {
  private readonly defaultConfig: PreloaderConfig = {
    minDisplayTime: 300,
    maxDisplayTime: 10000,
    showOnRouteChange: true,
    showOnHttpRequests: true,
    excludedRoutes: ['/login'],
    excludedHttpUrls: ['/api/health']
  };

  private readonly preloaderState = signal<PreloaderState>({
    isLoading: false,
    loadingCount: 0,
    message: undefined,
    type: 'custom'
  });

  private loadingStartTime: number | null = null;
  private hideTimeout: number | null = null;
  private config = signal<PreloaderConfig>(this.defaultConfig);

  // Computed signals para acceso reactivo
  readonly isLoading = computed(() => this.preloaderState().isLoading);
  readonly loadingMessage = computed(() => this.preloaderState().message);
  readonly loadingType = computed(() => this.preloaderState().type);
  readonly state = computed(() => this.preloaderState());

  /**
   * Muestra el preloader con configuración opcional
   */
  show(message?: string, type: 'route' | 'http' | 'custom' = 'custom'): void {
    // Cancelar cualquier timeout pendiente
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    // Incrementar contador de operaciones de carga
    const currentState = this.preloaderState();
    const newCount = currentState.loadingCount + 1;

    // Marcar tiempo de inicio si es la primera operación
    if (newCount === 1) {
      this.loadingStartTime = Date.now();
    }

    this.preloaderState.set({
      isLoading: true,
      loadingCount: newCount,
      message,
      type
    });
  }

  /**
   * Oculta el preloader respetando el tiempo mínimo de visualización
   */
  hide(force = false): void {
    const currentState = this.preloaderState();
    
    if (currentState.loadingCount <= 0 && !force) {
      return;
    }

    const newCount = Math.max(0, currentState.loadingCount - 1);

    // Solo ocultar si no hay más operaciones pendientes
    if (newCount === 0 || force) {
      this.performHide();
    } else {
      // Actualizar contador pero mantener visible
      this.preloaderState.update(state => ({
        ...state,
        loadingCount: newCount
      }));
    }
  }

  /**
   * Realiza el ocultamiento del preloader respetando el tiempo mínimo
   */
  private performHide(): void {
    const config = this.config();
    const now = Date.now();
    const elapsedTime = this.loadingStartTime ? now - this.loadingStartTime : 0;
    const remainingTime = Math.max(0, config.minDisplayTime - elapsedTime);

    const hideAction = () => {
      this.preloaderState.set({
        isLoading: false,
        loadingCount: 0,
        message: undefined,
        type: 'custom'
      });
      this.loadingStartTime = null;
    };

    if (remainingTime > 0) {
      // Esperar el tiempo mínimo antes de ocultar
      this.hideTimeout = window.setTimeout(hideAction, remainingTime);
    } else {
      // Ocultar inmediatamente
      hideAction();
    }
  }

  /**
   * Fuerza el ocultamiento inmediato del preloader
   */
  forceHide(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    this.preloaderState.set({
      isLoading: false,
      loadingCount: 0,
      message: undefined,
      type: 'custom'
    });
    this.loadingStartTime = null;
  }

  /**
   * Verifica si una ruta debe ser excluida del preloader
   */
  isRouteExcluded(route: string): boolean {
    const config = this.config();
    return config.excludedRoutes.some(excludedRoute => 
      route.includes(excludedRoute)
    );
  }

  /**
   * Verifica si una URL HTTP debe ser excluida del preloader
   */
  isHttpUrlExcluded(url: string): boolean {
    const config = this.config();
    return config.excludedHttpUrls.some(excludedUrl => 
      url.includes(excludedUrl)
    );
  }

  /**
   * Actualiza la configuración del preloader
   */
  updateConfig(newConfig: Partial<PreloaderConfig>): void {
    this.config.update(current => ({
      ...current,
      ...newConfig
    }));
  }

  /**
   * Obtiene la configuración actual
   */
  getConfig(): PreloaderConfig {
    return this.config();
  }
}