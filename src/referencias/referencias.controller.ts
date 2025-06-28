import { Body, Controller, Post, Put, Delete, Param } from '@nestjs/common';
import { ReferenciasService } from './referencias.service';
import { CriarReferenciaDto, AtualizarReferenciaDto } from './referencias.dto';

@Controller('referencias')
export class ReferenciasController {
  constructor(private readonly referenciasService: ReferenciasService) {}

  @Post()
  async indicarReferencia(@Body() dto: CriarReferenciaDto) {
    return this.referenciasService.criarReferencia(dto);
  }

  @Put(':idIndicacao')
  async atualizarReferencia(
    @Param('idIndicacao') idIndicacao: string,
    @Body() dto: AtualizarReferenciaDto,
  ) {
    return this.referenciasService.atualizarReferencia(idIndicacao, dto);
  }

  @Delete(':idIndicacao')
  async deletarReferencia(@Param('idIndicacao') idIndicacao: string) {
    return this.referenciasService.deletarReferencia(idIndicacao);
  }
} 