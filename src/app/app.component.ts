import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { FooterComponent } from './shared/components/footer/footer.component';
import { PreloaderComponent } from './shared/components/preloader/preloader.component';
import { RouterPreloaderService } from './shared/services/router-preloader.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FooterComponent, PreloaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  private readonly routerPreloaderService = inject(RouterPreloaderService);

  ngOnInit(): void {
    // Inicializar el servicio de preloader para rutas
    this.routerPreloaderService.init();
  }
}
