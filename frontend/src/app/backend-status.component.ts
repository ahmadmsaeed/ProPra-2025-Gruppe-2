import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-backend-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './backend-status.component.html',
  styleUrls: ['./backend-status.component.scss']
})
export class BackendStatusComponent {
  status: 'unknown' | 'up' | 'down' = 'unknown';

  constructor(private http: HttpClient) {
    this.checkBackend();
  }

  checkBackend() {
    // Check backend status by attempting to connect to the auth endpoint
    this.http.get('http://localhost:3000/').subscribe({
      next: () => this.status = 'up',
      error: () => this.status = 'down'
    });
  }
}
