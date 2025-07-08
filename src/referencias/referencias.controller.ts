import { Body, Controller, Post, Put, Delete, Param, Get, UseGuards } from '@nestjs/common';
import { ReferenciasService } from './referencias.service';
import { CriarReferenciaDto, AtualizarReferenciaDto } from './referencias.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('referencias')
export class ReferenciasController {
  constructor(private readonly referenciasService: ReferenciasService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COLABORADOR_COMUM')
  @Post()
  async indicarReferencia(@Body() dto: CriarReferenciaDto) {
    return this.referenciasService.criarReferencia(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COLABORADOR_COMUM')
  @Put(':idIndicacao')
  async atualizarReferencia(
    @Param('idIndicacao') idIndicacao: string,
    @Body() dto: AtualizarReferenciaDto,
  ) {
    return this.referenciasService.atualizarReferencia(idIndicacao, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COLABORADOR_COMUM')
  @Delete(':idIndicacao')
  async deletarReferencia(@Param('idIndicacao') idIndicacao: string) {
    return this.referenciasService.deletarReferencia(idIndicacao);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllReferencias() {
    return this.referenciasService.getAllReferencias();
  }

  @UseGuards(JwtAuthGuard)
  @Get('indicado/:idIndicado')
  async getReferenciaByIndicado(@Param('idIndicado') idIndicado: string) {
    return this.referenciasService.getReferenciaByIndicado(idIndicado);
  }

  @UseGuards(JwtAuthGuard)
  @Get('indicador/:idIndicador')
  async getReferenciaByIndicador(@Param('idIndicador') idIndicador: string) {
    return this.referenciasService.getReferenciaByIndicador(idIndicador);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':idIndicacao')
  async getReferenciaById(@Param('idIndicacao') idIndicacao: string) {
    return this.referenciasService.getReferenciaById(idIndicacao);
  }
} 