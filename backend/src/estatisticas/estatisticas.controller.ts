import { Controller, Get, Param, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Usuario } from '../database/entities/usuario.entity';
import { EstatisticasService } from './estatisticas.service';

@Controller('estatisticas')
@UseGuards(JwtAuthGuard)
export class EstatisticasController {
  constructor(private estatisticasService: EstatisticasService) {}

  // Dashboard completo
  @Get()
  getDashboard(@GetUser() usuario: Usuario) {
    return this.estatisticasService.getDashboard(usuario.id);
  }

  // Apenas stats por tema
  @Get('temas')
  getTemas(@GetUser() usuario: Usuario) {
    return this.estatisticasService.getStatsPorTema(usuario.id);
  }

  // Fraquezas + sugestão de prova
  @Get('fraquezas')
  getFraquezas(@GetUser() usuario: Usuario, @Query('limite') limite?: number) {
    return this.estatisticasService.getFraquezas(usuario.id, limite ?? 3);
  }

  // Stats de hoje
  @Get('hoje')
  getHoje(@GetUser() usuario: Usuario) {
    return this.estatisticasService.getStatsHoje(usuario.id);
  }

  // Rastreamento diário de questão específica
  @Get('questao-diaria/:questaoId')
  getQuestaoStats(
    @Param('questaoId', ParseIntPipe) questaoId: number,
    @GetUser() usuario: Usuario,
  ) {
    return this.estatisticasService.getQuestaoStatsDiaria(usuario.id, questaoId);
  }
}
