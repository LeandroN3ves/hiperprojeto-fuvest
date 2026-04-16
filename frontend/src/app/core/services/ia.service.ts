import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface MensagemChat {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable({ providedIn: 'root' })
export class IaService {
  constructor(private http: HttpClient) {}

  chat(mensagem: string, historico: MensagemChat[] = []) {
    return this.http.post<{ resposta: string; fonte: string }>(
      `${environment.apiUrl}/api/ia/chat`,
      { mensagem, historico }
    );
  }

  getSugestoes() {
    return this.http.get<any>(`${environment.apiUrl}/api/ia/sugestoes`);
  }
}
