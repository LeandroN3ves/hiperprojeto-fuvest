import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ProvasService } from '../../../core/services/provas.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-configurar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="configurar-container">
      <div class="glass-panel">
        <h2>Configurar Nova Prova</h2>

        <div class="form-group">
          <label>Quantidade de questões ({{ qtdQuestoes }})</label>
          <input type="range" [(ngModel)]="qtdQuestoes" min="5" max="60" />
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
            <label *ngFor="let tema of temasDisponiveis()" class="tema-checkbox" [class.selected]="temasSelecionados().includes(tema)">
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
            <div class="dist-item facil">
              <span>Fácil: {{ distribuicao.facil }}%</span>
              <input type="range" [(ngModel)]="distribuicao.facil" min="0" max="100"
                     (ngModelChange)="ajustarDistribuicao('facil')" />
            </div>
            <div class="dist-item medio">
              <span>Médio: {{ distribuicao.medio }}%</span>
              <input type="range" [(ngModel)]="distribuicao.medio" min="0" max="100"
                     (ngModelChange)="ajustarDistribuicao('medio')" />
            </div>
            <div class="dist-item dificil">
              <span>Difícil: {{ 100 - distribuicao.facil - distribuicao.medio }}%</span>
            </div>
          </div>
          <small *ngIf="distribuicaoInvalida()" class="erro">
            A soma não pode ultrapassar 100%
          </small>
        </div>

        <div *ngIf="erro()" class="erro alert">{{ erro() }}</div>

        <button class="btn-primary" (click)="iniciar()" [disabled]="carregando() || distribuicaoInvalida()">
          {{ carregando() ? 'Gerando prova...' : 'Iniciar Prova' }}
        </button>
      </div>
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
