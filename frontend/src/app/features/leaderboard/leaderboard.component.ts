import { Component, signal, OnInit, OnDestroy, computed } from '@angular/core';
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
      <div class="glass-header">
        <h2>🏆 Ranking Fuvest</h2>
        <p>Acompanhe os melhores da semana e o ranking global</p>
      </div>

      <!-- Tabs Switcher -->
      <div class="tabs-switcher">
        <button [class.ativo]="aba() === 'global'" (click)="mudarAba('global')">
          Ranking Global
        </button>
        <button [class.ativo]="aba() === 'curso'" (click)="mudarAba('curso')">
          Ranking do Curso
          <span *ngIf="atualizacaoEmTempoReal()" class="badge-live">● LIVE</span>
        </button>
      </div>

      <div class="ranking-panel glass-card">
        <!-- Filtros e Seletores -->
        <div class="panel-header" *ngIf="aba() === 'curso'">
          <div class="course-selector">
            <label>Filtrar por Curso:</label>
            <select [(ngModel)]="cursoIdSelecionado" (ngModelChange)="carregarRankingCurso($event)">
              <option [value]="null">Escolha um curso...</option>
              <option *ngFor="let c of cursosAtivos()" [value]="c">Curso #{{ c }}</option>
            </select>
          </div>
        </div>

        <!-- Tabela de Ranking -->
        <div class="table-responsive">
          <table *ngIf="rankingAtual().length > 0">
            <thead>
              <tr>
                <th class="rank-col">Posição</th>
                <th>Estudante</th>
                <th *ngIf="aba() === 'global'">Provas</th>
                <th class="score-col">{{ aba() === 'global' ? 'Média %' : 'Acertos' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let e of rankingAtual(); let i = index" 
                  class="ranking-row" 
                  [class.top3]="e.posicao <= 3"
                  [style.animation-delay]="(i * 0.05) + 's'">
                <td class="rank-col">
                  <div class="rank-badge" [attr.data-rank]="e.posicao">
                    {{ e.posicao === 1 ? '🥇' : e.posicao === 2 ? '🥈' : e.posicao === 3 ? '🥉' : e.posicao }}
                  </div>
                </td>
                <td class="user-info">
                  <span class="user-name">{{ e.nome }}</span>
                </td>
                <td *ngIf="aba() === 'global'">{{ e.total_provas }}</td>
                <td class="score-col">
                  <span class="score-value">{{ aba() === 'global' ? e.media_acertos + '%' : e.acertos }}</span>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty States -->
          <div *ngIf="rankingAtual().length === 0 && !carregando()" class="empty-state">
            <div class="empty-icon">🏜️</div>
            <p *ngIf="aba() === 'global'">Ainda não há dados no ranking global.</p>
            <p *ngIf="aba() === 'curso' && !cursoIdSelecionado">Selecione um curso para ver o ranking semanal.</p>
            <p *ngIf="aba() === 'curso' && cursoIdSelecionado">Ninguém realizou a prova semanal deste curso ainda.</p>
          </div>
        </div>
      </div>

      <div *ngIf="carregando()" class="loader-bar"></div>
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

  rankingAtual = computed(() => 
    this.aba() === 'global' ? this.rankingGlobal() : this.rankingCurso()
  );

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
    if (aba === 'global') {
      this.wsSub?.unsubscribe();
      this.atualizacaoEmTempoReal.set(false);
      this.carregarGlobal();
    }
  }

  carregarGlobal() {
    this.carregando.set(true);
    this.leaderboardService.getGlobal().subscribe({
      next: (res) => { 
        this.rankingGlobal.set(res.ranking); 
        this.carregando.set(false); 
      },
      error: () => this.carregando.set(false)
    });
  }

  carregarCursosAtivos() {
    this.leaderboardService.getCursosAtivos().subscribe({
      next: (ids) => this.cursosAtivos.set(ids)
    });
  }

  carregarRankingCurso(cursoId: number) {
    if (!cursoId) return;

    this.wsSub?.unsubscribe();
    this.atualizacaoEmTempoReal.set(false);

    this.carregando.set(true);
    this.leaderboardService.getCurso(cursoId).subscribe({
      next: (res) => { 
        this.rankingCurso.set(res.ranking); 
        this.carregando.set(false); 
      },
      error: () => this.carregando.set(false)
    });

    // WebSocket link
    this.wsSub = this.wsService.inscreverLeaderboard(cursoId).subscribe({
      next: (res) => {
        this.rankingCurso.set(res.ranking);
        this.atualizacaoEmTempoReal.set(true);
      }
    });
  }

  ngOnDestroy() {
    this.wsSub?.unsubscribe();
    this.wsService.disconnect();
  }
}
