import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import { Curso } from '../../../core/models';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h1>Plataforma Fuvest</h1>
        <h2>Criar conta</h2>

        <div *ngIf="erro()" class="erro">{{ erro() }}</div>

        <div class="form-group">
          <label>Nome completo</label>
          <input type="text" [(ngModel)]="nome" placeholder="Seu nome" />
        </div>

        <div class="form-group">
          <label>Email</label>
          <input type="email" [(ngModel)]="email" placeholder="seu@email.com" />
        </div>

        <div class="form-group">
          <label>Senha</label>
          <input type="password" [(ngModel)]="senha" placeholder="Mínimo 6 caracteres" />
        </div>

        <div class="form-group">
          <label>Curso objetivo</label>
          <select [(ngModel)]="cursoId">
            <option [value]="null">Selecione um curso</option>
            <option *ngFor="let c of cursos()" [value]="c.id">{{ c.nome }}</option>
          </select>
        </div>

        <button (click)="register()" [disabled]="carregando()">
          {{ carregando() ? 'Criando conta...' : 'Criar conta' }}
        </button>

        <p>Já tem conta? <a routerLink="/login">Entrar</a></p>
      </div>
    </div>
  `,
  styleUrl: './register.component.scss',
})
export class RegisterComponent implements OnInit {
  nome = '';
  email = '';
  senha = '';
  cursoId: number | null = null;
  cursos = signal<Curso[]>([]);
  erro = signal('');
  carregando = signal(false);

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
  ) {}

  ngOnInit() {
    this.http.get<Curso[]>(`${environment.apiUrl}/api/cursos`).subscribe({
      next: (cursos) => this.cursos.set(cursos),
    });
  }

  register() {
    if (!this.nome || !this.email || !this.senha) {
      this.erro.set('Preencha todos os campos obrigatórios');
      return;
    }

    this.carregando.set(true);
    this.erro.set('');

    this.authService.register({
      nome: this.nome,
      email: this.email,
      senha: this.senha,
      curso_id: this.cursoId ? Number(this.cursoId) : undefined,
    }).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e) => {
        this.erro.set(e.error?.message ?? 'Erro ao criar conta');
        this.carregando.set(false);
      },
    });
  }
}
