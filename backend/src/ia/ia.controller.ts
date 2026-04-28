import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Usuario } from '../database/entities/usuario.entity';
import { IaService } from './ia.service';
import { ChatDto } from './dto/chat.dto';
import { GerarProvaIaDto } from './dto/gerar-prova-ia.dto';

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

  @Post('gerar-prova')
  gerarProva(@Body() dto: GerarProvaIaDto, @GetUser() usuario: Usuario) {
    return this.iaService.gerarProvaIA(
      dto.temas,
      dto.qtd_questoes ?? 10,
      usuario.id,
    );
  }
}

