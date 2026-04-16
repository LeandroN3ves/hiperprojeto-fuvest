# STEP 10 — Frontend: Telas de Provas (Configurar, Executar, Resultado)

## Contexto
Passo 10 da Plataforma Fuvest. Frontend base pronto (Step 09).
Criar as 3 telas do fluxo central de provas.

## Regras de UX obrigatórias
- Uma questão por vez — nunca mostrar todas
- Botão "Confirmar resposta" só ativa após selecionar alternativa
- Após confirmar: mostrar feedback (✅/❌) + destacar alternativa correta
- Botão "Próxima questão" só aparece após feedback
- Sem voltar, sem pular
- Barra de progresso com `questão X de Y`

---

## Tarefa 1 — Criar `src/app/core/services/provas.service.ts`

```typescript
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { GerarProvaConfig, ProvaGerada, Questao, RespostaQuestao, ResultadoProva } from '../models';

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
}
```

---

## Tarefa 2 — Criar `src/app/features/provas/configurar/configurar.component.ts`

```typescript
import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ProvasService } from '../../../core/services/provas.service';
import { environment } from '../../../../environments/environment';
import { Curso } from '../../../core/models';

@Component({
  selector: 'app-configurar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="configurar-container">
      <h2>Configurar Nova Prova</h2>

      <div class="form-group">
        <label>Quantidade de questões</label>
        <input type="number" [(ngModel)]="qtdQuestoes" min="5" max="60" />
      </div>

      <div class="form-group">
        <label>Categoria</label>
        <select [(ngModel)]="categoriaSelecionada">
          <option value="">Todas as categorias</option>
          <option value="Exatas">Exatas</option>
          <option value="Humanas">Humanas</option>
          <option value="Biologicas">Biológicas</option>
        </select>
      </div>

      <div class="form-group">
        <label>Temas (opcional — deixe vazio para usar os temas do seu curso)</label>
        <div class="temas-grid">
          <label *ngFor="let tema of temasDisponiveis()" class="tema-checkbox">
            <input
              type="checkbox"
              [value]="tema"
              [checked]="temasSelecionados().includes(tema)"
              (change)="toggleTema(tema)"
            />
            {{ tema }}
          </label>
        </div>
      </div>

      <div class="form-group">
        <label>Distribuição de dificuldade</label>
        <div class="distribuicao">
          <div>
            <span>Fácil: {{ distribuicao.facil }}%</span>
            <input type="range" [(ngModel)]="distribuicao.facil" min="0" max="100"
                   (ngModelChange)="ajustarDistribuicao('facil')" />
          </div>
          <div>
            <span>Médio: {{ distribuicao.medio }}%</span>
            <input type="range" [(ngModel)]="distribuicao.medio" min="0" max="100"
                   (ngModelChange)="ajustarDistribuicao('medio')" />
          </div>
          <div>
            <span>Difícil: {{ 100 - distribuicao.facil - distribuicao.medio }}%</span>
          </div>
        </div>
        <small *ngIf="distribuicaoInvalida()" class="erro">
          A soma não pode ultrapassar 100%
        </small>
      </div>

      <div *ngIf="erro()" class="erro">{{ erro() }}</div>

      <button (click)="iniciar()" [disabled]="carregando() || distribuicaoInvalida()">
        {{ carregando() ? 'Gerando prova...' : 'Iniciar Prova' }}
      </button>
    </div>
  `,
  styleUrl: './configurar.component.scss',
})
export class ConfigurarComponent implements OnInit {
  qtdQuestoes = 20;
  categoriaSelecionada = '';
  temasSelecionados = signal<string[]>([]);
  temasDisponiveis = signal<string[]>([]);
  distribuicao = { facil: 33, medio: 34 };
  erro = signal('');
  carregando = signal(false);

  constructor(
    private provasService: ProvasService,
    private http: HttpClient,
    private router: Router,
  ) {}

  ngOnInit() {
    this.http.get<string[]>(`${environment.apiUrl}/api/questoes/temas`).subscribe({
      next: (temas) => this.temasDisponiveis.set(temas),
    });
  }

  toggleTema(tema: string) {
    const atual = this.temasSelecionados();
    this.temasSelecionados.set(
      atual.includes(tema) ? atual.filter((t) => t !== tema) : [...atual, tema]
    );
  }

  ajustarDistribuicao(campo: 'facil' | 'medio') {
    // Garantir que facil + medio não ultrapasse 100
    if (this.distribuicao.facil + this.distribuicao.medio > 100) {
      if (campo === 'facil') this.distribuicao.medio = 100 - this.distribuicao.facil;
      else this.distribuicao.facil = 100 - this.distribuicao.medio;
    }
  }

  distribuicaoInvalida() {
    return this.distribuicao.facil + this.distribuicao.medio > 100;
  }

  iniciar() {
    this.carregando.set(true);
    this.erro.set('');

    const dificil = 100 - this.distribuicao.facil - this.distribuicao.medio;

    this.provasService.gerar({
      qtd_questoes: this.qtdQuestoes,
      temas: this.temasSelecionados().length > 0 ? this.temasSelecionados() : undefined,
      categoria: this.categoriaSelecionada || undefined,
      distribuicao: { ...this.distribuicao, dificil },
    }).subscribe({
      next: (res) => this.router.navigate([`/provas/${res.prova_id}/executar`],
        { state: { questao: res.primeira_questao } }),
      error: (e) => {
        this.erro.set(e.error?.message ?? 'Erro ao gerar prova');
        this.carregando.set(false);
      },
    });
  }
}
```

---

## Tarefa 3 — Criar `src/app/features/provas/executar/executar.component.ts`

```typescript
import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ProvasService } from '../../../core/services/provas.service';
import { Questao } from '../../../core/models';

type EstadoFeedback = 'aguardando' | 'correta' | 'errada';

@Component({
  selector: 'app-executar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="executar-container" *ngIf="questaoAtual()">
      <!-- Barra de progresso -->
      <div class="progresso">
        <div class="barra" [style.width.%]="progressoPct()"></div>
        <span>Questão {{ questaoAtual()!.numero }} de {{ questaoAtual()!.total }}</span>
      </div>

      <!-- Enunciado -->
      <div class="enunciado">
        <p>{{ questaoAtual()!.enunciado }}</p>
      </div>

      <!-- Alternativas -->
      <div class="alternativas">
        <button
          *ngFor="let alt of questaoAtual()!.alternativas"
          class="alternativa"
          [class.selecionada]="respostaSelecionada() === alt.letra"
          [class.correta]="estadoFeedback() !== 'aguardando' && alt.letra === respostaCorreta()"
          [class.errada]="estadoFeedback() !== 'aguardando' && respostaSelecionada() === alt.letra && !acertou()"
          [disabled]="estadoFeedback() !== 'aguardando'"
          (click)="selecionarResposta(alt.letra)"
        >
          <span class="letra">{{ alt.letra }}</span>
          <span class="texto">{{ alt.texto }}</span>
        </button>
      </div>

      <!-- Feedback -->
      <div *ngIf="estadoFeedback() !== 'aguardando'" class="feedback"
           [class.feedback-correta]="acertou()"
           [class.feedback-errada]="!acertou()">
        {{ acertou() ? '✅ Correto!' : '❌ Incorreto! A resposta era ' + respostaCorreta() }}
      </div>

      <!-- Botões de ação -->
      <div class="acoes">
        <button
          *ngIf="estadoFeedback() === 'aguardando'"
          [disabled]="!respostaSelecionada()"
          (click)="confirmar()"
        >
          Confirmar Resposta
        </button>

        <button
          *ngIf="estadoFeedback() !== 'aguardando' && !ultimaQuestao()"
          (click)="proxima()"
        >
          Próxima Questão →
        </button>

        <button
          *ngIf="estadoFeedback() !== 'aguardando' && ultimaQuestao()"
          (click)="finalizar()"
          class="btn-finalizar"
        >
          Ver Resultado 🏁
        </button>
      </div>
    </div>
  `,
  styleUrl: './executar.component.scss',
})
export class ExecutarComponent implements OnInit {
  provaId = '';
  questaoAtual = signal<Questao | null>(null);
  respostaSelecionada = signal<string | null>(null);
  estadoFeedback = signal<EstadoFeedback>('aguardando');
  respostaCorreta = signal('');
  acertou = signal(false);
  ultimaQuestao = signal(false);

  progressoPct() {
    const q = this.questaoAtual();
    return q ? ((q.numero - 1) / q.total) * 100 : 0;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private provasService: ProvasService,
  ) {}

  ngOnInit() {
    this.provaId = this.route.snapshot.paramMap.get('id')!;
    const state = history.state;
    if (state?.questao) {
      this.questaoAtual.set(state.questao);
    }
  }

  selecionarResposta(letra: string) {
    if (this.estadoFeedback() !== 'aguardando') return;
    this.respostaSelecionada.set(letra);
  }

  confirmar() {
    if (!this.respostaSelecionada()) return;

    this.provasService.responder(
      this.provaId,
      this.questaoAtual()!.id,
      this.respostaSelecionada()!,
    ).subscribe({
      next: (res) => {
        this.acertou.set(res.correta);
        this.respostaCorreta.set(res.resposta_correta);
        this.estadoFeedback.set(res.correta ? 'correta' : 'errada');
        this.ultimaQuestao.set(res.finalizada);

        // Pré-carregar próxima questão para evitar delay
        if (res.proxima_questao) {
          this._proximaQuestao = res.proxima_questao;
        }
      },
    });
  }

  private _proximaQuestao: Questao | null = null;

  proxima() {
    if (this._proximaQuestao) {
      this.questaoAtual.set(this._proximaQuestao);
      this._proximaQuestao = null;
      this.respostaSelecionada.set(null);
      this.estadoFeedback.set('aguardando');
    }
  }

  finalizar() {
    this.provasService.finalizar(this.provaId).subscribe({
      next: (resultado) =>
        this.router.navigate([`/provas/${this.provaId}/resultado`], { state: { resultado } }),
    });
  }
}
```

---

## Tarefa 4 — Criar `src/app/features/provas/resultado/resultado.component.ts`

```typescript
import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ResultadoProva } from '../../../core/models';

@Component({
  selector: 'app-resultado',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="resultado-container" *ngIf="resultado()">
      <!-- Placar principal -->
      <div class="placar" [class.bom]="resultado()!.percentual >= 60"
                          [class.regular]="resultado()!.percentual >= 40 && resultado()!.percentual < 60"
                          [class.ruim]="resultado()!.percentual < 40">
        <h2>{{ resultado()!.acertos }} / {{ resultado()!.total }}</h2>
        <p>{{ resultado()!.percentual }}% de acerto</p>
        <p>{{ mensagemDesempenho() }}</p>
      </div>

      <!-- Breakdown por tema -->
      <div class="por-tema">
        <h3>Desempenho por tema</h3>
        <div *ngFor="let t of resultado()!.por_tema" class="tema-item">
          <span class="tema-nome">{{ t.tema }}</span>
          <div class="barra-tema">
            <div class="preenchimento" [style.width.%]="t.taxa_acerto"
                 [class.verde]="t.taxa_acerto >= 70"
                 [class.amarelo]="t.taxa_acerto >= 40 && t.taxa_acerto < 70"
                 [class.vermelho]="t.taxa_acerto < 40">
            </div>
          </div>
          <span>{{ t.acertos }}/{{ t.acertos + t.erros }} ({{ t.taxa_acerto }}%)</span>
        </div>
      </div>

      <!-- Sugestão da IA -->
      <div *ngIf="resultado()!.sugestao_ia" class="sugestao-ia">
        <h3>💡 Análise da IA</h3>
        <p>{{ resultado()!.sugestao_ia }}</p>
      </div>

      <!-- Ações -->
      <div class="acoes">
        <a routerLink="/provas/configurar">Nova Prova</a>
        <a routerLink="/estatisticas">Ver Estatísticas</a>
        <a routerLink="/dashboard">Dashboard</a>
      </div>
    </div>
  `,
  styleUrl: './resultado.component.scss',
})
export class ResultadoComponent implements OnInit {
  resultado = signal<ResultadoProva | null>(null);

  mensagemDesempenho = computed(() => {
    const p = this.resultado()?.percentual ?? 0;
    if (p >= 80) return '🏆 Excelente! Continue assim!';
    if (p >= 60) return '👍 Bom desempenho! Revise os erros.';
    if (p >= 40) return '📚 Abaixo da meta. Foque nos temas fracos.';
    return '⚠️ Precisa de atenção. Revise o conteúdo básico.';
  });

  constructor(private router: Router) {}

  ngOnInit() {
    const state = history.state;
    if (state?.resultado) {
      this.resultado.set(state.resultado);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}
```

---

## Tarefa 5 — Adicionar rota de temas no QuestoesController (backend)

Adicionar endpoint no `questoes.controller.ts` do backend:

```typescript
// src/questoes/questoes.controller.ts
import { Controller, Get } from '@nestjs/common';
import { QuestoesService } from './questoes.service';

@Controller('questoes')
export class QuestoesController {
  constructor(private questoesService: QuestoesService) {}

  @Get('temas')
  getTemas() {
    return this.questoesService.getTemas();
  }
}
```

Registrar o controller no `questoes.module.ts`:
```typescript
controllers: [QuestoesController],
```

---

## Resultado esperado ao final deste passo
- [ ] `/provas/configurar` exibe temas do banco e controles de distribuição
- [ ] Ao iniciar, navega para `/provas/:id/executar` com a primeira questão
- [ ] Alternativas ficam desativadas após confirmar resposta
- [ ] Feedback ✅/❌ aparece imediatamente após responder
- [ ] Alternativa correta fica destacada em verde quando o usuário erra
- [ ] Botão "Próxima Questão" só aparece após feedback
- [ ] Última questão mostra "Ver Resultado" ao invés de "Próxima"
- [ ] `/provas/:id/resultado` exibe placar, breakdown por tema e sugestão da IA

## Próximo passo
`STEP_11_FRONTEND_STATS_LEADERBOARD.md` — Estatísticas, Leaderboard e IA Chat
