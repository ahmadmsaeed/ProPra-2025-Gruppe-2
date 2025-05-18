import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing-page',
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.scss'],
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('600ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class LandingPageComponent {
  features = [
    {
      title: 'Interaktives Lernen',
      description: 'Lerne SQL durch praktische Übungen in einer echten Datenbankumgebung',
      icon: 'code'
    },
    {
      title: 'Schritt für Schritt',
      description: 'Von Grundlagen bis zu fortgeschrittenen Konzepten',
      icon: 'school'
    },
    {
      title: 'Sofortiges Feedback',
      description: 'Erhalte direktes Feedback zu deinen SQL-Abfragen',
      icon: 'feedback'
    },
    {
      title: 'Praxisnahe Beispiele',
      description: 'Lerne anhand realer Datenbank-Szenarien',
      icon: 'storage'
    }
  ];

  constructor(private router: Router) {}

  navigateToRegister() {
    this.router.navigate(['/register']);
  }
} 