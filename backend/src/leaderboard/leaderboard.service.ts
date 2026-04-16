import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaderboardSemanal } from '../database/entities/leaderboard-semanal.entity';
import { Prova } from '../database/entities/prova.entity';

function getInicioSemanaAtual(): string {
  const hoje = new Date();
  const dia = hoje.getDay();
  const diff = hoje.getDate() - dia + (dia === 0 ? -6 : 1);
  const seg = new Date(new Date(hoje).setDate(diff));
  return seg.toISOString().split('T')[0];
}

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(LeaderboardSemanal) private leaderboardRepo: Repository<LeaderboardSemanal>,
    @InjectRepository(Prova) private provaRepo: Repository<Prova>,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // GLOBAL: top 10 por frequência de uso (total de provas finalizadas)
  // ─────────────────────────────────────────────────────────────────────────

  async getRankingGlobal() {
    const result = await this.provaRepo.query(`
      SELECT
        u.id,
        u.nome,
        COUNT(p.id) AS total_provas,
        ROUND(AVG(
          (SELECT COUNT(*) FROM respostas r WHERE r.prova_id = p.id AND r.correta = true)::NUMERIC /
          NULLIF((SELECT COUNT(*) FROM respostas r2 WHERE r2.prova_id = p.id), 0) * 100
        ), 1) AS media_acertos
      FROM provas p
      JOIN usuarios u ON u.id = p.usuario_id
      WHERE p.finalizada = true
      GROUP BY u.id, u.nome
      ORDER BY total_provas DESC
      LIMIT 10
    `);

    return {
      tipo: 'global',
      ranking: result.map((r: any, i: number) => ({
        posicao: i + 1,
        nome: r.nome,
        total_provas: parseInt(r.total_provas),
        media_acertos: parseFloat(r.media_acertos) || 0,
      })),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POR CURSO: top 10 por acertos na prova semanal
  // ─────────────────────────────────────────────────────────────────────────

  async getRankingCurso(cursoId: number, semana?: string) {
    const semanaAlvo = semana ?? getInicioSemanaAtual();

    const result = await this.leaderboardRepo.query(`
      SELECT
        u.nome,
        ls.acertos,
        ls.usuario_id
      FROM leaderboard_semanal ls
      JOIN usuarios u ON u.id = ls.usuario_id
      WHERE ls.curso_id = $1
        AND ls.semana = $2
      ORDER BY ls.acertos DESC
      LIMIT 10
    `, [cursoId, semanaAlvo]);

    return {
      curso_id: cursoId,
      semana: semanaAlvo,
      ranking: result.map((r: any, i: number) => ({
        posicao: i + 1,
        nome: r.nome,
        acertos: parseInt(r.acertos),
      })),
    };
  }

  // Listar cursos com participação ativa na semana atual
  async getCursosAtivos(): Promise<number[]> {
    const semana = getInicioSemanaAtual();
    const result = await this.leaderboardRepo.query(`
      SELECT DISTINCT curso_id FROM leaderboard_semanal WHERE semana = $1
    `, [semana]);
    return result.map((r: any) => r.curso_id);
  }
}
