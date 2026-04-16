import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card fade-in">
        <h1>Plataforma Fuvest</h1>
        <h2>Entrar</h2>

        <div *ngIf="erro()" class="erro">{{ erro() }}</div>

        <div class="form-group">
          <label>Email</label>
          <input type="email" [(ngModel)]="email" placeholder="seu@email.com" />
        </div>

        <div class="form-group">
          <label>Senha</label>
          <input type="password" [(ngModel)]="senha" placeholder="••••••" />
        </div>

        <button (click)="login()" [disabled]="carregando()">
          {{ carregando() ? 'Entrando...' : 'Entrar' }}
        </button>

        <p>Não tem conta? <a routerLink="/register">Criar conta</a></p>
      </div>
    </div>
  `,
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  email = '';
  senha = '';
  erro = signal('');
  carregando = signal(false);

  constructor(private authService: AuthService, private router: Router) {}

  login() {
    if (!this.email || !this.senha) {
      this.erro.set('Preencha todos os campos');
      return;
    }

    this.carregando.set(true);
    this.erro.set('');

    this.authService.login(this.email, this.senha).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e) => {
        this.erro.set(e.error?.message ?? 'Credenciais inválidas');
        this.carregando.set(false);
      },
    });
  }
}
