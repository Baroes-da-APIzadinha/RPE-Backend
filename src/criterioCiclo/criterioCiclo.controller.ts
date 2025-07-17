import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AssociacaoCriterioCicloService } from './criterioCiclo.service';
import { CreateAssociacaoCriterioCicloDto, UpdateAssociacaoCriterioCicloDto } from './criterioCiclo.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('associacoes-criterio-ciclo')
export class AssociacaoCriterioCicloController {
  constructor(private readonly service: AssociacaoCriterioCicloService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'RH')
  @Post()
  create(@Body() dto: CreateAssociacaoCriterioCicloDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/ciclo/:idCiclo')
  findByCiclo(@Param('idCiclo', new ParseUUIDPipe()) idCiclo: string) {
    return this.service.findByCiclo(idCiclo);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'RH')
  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateAssociacaoCriterioCicloDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'RH')
  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.remove(id);
  }
}
