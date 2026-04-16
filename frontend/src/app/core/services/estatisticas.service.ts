import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EstatisticasService {
  constructor(private http: HttpClient) {}

  getDashboard() {
    return this.http.get<any>(`${environment.apiUrl}/api/estatisticas`);
  }

  getFraquezas() {
    return this.http.get<any>(`${environment.apiUrl}/api/estatisticas/fraquezas`);
  }
}
