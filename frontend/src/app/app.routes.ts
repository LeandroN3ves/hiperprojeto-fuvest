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
      {
        path: 'gerador-ia',
        loadComponent: () =>
          import('./features/gerador-ia/gerador-ia.component').then((m) => m.GeradorIaComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
