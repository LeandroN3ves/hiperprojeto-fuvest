import { Controller, Get } from '@nestjs/common';
import { QuestoesService } from './questoes.service';

@Controller('questoes')
export class QuestoesController {
  constructor(private questoesService: QuestoesService) {}

  @Get('temas')
  getTemas() {
    return this.questoesService.getTemas();
  }
}
