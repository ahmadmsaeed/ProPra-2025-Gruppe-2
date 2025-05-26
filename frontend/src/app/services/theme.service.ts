import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private isDarkTheme = new BehaviorSubject<boolean>(false);

  constructor() {
    // Beim Start prüfen, ob der User bereits eine Präferenz gespeichert hat
    const savedTheme = localStorage.getItem('darkTheme');
    if (savedTheme) {
      this.setDarkTheme(savedTheme === 'true');
    } else {
      // Prüfen der System-Präferenzen
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setDarkTheme(prefersDark);
    }

    // Auf System-Theme-Änderungen reagieren
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem('darkTheme')) {
        this.setDarkTheme(e.matches);
      }
    });
  }

  isDarkTheme$(): Observable<boolean> {
    return this.isDarkTheme.asObservable();
  }

  setDarkTheme(isDark: boolean): void {
    this.isDarkTheme.next(isDark);
    localStorage.setItem('darkTheme', isDark.toString());
    
    if (isDark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }

  toggleTheme(): void {
    this.setDarkTheme(!this.isDarkTheme.value);
  }
} 