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
