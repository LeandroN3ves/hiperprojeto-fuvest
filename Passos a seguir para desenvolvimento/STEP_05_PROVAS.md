# STEP 05 — Módulo de Provas (Geração, Execução e Finalização)

## Contexto
Passo 5 da Plataforma Fuvest. Questões e Cursos prontos (Step 04).
Este é o módulo central: geração de provas, execução questão a questão e finalização com resultado.

## Regras críticas de negócio
- Uma questão por vez — nunca expor todas de uma vez
- Sem pular questão — só avança após responder
- Sem alterar resposta — após confirmar é definitivo
- Feedback imediato após cada resposta (acertou/errou)
- Sem repetição de questão dentro da mesma prova
- Distribuição de dificuldade é proporcional (não fixa)
- Se não houver questões suficientes de uma dificuldade, completar com genérico

---

## Tarefa 1 — Criar `src/provas/dto/gerar-prova.dto.ts`

```typescript
import { IsNumber, IsOptional, IsArray, IsString, IsObject, Min, Max } from 'class-validator';

export class DistribuicaoDificuldade {
  @IsNumber() facil: number;   // percentual 0-100
  @IsNumber() medio: number;
  @IsNumber() dificil: number;
}

export class GerarProvaDto {
  @IsNumber()
  @Min(5)
  @Max(60)
  qtd_questoes: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  temas?: string[];

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsObject()
  distribuicao: DistribuicaoDificuldade;
}
```

---

## Tarefa 2 — Criar `src/provas/dto/responder-questao.dto.ts`

```typescript
import { IsNumber, IsString, Length } from 'class-validator';

export class ResponderQuestaoDto {
  @IsNumber()
  questao_id: number;

  @IsString()
  @Length(1, 1)
  resposta: string; // 'A' | 'B' | 'C' | 'D' | 'E'
}
```

---

## Tarefa 3 — Criar `src/provas/provas.service.ts`

```typescript
import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prova } from '../database/entities/prova.entity';
import { Resposta } from '../database/entities/resposta.entity';
import { Questao } from '../database/entities/questao.entity';
import { Estatistica } from '../database/entities/estatistica.entity';
import { LeaderboardSemanal } from '../database/entities/leaderboard-semanal.entity';
import { QuestoesService } from '../questoes/questoes.service';
import { CursosService } from '../cursos/cursos.service';
import { GerarProvaDto } from './dto/gerar-prova.dto';
import { ResponderQuestaoDto } from './dto/responder-questao.dto';

function shuffle<T>(arr: T[]): T[] {
  return arr.sort(() => Math.random() - 0.5);
}

function getInicioSemanaAtual(): string {
  const hoje = new Date();
  const dia = hoje.getDay(); // 0=dom, 1=seg...
  const diff = hoje.getDate() - dia + (dia === 0 ? -6 : 1);
  const seg = new Date(hoje.setDate(diff));
  return seg.toISOString().split('T')[0];
}

@Injectable()
export class ProvasService {
  constructor(
    @InjectRepository(Prova) private provaRepo: Repository<Prova>,
    @InjectRepository(Resposta) private respostaRepo: Repository<Resposta>,
    @InjectRepository(Estatistica) private estatisticaRepo: Repository<Estatistica>,
    @InjectRepository(LeaderboardSemanal) private leaderboardRepo: Repository<LeaderboardSemanal>,
    private questoesService: QuestoesService,
    private cursosService: CursosService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // GERAÇÃO
  // ─────────────────────────────────────────────────────────────────────────

  async gerarProva(dto: GerarProvaDto, usuarioId: string, cursoId?: number) {
    const { qtd_questoes, distribuicao } = dto;
    let temas = dto.temas ?? [];

    // Se não especificou temas, usa os do curso do usuário
    if (temas.length === 0 && cursoId) {
      temas = await this.cursosService.getTemasDoCurso(cursoId);
    }

    // Calcular quantidades por dificuldade (proporcionais)
    const qtdFacil = Math.round(qtd_questoes * (distribuicao.facil / 100));
    const qtdMedio = Math.round(qtd_questoes * (distribuicao.medio / 100));
    const qtdDificil = qtd_questoes - qtdFacil - qtdMedio; // resto para difícil

    const idsUsados: number[] = [];

    // Buscar por dificuldade, excluindo já selecionados
    const faceis = await this.questoesService.buscarPorDificuldade('facil', qtdFacil, temas, dto.categoria, idsUsados);
    idsUsados.push(...faceis.map((q) => q.id));

    const medias = await this.questoesService.buscarPorDificuldade('medio', qtdMedio, temas, dto.categoria, idsUsados);
    idsUsados.push(...medias.map((q) => q.id));

    const dificeis = await this.questoesService.buscarPorDificuldade('dificil', qtdDificil, temas, dto.categoria, idsUsados);
    idsUsados.push(...dificeis.map((q) => q.id));

    let todasQuestoes = [...faceis, ...medias, ...dificeis];

    // Fallback: completar com questões genéricas se faltaram
    if (todasQuestoes.length < qtd_questoes) {
      const faltam = qtd_questoes - todasQuestoes.length;
      const extras = await this.questoesService.buscarGenerico(faltam, temas, dto.categoria, idsUsados);
      todasQuestoes = [...todasQuestoes, ...extras];
    }

    if (todasQuestoes.length === 0) {
      throw new BadRequestException('Não há questões disponíveis para os critérios selecionados');
    }

    const questoesEmbaralhadas = shuffle(todasQuestoes);

    const prova = this.provaRepo.create({
      usuario_id: usuarioId,
      tipo: 'normal',
      curso_id: cursoId,
      configuracao: {
        ...dto,
        questoes_ids: questoesEmbaralhadas.map((q) => q.id),
      },
    });

    const provaSalva = await this.provaRepo.save(prova);

    return {
      prova_id: provaSalva.id,
      primeira_questao: this.formatarQuestao(questoesEmbaralhadas[0], 1, questoesEmbaralhadas.length),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RESPONDER QUESTÃO
  // ─────────────────────────────────────────────────────────────────────────

  async responderQuestao(provaId: string, dto: ResponderQuestaoDto, usuarioId: string) {
    const prova = await this.provaRepo.findOne({ where: { id: provaId } });
    if (!prova) throw new NotFoundException('Prova não encontrada');
    if (prova.usuario_id !== usuarioId) throw new ForbiddenException();
    if (prova.finalizada) throw new BadRequestException('Prova já finalizada');

    // Verificar se questão pertence a esta prova
    const idsProva: number[] = prova.configuracao.questoes_ids;
    if (!idsProva.includes(dto.questao_id)) {
      throw new BadRequestException('Questão não pertence a esta prova');
    }

    // Verificar se já respondeu esta questão nesta prova
    const jaRespondeu = await this.respostaRepo.findOne({
      where: { prova_id: provaId, questao_id: dto.questao_id },
    });
    if (jaRespondeu) throw new BadRequestException('Questão já respondida');

    const questao = await this.questoesService.findById(dto.questao_id);
    if (!questao) throw new NotFoundException('Questão não encontrada');

    const correta = questao.resposta_correta.toUpperCase() === dto.resposta.toUpperCase();

    // Salvar resposta
    await this.respostaRepo.save({
      usuario_id: usuarioId,
      questao_id: dto.questao_id,
      prova_id: provaId,
      resposta: dto.resposta.toUpperCase(),
      correta,
    });

    // Atualizar estatísticas incrementalmente
    await this.atualizarEstatistica(usuarioId, questao.tema, correta);

    // Descobrir próxima questão
    const respostasCount = await this.respostaRepo.count({ where: { prova_id: provaId } });
    const proximoIndex = respostasCount; // 0-based: já respondeu respostasCount questões
    const proximaQuestaoId = idsProva[proximoIndex] ?? null;

    let proximaQuestao = null;
    if (proximaQuestaoId) {
      const q = await this.questoesService.findById(proximaQuestaoId);
      proximaQuestao = this.formatarQuestao(q, proximoIndex + 1, idsProva.length);
    }

    return {
      correta,
      resposta_correta: questao.resposta_correta,
      proxima_questao: proximaQuestao,
      finalizada: proximaQuestao === null,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FINALIZAR PROVA
  // ─────────────────────────────────────────────────────────────────────────

  async finalizarProva(provaId: string, usuarioId: string) {
    const prova = await this.provaRepo.findOne({ where: { id: provaId } });
    if (!prova) throw new NotFoundException('Prova não encontrada');
    if (prova.usuario_id !== usuarioId) throw new ForbiddenException();

    // Marcar como finalizada
    await this.provaRepo.update(provaId, { finalizada: true });

    // Buscar todas as respostas desta prova com dados da questão
    const respostas = await this.respostaRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.questao', 'q')
      .where('r.prova_id = :provaId', { provaId })
      .getMany();

    const total = respostas.length;
    const acertos = respostas.filter((r) => r.correta).length;
    const percentual = total > 0 ? Math.round((acertos / total) * 100 * 10) / 10 : 0;

    // Agrupar por tema
    const porTema: Record<string, { acertos: number; erros: number }> = {};
    for (const r of respostas) {
      const tema = r.questao?.tema ?? 'Sem tema';
      if (!porTema[tema]) porTema[tema] = { acertos: 0, erros: 0 };
      if (r.correta) porTema[tema].acertos++;
      else porTema[tema].erros++;
    }

    const porTemaArray = Object.entries(porTema).map(([tema, stats]) => ({
      tema,
      acertos: stats.acertos,
      erros: stats.erros,
      taxa_acerto: Math.round((stats.acertos / (stats.acertos + stats.erros)) * 100),
    }));

    // Se for prova semanal, atualizar leaderboard
    if (prova.tipo === 'semanal' && prova.curso_id) {
      await this.atualizarLeaderboardSemanal(usuarioId, prova.curso_id, acertos, provaId);
    }

    return { acertos, total, percentual, por_tema: porTemaArray };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS PRIVADOS
  // ─────────────────────────────────────────────────────────────────────────

  private formatarQuestao(questao: Questao, numero: number, total: number) {
    return {
      id: questao.id,
      enunciado: questao.enunciado,
      alternativas: questao.alternativas,
      numero,
      total,
    };
  }

  private async atualizarEstatistica(usuarioId: string, tema: string, correta: boolean) {
    if (!tema) return;
    const existente = await this.estatisticaRepo.findOne({ where: { usuario_id: usuarioId, tema } });
    if (existente) {
      if (correta) existente.acertos++;
      else existente.erros++;
      await this.estatisticaRepo.save(existente);
    } else {
      await this.estatisticaRepo.save({
        usuario_id: usuarioId,
        tema,
        acertos: correta ? 1 : 0,
        erros: correta ? 0 : 1,
      });
    }
  }

  private async atualizarLeaderboardSemanal(
    usuarioId: string, cursoId: number, acertos: number, provaId: string
  ) {
    const semana = getInicioSemanaAtual();
    await this.leaderboardRepo
      .createQueryBuilder()
      .insert()
      .into(LeaderboardSemanal)
      .values({ usuario_id: usuarioId, curso_id: cursoId, semana, acertos, prova_id: provaId })
      .orUpdate(['acertos', 'prova_id'], ['usuario_id', 'curso_id', 'semana'])
      .execute();
  }
}
```

---

## Tarefa 4 — Criar `src/provas/provas.controller.ts`

```typescript
import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Usuario } from '../database/entities/usuario.entity';
import { ProvasService } from './provas.service';
import { GerarProvaDto } from './dto/gerar-prova.dto';
import { ResponderQuestaoDto } from './dto/responder-questao.dto';

@Controller('provas')
@UseGuards(JwtAuthGuard)
export class ProvasController {
  constructor(private provasService: ProvasService) {}

  @Post('gerar')
  gerar(@Body() dto: GerarProvaDto, @GetUser() usuario: Usuario) {
    return this.provasService.gerarProva(dto, usuario.id, usuario.curso_id);
  }

  @Post(':id/responder')
  responder(
    @Param('id') provaId: string,
    @Body() dto: ResponderQuestaoDto,
    @GetUser() usuario: Usuario,
  ) {
    return this.provasService.responderQuestao(provaId, dto, usuario.id);
  }

  @Post(':id/finalizar')
  finalizar(@Param('id') provaId: string, @GetUser() usuario: Usuario) {
    return this.provasService.finalizarProva(provaId, usuario.id);
  }
}
```

---

## Tarefa 5 — Criar `src/provas/provas.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProvasController } from './provas.controller';
import { ProvasService } from './provas.service';
import { Prova } from '../database/entities/prova.entity';
import { Resposta } from '../database/entities/resposta.entity';
import { Estatistica } from '../database/entities/estatistica.entity';
import { LeaderboardSemanal } from '../database/entities/leaderboard-semanal.entity';
import { QuestoesModule } from '../questoes/questoes.module';
import { CursosModule } from '../cursos/cursos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Prova, Resposta, Estatistica, LeaderboardSemanal]),
    QuestoesModule,
    CursosModule,
  ],
  controllers: [ProvasController],
  providers: [ProvasService],
  exports: [ProvasService],
})
export class ProvasModule {}
```

---

## Endpoints gerados neste passo

| Método | Rota | Proteção | Descrição |
|--------|------|----------|-----------|
| POST | `/api/provas/gerar` | JWT | Gera nova prova e retorna 1ª questão |
| POST | `/api/provas/:id/responder` | JWT | Responde questão atual |
| POST | `/api/provas/:id/finalizar` | JWT | Finaliza prova e retorna resultado |

---

## Teste manual (curl)

```bash
TOKEN="seu_token_aqui"

# 1. Gerar prova
curl -X POST http://localhost:3000/api/provas/gerar \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "qtd_questoes": 5,
    "distribuicao": {"facil": 40, "medio": 40, "dificil": 20}
  }'

# 2. Responder questão (substitua PROVA_ID e QUESTAO_ID)
curl -X POST http://localhost:3000/api/provas/PROVA_ID/responder \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"questao_id": QUESTAO_ID, "resposta": "B"}'

# 3. Finalizar prova
curl -X POST http://localhost:3000/api/provas/PROVA_ID/finalizar \
  -H "Authorization: Bearer $TOKEN"
```

---

## Resultado esperado ao final deste passo
- [ ] `POST /api/provas/gerar` retorna `prova_id` + primeira questão sem expor resposta correta
- [ ] `POST /api/provas/:id/responder` retorna `correta`, `resposta_correta` e próxima questão
- [ ] Tentativa de responder questão já respondida retorna 400
- [ ] `POST /api/provas/:id/finalizar` retorna acertos, total, percentual e breakdown por tema
- [ ] Estatísticas são atualizadas incrementalmente após cada resposta
- [ ] Não é possível repetir questão dentro da mesma prova

## Próximo passo
`STEP_06_ESTATISTICAS.md` — Módulo de Estatísticas e Análise de Desempenho
