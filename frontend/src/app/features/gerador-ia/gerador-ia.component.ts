import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { IaService } from '../../core/services/ia.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-gerador-ia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="gerador-container">
      <div class="glass-panel">
        <!-- Header -->
        <div class="page-header">
          <div class="header-icon">🤖</div>
          <h2>Gerador de Provas por IA</h2>
          <p class="subtitle">
            Insira os temas desejados e a Inteligência Artificial criará uma prova exclusiva do zero para você.
          </p>
        </div>

        <!-- Temas Input -->
        <div class="form-group">
          <label>Temas da prova</label>
          <div class="temas-input-area">
            <div class="chips-container">
              <span *ngFor="let tema of temasSelecionados(); let i = index" class="chip">
                {{ tema }}
                <button class="chip-remove" (click)="removerTema(i)">×</button>
              </span>
              <input
                type="text"
                [(ngModel)]="temaInput"
                placeholder="Digite um tema e pressione Enter..."
                (keydown.enter)="adicionarTemaLivre()"
                [disabled]="gerando()"
                class="tema-text-input"
              />
            </div>
          </div>
          <small class="hint">Pressione Enter para adicionar. Ex: "Guerra Fria", "Termoquímica", "Citologia"</small>
        </div>

        <!-- Sugestões do banco -->
        <div class="form-group" *ngIf="temasDisponiveis().length > 0">
          <label>💡 Sugestões de temas (do banco de questões)</label>
          <div class="sugestoes-temas">
            <button
              *ngFor="let tema of temasDisponiveisFiltrados()"
              class="sugestao-tema-btn"
              [class.disabled]="temasSelecionados().includes(tema)"
              (click)="adicionarTemaSugerido(tema)"
              [disabled]="temasSelecionados().includes(tema)"
            >
              {{ tema }}
            </button>
          </div>
          <div class="search-temas" *ngIf="temasDisponiveis().length > 12">
            <input
              type="text"
              [(ngModel)]="buscaTema"
              placeholder="🔍 Buscar entre os temas disponíveis..."
              class="search-input"
            />
          </div>
        </div>

        <!-- Quantidade -->
        <div class="form-group">
          <label>Quantidade de questões ({{ qtdQuestoes }})</label>
          <input
            type="range"
            [(ngModel)]="qtdQuestoes"
            min="5"
            max="20"
            [disabled]="gerando()"
          />
          <div class="range-labels">
            <span>5</span>
            <span>20</span>
          </div>
        </div>

        <!-- Erro -->
        <div *ngIf="erro()" class="erro alert">{{ erro() }}</div>

        <!-- Botão gerar -->
        <button
          class="btn-gerar"
          (click)="gerarProva()"
          [disabled]="gerando() || temasSelecionados().length === 0"
        >
          <span *ngIf="!gerando()">🤖 Gerar Prova com IA</span>
          <span *ngIf="gerando()" class="loading-state">
            <span class="spinner"></span>
            Gerando prova... Pode levar até 30 segundos
          </span>
        </button>

        <!-- Info -->
        <div class="info-card" *ngIf="!gerando()">
          <div class="info-icon">ℹ️</div>
          <div class="info-text">
            As questões são criadas do zero pela IA, no estilo Fuvest.
            Após a geração, você responde normalmente no sistema e seus resultados contam nas estatísticas.
          </div>
        </div>

        <!-- Loading animation -->
        <div *ngIf="gerando()" class="loading-card">
          <div class="loading-brain">🧠</div>
          <div class="loading-text">A IA está montando sua prova personalizada...</div>
          <div class="loading-bar-container">
            <div class="loading-bar"></div>
          </div>
          <div class="loading-temas">
            Temas: <strong>{{ temasSelecionados().join(', ') }}</strong>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './gerador-ia.component.scss',
})
export class GeradorIaComponent implements OnInit {
  temaInput = '';
  buscaTema = '';
  qtdQuestoes = 10;
  temasSelecionados = signal<string[]>([]);
  temasDisponiveis = signal<string[]>([]);
  erro = signal('');
  gerando = signal(false);

  constructor(
    private iaService: IaService,
    private http: HttpClient,
    private router: Router,
  ) {}

  ngOnInit() {
    // Carregar temas disponíveis do banco
    this.http.get<string[]>(`${environment.apiUrl}/api/questoes/temas`).subscribe({
      next: (temas) => this.temasDisponiveis.set(temas),
    });
  }

  temasDisponiveisFiltrados() {
    const busca = this.buscaTema.toLowerCase().trim();
    let temas = this.temasDisponiveis();
    if (busca) {
      temas = temas.filter(t => t.toLowerCase().includes(busca));
    }
    return temas.slice(0, 24); // Limitar exibição
  }

  adicionarTemaLivre() {
    const tema = this.temaInput.trim();
    if (!tema) return;
    if (this.temasSelecionados().includes(tema)) {
      this.temaInput = '';
      return;
    }
    this.temasSelecionados.set([...this.temasSelecionados(), tema]);
    this.temaInput = '';
  }

  adicionarTemaSugerido(tema: string) {
    if (this.temasSelecionados().includes(tema)) return;
    this.temasSelecionados.set([...this.temasSelecionados(), tema]);
  }

  removerTema(index: number) {
    const atual = [...this.temasSelecionados()];
    atual.splice(index, 1);
    this.temasSelecionados.set(atual);
  }

  gerarProva() {
    if (this.temasSelecionados().length === 0) return;
    this.gerando.set(true);
    this.erro.set('');

    this.iaService.gerarProva(this.temasSelecionados(), this.qtdQuestoes).subscribe({
      next: (res) => {
        this.gerando.set(false);
        this.router.navigate([`/provas/${res.prova_id}/executar`], {
          state: { questao: res.primeira_questao },
        });
      },
      error: (e) => {
        this.erro.set(e.error?.message ?? 'Erro ao gerar prova. Tente novamente.');
        this.gerando.set(false);
      },
    });
  }
}
