import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  isDark = signal<boolean>(this.getInitialTheme());

  constructor() {
    // Aplicar tema sempre que o sinal mudar
    effect(() => {
      const dark = this.isDark();
      if (dark) {
        document.body.classList.add('dark');
      } else {
        document.body.classList.remove('dark');
      }
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    });
  }

  toggle() {
    this.isDark.update(v => !v);
  }

  private getInitialTheme(): boolean {
    const saved = localStorage.getItem('theme');
    if (saved) {
      return saved === 'dark';
    }
    // Opcional: Checar preferência do sistema
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}
