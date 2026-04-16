import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule],
  template: `
    <div class="global-theme-toggle" (click)="themeService.toggle()" [title]="themeService.isDark() ? 'Modo Claro' : 'Modo Noturno'">
      {{ themeService.isDark() ? '🌞' : '🌙' }}
    </div>

    <nav *ngIf="authService.logado()">
      <a routerLink="/dashboard">Dashboard</a>
      <a routerLink="/provas/configurar">Nova Prova</a>
      <a routerLink="/estatisticas">Estatísticas</a>
      <a routerLink="/leaderboard">Ranking</a>
      <a routerLink="/ia-chat">IA</a>
      <button class="logout-btn" (click)="logout()">Sair</button>
    </nav>
    <router-outlet />
  `,
})
export class AppComponent {
  constructor(
    public authService: AuthService, 
    public themeService: ThemeService,
    private router: Router
  ) {}
  logout() { this.authService.logout(); }
}
