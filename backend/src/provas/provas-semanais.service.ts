import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Prova } from '../database/entities/prova.entity';
import { CursosService } from '../cursos/cursos.service';
import { QuestoesService } from '../questoes/questoes.service';

/**
 * Retorna a data de início da semana (segunda-feira) formatada como YYYY-MM-DD
 */
function getInicioSemanaAtual(): string {
  const hoje = new Date();
  const dia = hoje.getDay();
  // Se for domingo (0), volta 6 dias. Senão, volta (dia - 1) dias.
  const diff = hoje.getDate() - dia + (dia === 0 ? -6 : 1);
  const seg = new Date(new Date(hoje).setDate(diff));
  return seg.toISOString().split('T')[0];
}

@Injectable()
export class ProvasSemanaisService {
  private readonly logger = new Logger(ProvasSemanaisService.name);

  constructor(
    @InjectRepository(Prova) private provaRepo: Repository<Prova>,
    private cursosService: CursosService,
    private questoesService: QuestoesService,
  ) {}

  /**
   * Executa toda segunda-feira às 00:00.
   * Gera um template de prova semanal para cada curso.
   */
  @Cron('0 0 * * 1')
  async gerarProvasSemanais() {
    this.logger.log('Iniciando geração de provas semanais...');

    const cursos = await this.cursosService.findAll();
    const semana = getInicioSemanaAtual();

    for (const curso of cursos) {
      try {
        // Verificar se já existe template semanal para este curso nesta semana
        // O campo 'finalizada' false e 'tipo' semanal indica um template se usuario_id for null
        const jaExiste = await this.provaRepo.findOne({
          where: { 
            tipo: 'semanal', 
            curso_id: curso.id,
            usuario_id: IsNull(),
          },
          order: { created_at: 'DESC' }
        });

        // Simplicidade para o MVP: Se foi criado nos últimos 6 dias, já temos para essa semana
        if (jaExiste && jaExiste.created_at > new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)) {
          this.logger.log(`Prova semanal já existe para curso ${curso.nome} (${curso.id})`);
          continue;
        }

        // Coletar top 10 temas mais respondidos nesta semana para o curso
        const topTemas = await this.questoesService.getTopTemasSemanais(curso.id, semana, 10);

        if (topTemas.length === 0) {
          this.logger.warn(`Sem dados de temas reais para curso ${curso.nome} — usando temas padrão do curso`);
          // Fallback: usar temas cadastrados no curso
          const temasCurso = await this.cursosService.getTemasDoCurso(curso.id);
          topTemas.push(...temasCurso.slice(0, 10));
        }

        // Se ainda estiver vazio (curso sem temas), pegar temas gerais
        if (topTemas.length === 0) {
            const temasGerais = await this.questoesService.getTemas();
            topTemas.push(...temasGerais.slice(0, 10));
        }

        // Gerar prova semanal template
        const prova = this.provaRepo.create({
          tipo: 'semanal',
          curso_id: curso.id,
          usuario_id: undefined, // Template global do curso
          configuracao: {
            qtd_questoes: 20,
            temas: topTemas,
            distribuicao: { facil: 33, medio: 34, dificil: 33 },
            questoes_ids: [], // No sistema do Step 05, questoes_ids é populado ao "gerar"
          },
          finalizada: false,
        });

        await this.provaRepo.save(prova);
        this.logger.log(`Prova semanal criada para ${curso.nome}: ${topTemas.join(', ')}`);
      } catch (err) {
        this.logger.error(`Erro ao gerar prova semanal para ${curso.nome}:`, err);
      }
    }

    this.logger.log('Geração de provas semanais concluída');
  }

  /**
   * Busca a prova semanal atual para um usuário e seu curso.
   */
  async getProvaSemanal(usuarioId: string, cursoId: number) {
    const semana = getInicioSemanaAtual();

    // 1. Verificar se o usuário já finalizou a prova semanal esta semana
    const participacaoExistente = await this.provaRepo.findOne({
      where: { 
          usuario_id: usuarioId, 
          tipo: 'semanal', 
          curso_id: cursoId, 
          finalizada: true 
      },
      order: { created_at: 'DESC' }
    });

    // Se a participação for recente (nesta semana)
    if (participacaoExistente && participacaoExistente.created_at > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
      return {
        disponivel: true,
        ja_participou: true,
        prova_id: participacaoExistente.id,
        semana,
      };
    }

    // 2. Verificar se o usuário tem uma prova semanal em andamento
    const emAndamento = await this.provaRepo.findOne({
        where: {
            usuario_id: usuarioId,
            tipo: 'semanal',
            curso_id: cursoId,
            finalizada: false
        },
        order: { created_at: 'DESC' }
    });

    if (emAndamento && emAndamento.created_at > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
        return {
            disponivel: true,
            ja_participou: false,
            prova_id: emAndamento.id,
            semana,
            configuracao: emAndamento.configuracao,
        };
    }

    // 3. Verificar se existe template semanal para o curso
    const template = await this.provaRepo.findOne({
      where: { tipo: 'semanal', curso_id: cursoId, usuario_id: IsNull() },
      order: { created_at: 'DESC' },
    });

    if (!template) {
        return {
            disponivel: false,
            ja_participou: false,
            prova_id: null,
            semana,
            configuracao: null,
        };
    }

    return {
      disponivel: true,
      ja_participou: false,
      prova_id: null, // Indica que precisa "instanciar" a prova a partir do template
      semana,
      configuracao: template.configuracao,
    };
  }
}
