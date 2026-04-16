# STEP 09 — Frontend Angular 19: Base, Auth e Roteamento

## Contexto
Passo 9 da Plataforma Fuvest. Backend completo (Steps 01-08).
Iniciar o frontend Angular 19 standalone: configuração base, serviços de auth, interceptor JWT e telas de login/registro.

## Stack frontend
- Angular 19 (standalone components — sem NgModules)
- Angular Signals para estado reativo
- SCSS para estilos
- Socket.IO Client para WebSocket
- HttpClient para chamadas REST

---

## Tarefa 1 — Criar `src/app/core/models/index.ts` (interfaces TypeScript)

```typescript
export interface Usuario {
  id: string;
  nome: string;
  email: string;
  curso_id?: number;
}

export interface AuthResponse {
  access_token: string;
  user: Usuario;
}

export interface Questao {
  id: number;
  enunciado: string;
  alternativas: { letra: string; texto: string }[];
  numero: number;
  total: number;
}

export interface ProvaGerada {
  prova_id: string;
  primeira_questao: Questao;
}

export interface RespostaQuestao {
  correta: boolean;
  resposta_correta: string;
  proxima_questao: Questao | null;
  finalizada: boolean;
}

export interface ResultadoProva {
  acertos: number;
  total: number;
  percentual: number;
  por_tema: { tema: string; acertos: number; erros: number; taxa_acerto: number }[];
  sugestao_ia?: string;
}

export interface StatsTema {
  tema: string;
  acertos: number;
  erros: number;
  taxa_acerto: number;
  taxa_erro: number;
}

export interface LeaderboardEntry {
  posicao: number;
  nome: string;
  acertos?: number;
  total_provas?: number;
  media_acertos?: number;
}

export interface Curso {
  id: number;
  nome: string;
  descricao?: string;
  temas: { tema: string }[];
}
```

---

## Tarefa 2 — Criar `src/app/core/services/auth.service.ts`

```typescript
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthResponse, Usuario } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _usuario = signal<Usuario | null>(this.carregarDoStorage());
  readonly usuario = this._usuario.asReadonly();
  readonly logado = computed(() => this._usuario() !== null);

  constructor(private http: HttpClient, private router: Router) {}

  register(dados: { nome: string; email: string; senha: string; curso_id?: number }) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/api/auth/register`, dados).pipe(
      tap((res) => this.salvarSessao(res)),
    );
  }

  login(email: string, senha: string) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/api/auth/login`, { email, senha }).pipe(
      tap((res) => this.salvarSessao(res)),
    );
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this._usuario.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  private salvarSessao(res: AuthResponse) {
    localStorage.setItem('token', res.access_token);
    localStorage.setItem('usuario', JSON.stringify(res.user));
    this._usuario.set(res.user);
  }

  private carregarDoStorage(): Usuario | null {
    try {
      const raw = localStorage.getItem('usuario');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
```

---

## Tarefa 3 — Criar `src/app/core/interceptors/jwt.interceptor.ts`

```typescript
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(req);
};
```

---

## Tarefa 4 — Criar `src/app/core/guards/auth.guard.ts`

```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.logado()) return true;

  router.navigate(['/login']);
  return false;
};
```

---

## Tarefa 5 — Criar `src/app/app.config.ts`

```typescript
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([jwtInterceptor])),
  ],
};
```

---

## Tarefa 6 — Criar `src/app/app.routes.ts`

```typescript
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'provas/configurar',
        loadComponent: () =>
          import('./features/provas/configurar/configurar.component').then((m) => m.ConfigurarComponent),
      },
      {
        path: 'provas/:id/executar',
        loadComponent: () =>
          import('./features/provas/executar/executar.component').then((m) => m.ExecutarComponent),
      },
      {
        path: 'provas/:id/resultado',
        loadComponent: () =>
          import('./features/provas/resultado/resultado.component').then((m) => m.ResultadoComponent),
      },
      {
        path: 'estatisticas',
        loadComponent: () =>
          import('./features/estatisticas/estatisticas.component').then((m) => m.EstatisticasComponent),
      },
      {
        path: 'leaderboard',
        loadComponent: () =>
          import('./features/leaderboard/leaderboard.component').then((m) => m.LeaderboardComponent),
      },
      {
        path: 'ia-chat',
        loadComponent: () =>
          import('./features/ia-chat/ia-chat.component').then((m) => m.IaChatComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
```

---

## Tarefa 7 — Criar `src/app/features/auth/login/login.component.ts`

```typescript
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
      <div class="auth-card">
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
```

---

## Tarefa 8 — Criar `src/app/features/auth/register/register.component.ts`

```typescript
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
      curso_id: this.cursoId ?? undefined,
    }).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e) => {
        this.erro.set(e.error?.message ?? 'Erro ao criar conta');
        this.carregando.set(false);
      },
    });
  }
}
```

---

## Tarefa 9 — Criar `src/app/app.component.ts`

```typescript
import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule],
  template: `
    <nav *ngIf="authService.logado()">
      <a routerLink="/dashboard">Dashboard</a>
      <a routerLink="/provas/configurar">Nova Prova</a>
      <a routerLink="/estatisticas">Estatísticas</a>
      <a routerLink="/leaderboard">Ranking</a>
      <a routerLink="/ia-chat">IA</a>
      <button (click)="logout()">Sair</button>
    </nav>
    <router-outlet />
  `,
})
export class AppComponent {
  constructor(public authService: AuthService, private router: Router) {}
  logout() { this.authService.logout(); }
}
```

---

## Resultado esperado ao final deste passo
- [ ] `ng serve` sobe sem erros
- [ ] `/login` exibe formulário e faz login com sucesso
- [ ] `/register` lista cursos do backend e cria conta
- [ ] Após login, token é salvo no localStorage
- [ ] Acessar `/dashboard` sem estar logado redireciona para `/login`
- [ ] Interceptor injeta `Authorization: Bearer` em toda requisição autenticada
- [ ] Navbar aparece apenas quando logado

## Próximo passo
`STEP_10_FRONTEND_PROVAS.md` — Telas de Provas: Configurar, Executar, Resultado
