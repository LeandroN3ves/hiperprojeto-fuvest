import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { EstatisticasService } from '../../core/services/estatisticas.service';
import { IaService } from '../../core/services/ia.service';
import { AuthService } from '../../core/services/auth.service';
import { ProvasService } from '../../core/services/provas.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard-container">
      <div class="welcome-section">
        <div class="user-greeting">
          <h1>Olá, {{ (authService.usuario()?.nome || '').split(' ')[0] }}! 👋</h1>
          <p>Sua jornada rumo à aprovação continua hoje.</p>
        </div>
        
        <div class="stats-quickview" *ngIf="statsHoje()">
          <div class="mini-stat">
            <span class="label">Hoje</span>
            <span class="value">{{ statsHoje().provas_realizadas }} provas</span>
          </div>
          <div class="divider"></div>
          <div class="mini-stat">
            <span class="label">Questões</span>
            <span class="value">{{ statsHoje().questoes_respondidas }} respondidas</span>
          </div>
        </div>
      </div>

      <!-- Grid de Ações -->
      <div class="acoes-grid">
        <a routerLink="/provas/configurar" class="action-card primary">
          <div class="icon">📝</div>
          <div class="card-text">
            <h3>Iniciar Prova</h3>
            <p>Gerar simulado personalizado</p>
          </div>
          <div class="arrow">→</div>
        </a>
        
        <div class="secondary-actions">
          <a routerLink="/estatisticas" class="action-card">
            <div class="icon">📊</div>
            <h3>Estatísticas</h3>
          </a>
          <a routerLink="/leaderboard" class="action-card">
            <div class="icon">🏆</div>
            <h3>Ranking</h3>
          </a>
          <a routerLink="/ia-chat" class="action-card">
            <div class="icon">🤖</div>
            <h3>Tutor IA</h3>
          </a>
        </div>
      </div>

      <!-- Prova Semanal -->
      <div class="semanal-section" *ngIf="provaSemanal()?.disponivel">
        <div class="semanal-card glass-card" [class.completed]="provaSemanal()?.ja_participou">
          <div class="card-header">
            <span class="badge">PROVA DA SEMANA</span>
            <h2>Simulado Semanal: {{ provaSemanal()?.semana }}</h2>
          </div>
          
          <div class="card-body">
            <p *ngIf="!provaSemanal()?.ja_participou">
              Uma prova preparada especialmente para o seu curso com base nos temas mais quentes da semana.
            </p>
            <p *ngIf="provaSemanal()?.ja_participou">
              Você já concluiu o simulado desta semana. Veja seu desempenho!
            </p>
            
            <div class="prova-info" *ngIf="provaSemanal()?.configuracao">
              <span><strong>{{ provaSemanal()?.configuracao.qtd_questoes }}</strong> Questões</span>
              <span>•</span>
              <span>Foco: <strong>{{ provaSemanal()?.configuracao.temas.join(', ') }}</strong></span>
            </div>
          </div>

          <div class="card-footer">
            <button *ngIf="!provaSemanal()?.ja_participou && !provaSemanal()?.prova_id" 
                    (click)="iniciarSemanal()" class="btn-primary">
              Iniciar Simulado
            </button>
            <a *ngIf="!provaSemanal()?.ja_participou && provaSemanal()?.prova_id" 
               [routerLink]="['/provas', provaSemanal()?.prova_id, 'executar']" class="btn-primary">
              Continuar Simulado
            </a>
            <a *ngIf="provaSemanal()?.ja_participou" 
               [routerLink]="['/provas', provaSemanal()?.prova_id, 'resultado']" class="btn-secondary">
              Ver Resultado
            </a>
          </div>
        </div>
      </div>

      <!-- Sugestões IA -->
      <div class="sugestoes-section" *ngIf="sugestoes().length > 0">
        <div class="section-header">
          <h3>💡 Sugestões da sua IA</h3>
          <p>Baseado no seu desempenho recente</p>
        </div>
        
        <div class="sugestoes-list">
          <div *ngFor="let s of sugestoes()" class="sugestao-item glass-card">
            <div class="sugestao-content">
              <h4>{{ s.titulo }}</h4>
              <p>{{ s.descricao }}</p>
            </div>
            <a routerLink="/provas/configurar" [state]="{ config: s.acao }" class="btn-sugestao">
              Praticar agora
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  statsHoje = signal<any>(null);
  sugestoes = signal<any[]>([]);
  provaSemanal = signal<any>(null);

  constructor(
    public authService: AuthService,
    private estatisticasService: EstatisticasService,
    private iaService: IaService,
    private provasService: ProvasService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.estatisticasService.getDashboard().subscribe({
      next: (d) => this.statsHoje.set(d.hoje),
    });

    this.iaService.getSugestoes().subscribe({
      next: (res) => this.sugestoes.set(res.sugestoes),
    });

    this.provasService.getSemanalAtual().subscribe({
      next: (res) => this.provaSemanal.set(res),
    });
  }

  iniciarSemanal() {
    const config = this.provaSemanal().configuracao;
    // Forçamos o tipo semanal no objeto enviado se o backend suportar, 
    // ou deixamos o backend tratar baseado no fato de ser um cursoId específico sem temas custom extras.
    // Mas o ideal é que o backend receba 'tipo: semanal'.
    this.provasService.gerar({ ...config, tipo: 'semanal' } as any).subscribe({
      next: (prova) => {
        this.router.navigate(['/provas', prova.prova_id, 'executar']);
      }
    });
  }
}
