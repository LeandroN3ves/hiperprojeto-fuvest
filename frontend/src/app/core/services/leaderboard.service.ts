import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  constructor(private http: HttpClient) {}

  getGlobal() {
    return this.http.get<any>(`${environment.apiUrl}/api/leaderboard/global`);
  }

  getCurso(cursoId: number, semana?: string) {
    const params = semana ? `?semana=${semana}` : '';
    return this.http.get<any>(`${environment.apiUrl}/api/leaderboard/curso/${cursoId}${params}`);
  }

  getCursosAtivos() {
    return this.http.get<number[]>(`${environment.apiUrl}/api/leaderboard/cursos-ativos`);
  }
}
