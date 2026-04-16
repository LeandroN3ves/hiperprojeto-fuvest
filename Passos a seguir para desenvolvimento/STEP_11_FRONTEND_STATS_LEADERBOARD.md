# STEP 11 — Frontend: Estatísticas, Leaderboard em Tempo Real e IA Chat

## Contexto
Passo 11 da Plataforma Fuvest. Telas de provas prontas (Step 10).
Criar as últimas telas: dashboard de estatísticas, leaderboard com WebSocket e chat com IA.

---

## Tarefa 1 — Criar `src/app/core/services/estatisticas.service.ts`

```typescript
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
```

---

## Tarefa 2 — Criar `src/app/core/services/websocket.service.ts`

```typescript
import { Injectable, OnDestroy } from '@angular/core';
import { Observable, fromEvent } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WebsocketService implements OnDestroy {
  private socket: Socket;

  constructor() {
    this.socket = io(`${environment.apiUrl}/leaderboard`, {
      autoConnect: false,
    });
  }

  connect() {
    if (!this.socket.connected) this.socket.connect();
  }

  disconnect() {
    this.socket.disconnect();
  }

  inscreverLeaderboard(cursoId: number): Observable<any> {
    this.connect();
    this.socket.emit('subscribe:leaderboard', { curso_id: cursoId });
    return fromEvent(this.socket, `leaderboard:update:${cursoId}`);
  }

  ngOnDestroy() {
    this.disconnect();
  }
}
```

---

## Tarefa 3 — Criar `src/app/core/services/leaderboard.service.ts`

```typescript
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
```

---

## Tarefa 4 — Criar `src/app/core/services/ia.service.ts`

```typescript
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
```

---

## Tarefa 5 — Criar `src/app/features/estatisticas/estatisticas.component.ts`

```typescript
import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EstatisticasService } from '../../core/services/estatisticas.service';

@Component({
  selector: 'app-estatisticas',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="estatisticas-container">
      <h2>📊 Seu Desempenho</h2>

      <!-- Cards de resumo -->
      <div class="cards-resumo" *ngIf="dashboard()">
        <div class="card">
          <span class="valor">{{ dashboard().total_provas }}</span>
          <span class="label">Provas realizadas</span>
        </div>
        <div class="card">
          <span class="valor">{{ dashboard().total_questoes_respondidas }}</span>
          <span class="label">Questões respondidas</span>
        </div>
        <div class="card" [class.bom]="dashboard().media_acertos >= 60"
                          [class.ruim]="dashboard().media_acertos < 60">
          <span class="valor">{{ dashboard().media_acertos }}%</span>
          <span class="label">Média de acertos</span>
        </div>
        <div class="card hoje">
          <span class="valor">{{ dashboard().hoje.provas_realizadas }}</span>
          <span class="label">Provas hoje</span>
        </div>
      </div>

      <!-- Tema mais fraco + CTA -->
      <div *ngIf="dashboard()?.tema_mais_fraco" class="alerta-fraqueza">
        <h3>⚠️ Atenção: {{ dashboard().tema_mais_fraco }}</h3>
        <p>Este é o seu tema mais fraco. Pratique mais!</p>
        <button (click)="gerarProvaFocada()">Praticar agora</button>
      </div>

      <!-- Gráfico por tema (barras simples em CSS) -->
      <div class="por-tema" *ngIf="temasSorted().length > 0">
        <h3>Desempenho por Tema</h3>
        <div *ngFor="let t of temasSorted()" class="tema-row">
          <span class="tema-nome">{{ t.tema }}</span>
          <div class="barra-wrapper">
            <div class="barra-acertos" [style.width.%]="t.taxa_acerto"
                 [class.verde]="t.taxa_acerto >= 70"
                 [class.amarelo]="t.taxa_acerto >= 40 && t.taxa_acerto < 70"
                 [class.vermelho]="t.taxa_acerto < 40">
            </div>
          </div>
          <span class="pct">{{ t.taxa_acerto }}%</span>
          <span class="contagem">{{ t.acertos + t.erros }} questões</span>
        </div>
      </div>

      <div *ngIf="carregando()" class="loading">Carregando estatísticas...</div>
    </div>
  `,
  styleUrl: './estatisticas.component.scss',
})
export class EstatisticasComponent implements OnInit {
  dashboard = signal<any>(null);
  carregando = signal(true);

  temasSorted = computed(() => {
    const d = this.dashboard();
    if (!d?.por_tema) return [];
    return [...d.por_tema].sort((a: any, b: any) => a.taxa_acerto - b.taxa_acerto);
  });

  constructor(private estatisticasService: EstatisticasService) {}

  ngOnInit() {
    this.estatisticasService.getDashboard().subscribe({
      next: (d) => { this.dashboard.set(d); this.carregando.set(false); },
      error: () => this.carregando.set(false),
    });
  }

  gerarProvaFocada() {
    // Navegar para configurar com tema pré-selecionado via queryParam
    window.location.href = `/provas/configurar?tema=${this.dashboard()?.tema_mais_fraco}`;
  }
}
```

---

## Tarefa 6 — Criar `src/app/features/leaderboard/leaderboard.component.ts`

```typescript
import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { LeaderboardService } from '../../core/services/leaderboard.service';
import { WebsocketService } from '../../core/services/websocket.service';
import { LeaderboardEntry } from '../../core/models';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="leaderboard-container">
      <h2>🏆 Ranking</h2>

      <!-- Tabs: Global / Por Curso -->
      <div class="tabs">
        <button [class.ativo]="aba() === 'global'" (click)="mudarAba('global')">
          Global
        </button>
        <button [class.ativo]="aba() === 'curso'" (click)="mudarAba('curso')">
          Por Curso
          <span *ngIf="atualizacaoEmTempoReal()" class="badge-live">● AO VIVO</span>
        </button>
      </div>

      <!-- Leaderboard Global -->
      <div *ngIf="aba() === 'global'">
        <table *ngIf="rankingGlobal().length > 0">
          <thead>
            <tr>
              <th>#</th>
              <th>Nome</th>
              <th>Provas</th>
              <th>Média</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let e of rankingGlobal()" [class.destaque]="e.posicao <= 3">
              <td>{{ e.posicao === 1 ? '🥇' : e.posicao === 2 ? '🥈' : e.posicao === 3 ? '🥉' : e.posicao }}</td>
              <td>{{ e.nome }}</td>
              <td>{{ e.total_provas }}</td>
              <td>{{ e.media_acertos }}%</td>
            </tr>
          </tbody>
        </table>
        <p *ngIf="rankingGlobal().length === 0 && !carregando()">Nenhum dado disponível</p>
      </div>

      <!-- Leaderboard por Curso -->
      <div *ngIf="aba() === 'curso'">
        <select [(ngModel)]="cursoIdSelecionado" (ngModelChange)="carregarRankingCurso($event)">
          <option [value]="null">Selecione um curso</option>
          <option *ngFor="let c of cursosAtivos()" [value]="c">Curso {{ c }}</option>
        </select>

        <table *ngIf="rankingCurso().length > 0">
          <thead>
            <tr>
              <th>#</th>
              <th>Nome</th>
              <th>Acertos</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let e of rankingCurso()" [class.destaque]="e.posicao <= 3">
              <td>{{ e.posicao === 1 ? '🥇' : e.posicao === 2 ? '🥈' : e.posicao === 3 ? '🥉' : e.posicao }}</td>
              <td>{{ e.nome }}</td>
              <td>{{ e.acertos }}</td>
            </tr>
          </tbody>
        </table>

        <p *ngIf="cursosAtivos().length === 0 && !carregando()">
          Nenhum curso com participantes esta semana.
          Faça a prova semanal para aparecer no ranking!
        </p>
      </div>

      <div *ngIf="carregando()" class="loading">Carregando ranking...</div>
    </div>
  `,
  styleUrl: './leaderboard.component.scss',
})
export class LeaderboardComponent implements OnInit, OnDestroy {
  aba = signal<'global' | 'curso'>('global');
  rankingGlobal = signal<LeaderboardEntry[]>([]);
  rankingCurso = signal<LeaderboardEntry[]>([]);
  cursosAtivos = signal<number[]>([]);
  cursoIdSelecionado: number | null = null;
  carregando = signal(false);
  atualizacaoEmTempoReal = signal(false);
  private wsSub?: Subscription;

  constructor(
    private leaderboardService: LeaderboardService,
    private wsService: WebsocketService,
  ) {}

  ngOnInit() {
    this.carregarGlobal();
    this.carregarCursosAtivos();
  }

  mudarAba(aba: 'global' | 'curso') {
    this.aba.set(aba);
    if (aba === 'global') this.carregarGlobal();
  }

  carregarGlobal() {
    this.carregando.set(true);
    this.leaderboardService.getGlobal().subscribe({
      next: (res) => { this.rankingGlobal.set(res.ranking); this.carregando.set(false); },
    });
  }

  carregarCursosAtivos() {
    this.leaderboardService.getCursosAtivos().subscribe({
      next: (ids) => this.cursosAtivos.set(ids),
    });
  }

  carregarRankingCurso(cursoId: number) {
    if (!cursoId) return;

    // Cancelar subscrição WebSocket anterior
    this.wsSub?.unsubscribe();
    this.atualizacaoEmTempoReal.set(false);

    // Carregar via REST primeiro
    this.carregando.set(true);
    this.leaderboardService.getCurso(cursoId).subscribe({
      next: (res) => { this.rankingCurso.set(res.ranking); this.carregando.set(false); },
    });

    // Inscrever no WebSocket para atualizações em tempo real
    this.wsSub = this.wsService.inscreverLeaderboard(cursoId).subscribe({
      next: (res) => {
        this.rankingCurso.set(res.ranking);
        this.atualizacaoEmTempoReal.set(true);
      },
    });
  }

  ngOnDestroy() {
    this.wsSub?.unsubscribe();
    this.wsService.disconnect();
  }
}
```

---

## Tarefa 7 — Criar `src/app/features/ia-chat/ia-chat.component.ts`

```typescript
import { Component, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IaService, MensagemChat } from '../../core/services/ia.service';

interface MensagemUI extends MensagemChat {
  fonte?: string;
  carregando?: boolean;
}

@Component({
  selector: 'app-ia-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-container">
      <div class="chat-header">
        <h2>🤖 Tutor IA Fuvest</h2>
        <small>Dúvidas sobre conteúdo, estratégias e análise do seu desempenho</small>
      </div>

      <!-- Lista de mensagens -->
      <div class="chat-mensagens" #mensagensContainer>
        <div *ngIf="historico().length === 0" class="chat-boas-vindas">
          <p>Olá! Sou seu tutor para a Fuvest. Posso ajudar com:</p>
          <ul>
            <li>📚 Dúvidas sobre conteúdo</li>
            <li>📊 Análise do seu desempenho</li>
            <li>🎯 Estratégias de estudo</li>
          </ul>
          <div class="sugestoes-rapidas">
            <button *ngFor="let s of sugestoesRapidas" (click)="enviarRapido(s)">{{ s }}</button>
          </div>
        </div>

        <div *ngFor="let msg of historico()"
             class="mensagem"
             [class.mensagem-usuario]="msg.role === 'user'"
             [class.mensagem-ia]="msg.role === 'assistant'">
          <div class="bolha">
            <p *ngIf="!msg.carregando">{{ msg.content }}</p>
            <div *ngIf="msg.carregando" class="digitando">
              <span></span><span></span><span></span>
            </div>
          </div>
          <small *ngIf="msg.fonte && msg.fonte !== 'fallback'" class="fonte">via {{ msg.fonte }}</small>
        </div>
      </div>

      <!-- Input -->
      <div class="chat-input">
        <input
          type="text"
          [(ngModel)]="mensagemAtual"
          placeholder="Digite sua pergunta..."
          (keydown.enter)="enviar()"
          [disabled]="enviando()"
        />
        <button (click)="enviar()" [disabled]="!mensagemAtual.trim() || enviando()">
          {{ enviando() ? '...' : 'Enviar' }}
        </button>
      </div>
    </div>
  `,
  styleUrl: './ia-chat.component.scss',
})
export class IaChatComponent implements AfterViewChecked {
  @ViewChild('mensagensContainer') mensagensContainer!: ElementRef;

  mensagemAtual = '';
  historico = signal<MensagemUI[]>([]);
  enviando = signal(false);

  sugestoesRapidas = [
    'Quais são meus temas mais fracos?',
    'Me dê dicas para Matemática',
    'Como me preparar para a Fuvest?',
    'Qual estratégia para a 1ª fase?',
  ];

  constructor(private iaService: IaService) {}

  ngAfterViewChecked() {
    this.scrollParaBaixo();
  }

  enviarRapido(texto: string) {
    this.mensagemAtual = texto;
    this.enviar();
  }

  enviar() {
    const texto = this.mensagemAtual.trim();
    if (!texto || this.enviando()) return;

    this.mensagemAtual = '';
    this.enviando.set(true);

    // Adicionar mensagem do usuário
    const novoHistorico = [...this.historico(), { role: 'user' as const, content: texto }];
    this.historico.set(novoHistorico);

    // Adicionar indicador de "digitando"
    this.historico.set([...novoHistorico, { role: 'assistant' as const, content: '', carregando: true }]);

    // Construir histórico para a API (sem a mensagem de loading)
    const historicoApi: MensagemChat[] = novoHistorico.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    this.iaService.chat(texto, historicoApi.slice(0, -1)).subscribe({
      next: (res) => {
        // Substituir indicador de loading pela resposta real
        const atual = this.historico().filter((m) => !m.carregando);
        this.historico.set([...atual, { role: 'assistant', content: res.resposta, fonte: res.fonte }]);
        this.enviando.set(false);
      },
      error: () => {
        const atual = this.historico().filter((m) => !m.carregando);
        this.historico.set([
          ...atual,
          { role: 'assistant', content: 'Desculpe, ocorreu um erro. Tente novamente.', fonte: 'erro' },
        ]);
        this.enviando.set(false);
      },
    });
  }

  private scrollParaBaixo() {
    try {
      const el = this.mensagensContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }
}
```

---

## Tarefa 8 — Criar `src/app/features/dashboard/dashboard.component.ts`

```typescript
import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EstatisticasService } from '../../core/services/estatisticas.service';
import { IaService } from '../../core/services/ia.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard-container">
      <h2>Olá, {{ authService.usuario()?.nome?.split(' ')[0] }}! 👋</h2>

      <!-- Ações rápidas -->
      <div class="acoes-rapidas">
        <a routerLink="/provas/configurar" class="card-acao principal">
          <span>📝</span>
          <span>Nova Prova</span>
        </a>
        <a routerLink="/estatisticas" class="card-acao">
          <span>📊</span>
          <span>Estatísticas</span>
        </a>
        <a routerLink="/leaderboard" class="card-acao">
          <span>🏆</span>
          <span>Ranking</span>
        </a>
        <a routerLink="/ia-chat" class="card-acao">
          <span>🤖</span>
          <span>Chat IA</span>
        </a>
      </div>

      <!-- Resumo do dia -->
      <div class="resumo-dia" *ngIf="statsHoje()">
        <h3>Hoje</h3>
        <p>{{ statsHoje().provas_realizadas }} provas | {{ statsHoje().questoes_respondidas }} questões</p>
      </div>

      <!-- Sugestões da IA -->
      <div class="sugestoes" *ngIf="sugestoes().length > 0">
        <h3>💡 Sugestões personalizadas</h3>
        <div *ngFor="let s of sugestoes()" class="sugestao-card">
          <h4>{{ s.titulo }}</h4>
          <p>{{ s.descricao }}</p>
          <a routerLink="/provas/configurar"
             [state]="{ config: s.acao }"
             class="btn-sugestao">
            Praticar agora
          </a>
        </div>
      </div>
    </div>
  `,
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  statsHoje = signal<any>(null);
  sugestoes = signal<any[]>([]);

  constructor(
    public authService: AuthService,
    private estatisticasService: EstatisticasService,
    private iaService: IaService,
  ) {}

  ngOnInit() {
    this.estatisticasService.getDashboard().subscribe({
      next: (d) => this.statsHoje.set(d.hoje),
    });

    this.iaService.getSugestoes().subscribe({
      next: (res) => this.sugestoes.set(res.sugestoes),
    });
  }
}
```

---

## Instalar Socket.IO Client

```bash
cd frontend
npm install socket.io-client
```

---

## Resultado esperado ao final deste passo
- [ ] `/estatisticas` exibe cards de resumo, destaca tema mais fraco e mostra barras por tema
- [ ] `/leaderboard` alterna entre global e por curso
- [ ] Ao selecionar um curso no leaderboard, conecta via WebSocket automaticamente
- [ ] Badge "● AO VIVO" aparece ao receber atualização em tempo real
- [ ] `/ia-chat` exibe sugestões rápidas e animação de "digitando"
- [ ] Chat funciona mesmo com Ollama desligado (fallback por regras responde)
- [ ] `/dashboard` exibe stats do dia e sugestões personalizadas

## Próximo passo
`STEP_12_PROVAS_SEMANAIS.md` — Cron job de provas semanais automáticas
