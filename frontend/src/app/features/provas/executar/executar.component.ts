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
      <div class="glass-panel main-panel">
        <!-- Barra de progresso -->
        <div class="header">
          <span class="q-counter">Questão {{ questaoAtual()!.numero }} de {{ questaoAtual()!.total }}</span>
          <div class="progresso-bg">
            <div class="barra" [style.width.%]="progressoPct()"></div>
          </div>
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
        <div *ngIf="estadoFeedback() !== 'aguardando'" class="feedback-toast"
             [class.feedback-correta]="acertou()"
             [class.feedback-errada]="!acertou()">
          <div class="icon">{{ acertou() ? '✅' : '❌' }}</div>
          <div class="message">{{ acertou() ? 'Correto! Mandou muito bem.' : 'Incorreto! A resposta correta era ' + respostaCorreta() }}</div>
        </div>

        <!-- Botões de ação -->
        <div class="acoes">
          <button class="btn-action primary"
            *ngIf="estadoFeedback() === 'aguardando'"
            [disabled]="!respostaSelecionada()"
            (click)="confirmar()"
          >
            Confirmar Resposta
          </button>

          <button class="btn-action next"
            *ngIf="estadoFeedback() !== 'aguardando' && !ultimaQuestao()"
            (click)="proxima()"
          >
            Próxima Questão →
          </button>

          <button class="btn-action finish"
            *ngIf="estadoFeedback() !== 'aguardando' && ultimaQuestao()"
            (click)="finalizar()"
          >
            Ver Resultado 🏁
          </button>
        </div>
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
