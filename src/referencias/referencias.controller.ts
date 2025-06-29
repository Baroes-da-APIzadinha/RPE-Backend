import { Body, Controller, Post, Put, Delete, Param, Get } from '@nestjs/common';
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

  @Get()
  async getAllReferencias() {
    return this.referenciasService.getAllReferencias();
  }

  @Get('indicado/:idIndicado')
  async getReferenciaByIndicado(@Param('idIndicado') idIndicado: string) {
    return this.referenciasService.getReferenciaByIndicado(idIndicado);
  }

  @Get('indicador/:idIndicador')
  async getReferenciaByIndicador(@Param('idIndicador') idIndicador: string) {
    return this.referenciasService.getReferenciaByIndicador(idIndicador);
  }

  @Get(':idIndicacao')
  async getReferenciaById(@Param('idIndicacao') idIndicacao: string) {
    return this.referenciasService.getReferenciaById(idIndicacao);
  }
} 