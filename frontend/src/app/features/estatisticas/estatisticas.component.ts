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
      <div class="glass-header">
        <h2>📊 Seu Desempenho</h2>
        <p>Acompanhe sua evolução e identifique pontos de melhoria</p>
      </div>

      <!-- Cards de resumo -->
      <div class="cards-resumo" *ngIf="dashboard()">
        <div class="stat-card">
          <div class="icon">📝</div>
          <div class="content">
            <span class="valor">{{ dashboard().total_provas }}</span>
            <span class="label">Provas</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="icon">🎯</div>
          <div class="content">
            <span class="valor">{{ dashboard().total_questoes_respondidas }}</span>
            <span class="label">Questões</span>
          </div>
        </div>
        <div class="stat-card" [class.bom]="dashboard().media_acertos >= 60"
                           [class.ruim]="dashboard().media_acertos < 60">
          <div class="icon">📈</div>
          <div class="content">
            <span class="valor">{{ dashboard().media_acertos }}%</span>
            <span class="label">Média</span>
          </div>
        </div>
        <div class="stat-card hoje">
          <div class="icon">📅</div>
          <div class="content">
            <span class="valor">{{ dashboard().hoje.provas_realizadas }}</span>
            <span class="label">Hoje</span>
          </div>
        </div>
      </div>

      <div class="stats-grid">
        <!-- Tema mais fraco -->
        <div *ngIf="dashboard()?.tema_mais_fraco" class="alerta-fraqueza glass-card">
          <div class="alert-content">
            <h3>⚠️ Atenção ao tema: <span>{{ dashboard().tema_mais_fraco }}</span></h3>
            <p>Seu desempenho neste conteúdo está abaixo da meta. Recomendamos uma revisão focada.</p>
            <button class="btn-focus" (click)="gerarProvaFocada()">Praticar Agora</button>
          </div>
        </div>

        <!-- Gráfico por tema -->
        <div class="por-tema glass-card" *ngIf="temasSorted().length > 0">
          <h3>Desempenho por Tema</h3>
          <div class="scroll-area">
            <div *ngFor="let t of temasSorted()" class="tema-row">
              <div class="tema-meta">
                <span class="tema-nome">{{ t.tema }}</span>
                <span class="contagem">{{ t.acertos + t.erros }} questões</span>
              </div>
              <div class="progress-container">
                <div class="barra-wrapper">
                  <div class="barra-acertos" [style.width.%]="t.taxa_acerto"
                       [class.verde]="t.taxa_acerto >= 70"
                       [class.amarelo]="t.taxa_acerto >= 40 && t.taxa_acerto < 70"
                       [class.vermelho]="t.taxa_acerto < 40">
                  </div>
                </div>
                <span class="pct">{{ t.taxa_acerto }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="carregando()" class="loading-overlay">
        <div class="spinner"></div>
        <span>Analisando dados...</span>
      </div>
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
    // Ordenar do pior para o melhor
    return [...d.por_tema].sort((a: any, b: any) => a.taxa_acerto - b.taxa_acerto);
  });

  constructor(private estatisticasService: EstatisticasService) {}

  ngOnInit() {
    this.estatisticasService.getDashboard().subscribe({
      next: (d) => { 
        this.dashboard.set(d); 
        this.carregando.set(false); 
      },
      error: () => this.carregando.set(false),
    });
  }

  gerarProvaFocada() {
    window.location.href = `/provas/configurar?tema=${encodeURIComponent(this.dashboard()?.tema_mais_fraco)}`;
  }
}
