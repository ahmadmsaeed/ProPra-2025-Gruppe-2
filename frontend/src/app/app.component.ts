import { Component } from '@angular/core';
import { AuthService } from './auth.service';
import { RouterOutlet, RouterModule } from '@angular/router';
import { NgIf } from '@angular/common';
import { BackendStatusComponent } from './backend-status.component';



@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule, BackendStatusComponent, NgIf],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'angular-de-tutorial';

  constructor(public authService: AuthService) {}

  onLogout() {
    this.authService.logout();
    window.location.href = '/';
  }
}
