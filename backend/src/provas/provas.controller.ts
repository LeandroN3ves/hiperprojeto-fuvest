import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ProvasSemanaisService } from './provas-semanais.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Usuario } from '../database/entities/usuario.entity';
import { ProvasService } from './provas.service';
import { GerarProvaDto } from './dto/gerar-prova.dto';
import { ResponderQuestaoDto } from './dto/responder-questao.dto';

@Controller('provas')
@UseGuards(JwtAuthGuard)
export class ProvasController {
  constructor(
    private provasService: ProvasService,
    private provasSemanaisService: ProvasSemanaisService,
  ) {}

  @Get('semanal/atual')
  getSemanalAtual(@GetUser() usuario: Usuario) {
    return this.provasSemanaisService.getProvaSemanal(usuario.id, usuario.curso_id);
  }

  @Post('semanal/trigger-test')
  triggerSemanalTest() {
    return this.provasSemanaisService.gerarProvasSemanais();
  }

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
