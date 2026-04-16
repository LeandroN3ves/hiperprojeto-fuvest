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
    <div class="chat-wrapper">
      <div class="chat-container glass-card">
        <!-- Header -->
        <div class="chat-header">
          <div class="bot-avatar">🤖</div>
          <div class="bot-info">
            <h3>Tutor IA Fuvest</h3>
            <span class="status">Online • Especialista em Aprovação</span>
          </div>
        </div>

        <!-- Mensagens -->
        <div class="chat-mensagens" #mensagensContainer>
          <div *ngIf="historico().length === 0" class="chat-boas-vindas">
            <div class="welcome-icon">🎓</div>
            <h2>Olá! Como posso acelerar seus estudos hoje?</h2>
            <p>Sou sua Inteligência Artificial dedicada para a Fuvest. Estou pronto para explicar conteúdos complexos ou analisar seu desempenho.</p>
            
            <div class="sugestoes-grid">
              <button *ngFor="let s of sugestoesRapidas" (click)="enviarRapido(s)" class="sugestao-btn">
                {{ s }}
              </button>
            </div>
          </div>

          <div *ngFor="let msg of historico()"
               class="mensagem-wrapper"
               [class.user]="msg.role === 'user'"
               [class.bot]="msg.role === 'assistant'">
            
            <div class="bolha">
              <p *ngIf="!msg.carregando">{{ msg.content }}</p>
              <div *ngIf="msg.carregando" class="digitando">
                <span class="dot"></span><span class="dot"></span><span class="dot"></span>
              </div>
            </div>
            
            <div class="meta" *ngIf="!msg.carregando">
              <span class="role">{{ msg.role === 'user' ? 'Você' : 'Tutor Fuvest' }}</span>
              <span class="fonte" *ngIf="msg.fonte && msg.fonte !== 'fallback'">• via {{ msg.fonte }}</span>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="chat-input-area">
          <div class="input-wrapper">
            <input
              type="text"
              [(ngModel)]="mensagemAtual"
              placeholder="Pergunte sobre qualquer matéria ou seu desempenho..."
              (keydown.enter)="enviar()"
              [disabled]="enviando()"
            />
            <button class="send-btn" (click)="enviar()" [disabled]="!mensagemAtual.trim() || enviando()">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
              </svg>
            </button>
          </div>
        </div>
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
    'Quais temas devo focar mais?',
    'Explique o Teorema de Pitágoras',
    'Dicas para a redação da Fuvest',
    'Analise meu desempenho em Biologia'
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

    const novoHistorico = [...this.historico(), { role: 'user' as const, content: texto }];
    this.historico.set(novoHistorico);

    // Indicador digitando
    this.historico.set([...novoHistorico, { role: 'assistant' as const, content: '', carregando: true }]);

    const historicoApi: MensagemChat[] = novoHistorico.map(m => ({
      role: m.role,
      content: m.content,
    }));

    this.iaService.chat(texto, historicoApi.slice(0, -1)).subscribe({
      next: (res) => {
        const atual = this.historico().filter(m => !m.carregando);
        this.historico.set([...atual, { role: 'assistant', content: res.resposta, fonte: res.fonte }]);
        this.enviando.set(false);
      },
      error: () => {
        const atual = this.historico().filter(m => !m.carregando);
        this.historico.set([
          ...atual,
          { role: 'assistant', content: 'Ops! Ocorreu um pequeno erro de conexão com meu cérebro digital. Pode repetir?', fonte: 'erro' },
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
