import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AssociacaoCriterioCicloService } from './criterioCiclo.service';
import { CreateAssociacaoCriterioCicloDto, UpdateAssociacaoCriterioCicloDto } from './criterioCiclo.dto';

@Controller('associacoes-criterio-ciclo')
export class AssociacaoCriterioCicloController {
  constructor(private readonly service: AssociacaoCriterioCicloService) {}

  @Post()
  create(@Body() dto: CreateAssociacaoCriterioCicloDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('/ciclo/:idCiclo')
  findByCiclo(@Param('idCiclo', new ParseUUIDPipe()) idCiclo: string) {
    return this.service.findByCiclo(idCiclo);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateAssociacaoCriterioCicloDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.remove(id);
  }
}
