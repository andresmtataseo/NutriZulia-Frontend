import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { FooterComponent } from "./common/footer/footer.component";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoginComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'NutriZulia-Frontend';
}
