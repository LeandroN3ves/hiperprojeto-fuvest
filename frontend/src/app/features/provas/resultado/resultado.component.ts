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
      <div class="glass-panel main-panel">
        <div class="header-result">
          <div class="trophy">🏆</div>
          <h2>Prova Finalizada</h2>
        </div>

        <!-- Placar principal -->
        <div class="placar" [class.bom]="resultado()!.percentual >= 60"
                            [class.regular]="resultado()!.percentual >= 40 && resultado()!.percentual < 60"
                            [class.ruim]="resultado()!.percentual < 40">
          
          <div class="score-circle">
            <svg viewBox="0 0 36 36">
              <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path class="circle" [attr.stroke-dasharray]="resultado()!.percentual + ', 100'" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <div class="score-text">
              <span class="pct">{{ resultado()!.percentual }}%</span>
              <span class="abs">{{ resultado()!.acertos }} / {{ resultado()!.total }}</span>
            </div>
          </div>
          <p class="msg-desempenho">{{ mensagemDesempenho() }}</p>
        </div>

        <!-- Sugestão da IA -->
        <div *ngIf="resultado()!.sugestao_ia" class="sugestao-ia">
          <h3>
            <span class="ai-icon">✨</span> 
            Análise da IA 
          </h3>
          <p>{{ resultado()!.sugestao_ia }}</p>
        </div>

        <!-- Breakdown por tema -->
        <div class="por-tema">
          <h3>Desempenho detalhado</h3>
          <div *ngFor="let t of resultado()!.por_tema" class="tema-item">
            <div class="tema-info">
              <span class="tema-nome">{{ t.tema }}</span>
              <span class="tema-stats">{{ t.acertos }}/{{ t.acertos + t.erros }} ({{ t.taxa_acerto }}%)</span>
            </div>
            <div class="barra-tema">
              <div class="preenchimento" [style.width.%]="t.taxa_acerto"
                   [class.verde]="t.taxa_acerto >= 70"
                   [class.amarelo]="t.taxa_acerto >= 40 && t.taxa_acerto < 70"
                   [class.vermelho]="t.taxa_acerto < 40">
              </div>
            </div>
          </div>
        </div>

        <!-- Ações -->
        <div class="acoes">
          <a routerLink="/provas/configurar" class="btn secondary">Nova Prova</a>
          <a routerLink="/estatisticas" class="btn secondary">Ver Estatísticas</a>
          <a routerLink="/dashboard" class="btn primary">Voltar ao Início</a>
        </div>
      </div>
    </div>
  `,
  styleUrl: './resultado.component.scss',
})
export class ResultadoComponent implements OnInit {
  resultado = signal<ResultadoProva | null>(null);

  mensagemDesempenho = computed(() => {
    const p = this.resultado()?.percentual ?? 0;
    if (p >= 80) return 'Excelente! Você demonstrou maestria nos temas.';
    if (p >= 60) return 'Bom desempenho! Apenas revise as alternativas onde teve dúvida.';
    if (p >= 40) return 'Sua base é razoável, mas você precisa de foco nos temas fracos.';
    return 'Alerta vermelho! Reveja profundamente a teoria deste conteúdo base.';
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
