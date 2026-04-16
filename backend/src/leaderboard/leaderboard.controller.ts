import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private leaderboardService: LeaderboardService) {}

  // Ranking global (público — exibir na landing page)
  @Get('global')
  getGlobal() {
    return this.leaderboardService.getRankingGlobal();
  }

  // Cursos com participação ativa na semana
  @Get('cursos-ativos')
  getCursosAtivos() {
    return this.leaderboardService.getCursosAtivos();
  }

  // Ranking de um curso específico na semana
  @Get('curso/:cursoId')
  getCurso(
    @Param('cursoId', ParseIntPipe) cursoId: number,
    @Query('semana') semana?: string,
  ) {
    return this.leaderboardService.getRankingCurso(cursoId, semana);
  }
}
