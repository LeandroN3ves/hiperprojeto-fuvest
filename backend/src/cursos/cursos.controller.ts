import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { CursosService } from './cursos.service';

@Controller('cursos')
export class CursosController {
  constructor(private cursosService: CursosService) {}

  @Get()
  findAll() {
    return this.cursosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cursosService.findById(id);
  }
}
