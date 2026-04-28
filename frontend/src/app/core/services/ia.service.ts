import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ProvaGerada } from '../models';

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

  gerarProva(temas: string[], qtdQuestoes: number) {
    return this.http.post<ProvaGerada>(
      `${environment.apiUrl}/api/ia/gerar-prova`,
      { temas, qtd_questoes: qtdQuestoes }
    );
  }
}

