# STEP 08 — Módulo de IA com Fallback por Regras

## Contexto
Passo 8 da Plataforma Fuvest. Leaderboard pronto (Step 07).
Criar o módulo de IA — chat contextualizado e sugestões personalizadas.

## Regra crítica: o sistema NUNCA pode quebrar por causa da IA
A IA é uma feature adicional, não uma dependência. O fluxo é sempre:
1. Tentar Ollama (local/servidor)
2. Se falhar → tentar HuggingFace/OpenRouter (free tier)
3. Se falhar → usar FallbackRegrasService (regras estáticas — sempre disponível)

Timeout de cada chamada: **5 segundos**

---

## Tarefa 1 — Criar `src/ia/fallback/regras.service.ts`

```typescript
import { Injectable } from '@nestjs/common';

interface StatsTema {
  tema: string;
  acertos: number;
  erros: number;
  taxa_erro: number;
}

@Injectable()
export class FallbackRegrasService {

  // Sugestão baseada em estatísticas de desempenho
  gerarSugestao(temasFracos: StatsTema[]): string {
    if (temasFracos.length === 0) {
      return 'Ótimo trabalho! Seu desempenho está equilibrado. Continue praticando com provas variadas para manter a consistência.';
    }

    const pior = temasFracos[0];
    const taxaErroPercent = Math.round(pior.taxa_erro);

    if (taxaErroPercent >= 70) {
      return `Atenção: você está errando ${taxaErroPercent}% das questões de "${pior.tema}". Recomendo pausar outros temas e focar exclusivamente neste antes de avançar. Revise o conteúdo básico do zero.`;
    }

    if (taxaErroPercent >= 50) {
      return `O tema "${pior.tema}" precisa de reforço (${taxaErroPercent}% de erro). Faça uma prova focada neste tema com questões de dificuldade crescente.`;
    }

    const todosFragos = temasFracos.map((t) => `"${t.tema}"`).join(', ');
    return `Seus temas mais fracos são ${todosFragos}. Alterne entre eles nas próximas provas para melhorar de forma equilibrada.`;
  }

  // Resposta de chat baseada em palavras-chave
  responderChat(mensagem: string, contexto: { temasFracos: StatsTema[]; mediaAcertos: number }): string {
    const m = mensagem.toLowerCase();

    if (m.includes('fraco') || m.includes('erro') || m.includes('dificuldade')) {
      return this.gerarSugestao(contexto.temasFracos);
    }

    if (m.includes('prova') && (m.includes('criar') || m.includes('gerar') || m.includes('fazer'))) {
      if (contexto.temasFracos.length > 0) {
        return `Recomendo criar uma prova focada em "${contexto.temasFracos[0].tema}". Use a opção "Sugestão Inteligente" no menu de provas — ela já está configurada com os seus temas mais fracos.`;
      }
      return 'Acesse "Nova Prova" e configure os temas que deseja praticar. Para um desafio equilibrado, distribua 33% de cada dificuldade.';
    }

    if (m.includes('dica') || m.includes('estratégia') || m.includes('estrategia')) {
      const dicas = [
        'Estude em blocos de 25 minutos com pausas de 5 minutos (técnica Pomodoro).',
        'Priorize os temas com maior peso na Fuvest: Português e Matemática valem mais.',
        'Resolva provas antigas da Fuvest — o estilo das questões se repete ao longo dos anos.',
        'Não pule questões que você não sabe — tente eliminar alternativas e cheire o gabarito.',
        `Você está acertando ${Math.round(contexto.mediaAcertos)}% das questões. ${contexto.mediaAcertos >= 60 ? 'Bom ritmo! Continue.' : 'Foque nos conteúdos básicos antes de avançar.'}`,
      ];
      return dicas[Math.floor(Math.random() * dicas.length)];
    }

    if (m.includes('nota') || m.includes('pontuação') || m.includes('passar')) {
      return `Para passar na Fuvest, a nota de corte varia por curso. Geralmente é necessário acertar 60-75% na 1ª fase. Você está em ${Math.round(contexto.mediaAcertos)}% — ${contexto.mediaAcertos >= 60 ? 'na faixa competitiva.' : 'precisando melhorar antes da prova.'}`;
    }

    if (m.includes('matemática') || m.includes('matematica') || m.includes('exatas')) {
      return 'Para Matemática na Fuvest: foque em Funções, Geometria Plana, Progressões e Probabilidade. São os temas mais recorrentes. Resolva pelo menos 5 questões por dia.';
    }

    if (m.includes('português') || m.includes('portugues') || m.includes('redação') || m.includes('redacao')) {
      return 'Para Português: leia textos jornalísticos e literários diariamente. A Fuvest cobra muito interpretação de texto, figuras de linguagem e gramática contextualizada.';
    }

    if (m.includes('biologia') || m.includes('bio')) {
      return 'Biologia na Fuvest: genética, evolução e ecologia são os temas mais cobrados. Foque em resolver questões contextualizadas com situações do cotidiano.';
    }

    // Resposta genérica
    return `Entendi sua pergunta sobre "${mensagem.substring(0, 50)}". No momento, minha análise está baseada nas suas estatísticas: você acerta ${Math.round(contexto.mediaAcertos)}% das questões. ${contexto.temasFracos.length > 0 ? `Seu ponto mais fraco é "${contexto.temasFracos[0].tema}" — recomendo praticar mais nesse tema.` : 'Continue praticando regularmente para manter o ritmo!'}`;
  }
}
```

---

## Tarefa 2 — Criar `src/ia/ia.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Estatistica } from '../database/entities/estatistica.entity';
import { FallbackRegrasService } from './fallback/regras.service';

interface MensagemChat {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class IaService {
  private readonly logger = new Logger(IaService.name);
  private readonly TIMEOUT_MS = 5000;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Estatistica) private estatisticaRepo: Repository<Estatistica>,
    private fallbackService: FallbackRegrasService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // CHAT
  // ─────────────────────────────────────────────────────────────────────────

  async chat(usuarioId: string, mensagem: string, historico: MensagemChat[] = []) {
    const { contexto, temasFracos, mediaAcertos } = await this.montarContextoUsuario(usuarioId);

    // 1. Tentar Ollama
    try {
      const resposta = await this.chamarOllama(contexto, mensagem, historico);
      return { resposta, fonte: 'ollama' };
    } catch (e) {
      this.logger.warn('Ollama indisponível, tentando alternativa...');
    }

    // 2. Tentar HuggingFace
    try {
      const resposta = await this.chamarHuggingFace(contexto, mensagem, historico);
      return { resposta, fonte: 'huggingface' };
    } catch (e) {
      this.logger.warn('HuggingFace indisponível, usando fallback por regras...');
    }

    // 3. Fallback garantido
    const resposta = this.fallbackService.responderChat(mensagem, { temasFracos, mediaAcertos });
    return { resposta, fonte: 'fallback' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUGESTÕES
  // ─────────────────────────────────────────────────────────────────────────

  async getSugestoes(usuarioId: string) {
    const { temasFracos, mediaAcertos } = await this.montarContextoUsuario(usuarioId);

    const sugestoes = [];

    if (temasFracos.length > 0) {
      sugestoes.push({
        tipo: 'prova_focada',
        titulo: `Prova focada em ${temasFracos[0].tema}`,
        descricao: `Seu tema mais fraco é "${temasFracos[0].tema}" com ${Math.round(temasFracos[0].taxa_erro)}% de erro. Pratique mais!`,
        acao: {
          temas: [temasFracos[0].tema],
          qtd_questoes: 10,
          distribuicao: { facil: 20, medio: 40, dificil: 40 },
        },
      });
    }

    if (temasFracos.length > 1) {
      sugestoes.push({
        tipo: 'prova_mista',
        titulo: 'Prova de revisão múltipla',
        descricao: 'Combine seus temas mais fracos em uma prova única para otimizar o tempo.',
        acao: {
          temas: temasFracos.slice(0, 3).map((t) => t.tema),
          qtd_questoes: 15,
          distribuicao: { facil: 30, medio: 40, dificil: 30 },
        },
      });
    }

    sugestoes.push({
      tipo: 'prova_geral',
      titulo: 'Simulado geral',
      descricao: 'Mantenha a consistência com uma prova abrangendo todos os temas do seu curso.',
      acao: {
        qtd_questoes: 20,
        distribuicao: { facil: 33, medio: 34, dificil: 33 },
      },
    });

    return { sugestoes, fonte: 'fallback' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS PRIVADOS
  // ─────────────────────────────────────────────────────────────────────────

  private async montarContextoUsuario(usuarioId: string) {
    const stats = await this.estatisticaRepo.find({ where: { usuario_id: usuarioId } });

    const temasFracos = stats
      .map((s) => ({
        tema: s.tema,
        acertos: s.acertos,
        erros: s.erros,
        taxa_erro: s.acertos + s.erros > 0
          ? (s.erros / (s.acertos + s.erros)) * 100
          : 0,
      }))
      .filter((t) => t.acertos + t.erros >= 3)
      .sort((a, b) => b.taxa_erro - a.taxa_erro)
      .slice(0, 3);

    const totalQuestoes = stats.reduce((acc, s) => acc + s.acertos + s.erros, 0);
    const totalAcertos = stats.reduce((acc, s) => acc + s.acertos, 0);
    const mediaAcertos = totalQuestoes > 0 ? (totalAcertos / totalQuestoes) * 100 : 0;

    const contexto = `
Você é um tutor especializado na Fuvest (vestibular da USP).
Responda sempre em português brasileiro de forma didática e objetiva.

Dados do aluno:
- Taxa de acerto geral: ${Math.round(mediaAcertos)}%
- Temas com mais erro: ${temasFracos.map((t) => `${t.tema} (${Math.round(t.taxa_erro)}% erro)`).join(', ') || 'nenhum identificado ainda'}
- Total de questões respondidas: ${totalQuestoes}

Foque nas dificuldades do aluno e dê conselhos práticos para a Fuvest.
`.trim();

    return { contexto, temasFracos, mediaAcertos };
  }

  private async chamarOllama(
    systemPrompt: string, mensagem: string, historico: MensagemChat[]
  ): Promise<string> {
    const baseUrl = this.configService.get<string>('ollama.baseUrl');
    const model = this.configService.get<string>('ollama.model');

    const response = await axios.post(
      `${baseUrl}/api/chat`,
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...historico,
          { role: 'user', content: mensagem },
        ],
        stream: false,
      },
      { timeout: this.TIMEOUT_MS },
    );

    return response.data.message?.content ?? '';
  }

  private async chamarHuggingFace(
    systemPrompt: string, mensagem: string, historico: MensagemChat[]
  ): Promise<string> {
    const apiKey = this.configService.get<string>('huggingface.apiKey');
    if (!apiKey) throw new Error('HuggingFace API key não configurada');

    const prompt = `${systemPrompt}\n\nUsuário: ${mensagem}\nAssistente:`;

    const response = await axios.post(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
      { inputs: prompt, parameters: { max_new_tokens: 500, temperature: 0.7 } },
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: this.TIMEOUT_MS,
      },
    );

    const texto = response.data[0]?.generated_text ?? '';
    return texto.split('Assistente:').pop()?.trim() ?? '';
  }
}
```

---

## Tarefa 3 — Criar `src/ia/dto/chat.dto.ts`

```typescript
import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MensagemHistoricoDto {
  @IsString()
  role: 'user' | 'assistant';

  @IsString()
  content: string;
}

export class ChatDto {
  @IsString()
  mensagem: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MensagemHistoricoDto)
  historico?: MensagemHistoricoDto[];
}
```

---

## Tarefa 4 — Criar `src/ia/ia.controller.ts`

```typescript
import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Usuario } from '../database/entities/usuario.entity';
import { IaService } from './ia.service';
import { ChatDto } from './dto/chat.dto';

@Controller('ia')
@UseGuards(JwtAuthGuard)
export class IaController {
  constructor(private iaService: IaService) {}

  @Post('chat')
  chat(@Body() dto: ChatDto, @GetUser() usuario: Usuario) {
    return this.iaService.chat(usuario.id, dto.mensagem, dto.historico ?? []);
  }

  @Get('sugestoes')
  getSugestoes(@GetUser() usuario: Usuario) {
    return this.iaService.getSugestoes(usuario.id);
  }
}
```

---

## Tarefa 5 — Criar `src/ia/ia.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IaController } from './ia.controller';
import { IaService } from './ia.service';
import { FallbackRegrasService } from './fallback/regras.service';
import { Estatistica } from '../database/entities/estatistica.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Estatistica])],
  controllers: [IaController],
  providers: [IaService, FallbackRegrasService],
})
export class IaModule {}
```

---

## Tarefa 6 — Adicionar IaModule no AppModule

```typescript
import { IaModule } from './ia/ia.module';

@Module({ imports: [..., IaModule] })
export class AppModule {}
```

---

## Endpoints gerados neste passo

| Método | Rota | Proteção | Descrição |
|--------|------|----------|-----------|
| POST | `/api/ia/chat` | JWT | Chat com IA contextualizado |
| GET | `/api/ia/sugestoes` | JWT | Sugestões de estudo personalizadas |

---

## Comportamento do campo `fonte` na resposta

| Valor | Significado |
|---|---|
| `ollama` | IA local (Ollama) respondeu |
| `huggingface` | API externa respondeu |
| `fallback` | Sistema de regras respondeu (sempre funcional) |

O frontend pode usar esse campo para exibir um indicador de status da IA.

---

## Resultado esperado ao final deste passo
- [ ] `POST /api/ia/chat` responde mesmo com Ollama desligado (usa fallback)
- [ ] `GET /api/ia/sugestoes` retorna ao menos 1 sugestão (prova geral)
- [ ] `fonte: 'fallback'` quando IA real está indisponível
- [ ] Contexto do usuário (temas fracos, média) está presente no prompt
- [ ] Timeout de 5s é respeitado para não travar a resposta

## Próximo passo
`STEP_09_FRONTEND_BASE.md` — Frontend Angular: setup base, auth e roteamento
