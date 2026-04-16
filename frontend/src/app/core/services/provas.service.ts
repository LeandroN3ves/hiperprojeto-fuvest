import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ProvaGerada, Questao, RespostaQuestao, ResultadoProva } from '../models';

export interface GerarProvaConfig {
  qtd_questoes: number;
  temas?: string[];
  categoria?: string;
  distribuicao: { facil: number; medio: number; dificil: number };
}

@Injectable({ providedIn: 'root' })
export class ProvasService {
  constructor(private http: HttpClient) {}

  gerar(config: GerarProvaConfig) {
    return this.http.post<ProvaGerada>(`${environment.apiUrl}/api/provas/gerar`, config);
  }

  responder(provaId: string, questaoId: number, resposta: string) {
    return this.http.post<RespostaQuestao>(
      `${environment.apiUrl}/api/provas/${provaId}/responder`,
      { questao_id: questaoId, resposta },
    );
  }

  finalizar(provaId: string) {
    return this.http.post<ResultadoProva>(
      `${environment.apiUrl}/api/provas/${provaId}/finalizar`, {}
    );
  }

  getSemanalAtual() {
    return this.http.get<any>(`${environment.apiUrl}/api/provas/semanal/atual`);
  }
}
