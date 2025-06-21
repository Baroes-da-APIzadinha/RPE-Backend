import { Body, Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import { AvaliacaoService } from './avaliacao.service';
import { CreateAvaliacaoDto } from './avaliacao.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Response } from 'express';

@Controller('avaliacoes')
export class AvaliacaoController {
  constructor(private readonly avaliacaoService: AvaliacaoService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async criarAvaliacao(@Body() data: CreateAvaliacaoDto) {
    return this.avaliacaoService.criarAvaliacao(data);
  }

  @UseGuards(JwtAuthGuard)
  @Get('enviadas/:idAvaliador')
  async listarEnviadas(@Param('idAvaliador') idAvaliador: string) {
    return this.avaliacaoService.listarEnviadas(idAvaliador);
  }

  @UseGuards(JwtAuthGuard)
  @Get('recebidas/:idAvaliado')
  async listarRecebidas(@Param('idAvaliado') idAvaliado: string) {
    return this.avaliacaoService.listarRecebidas(idAvaliado);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MEMBRO_COMITE')
  @Get('exportar')
  async exportarAvaliacoes(@Res() res: Response) {
    const csv = await this.avaliacaoService.exportarAvaliacoes();
    res.header('Content-Type', 'text/csv');
    res.attachment('avaliacoes.csv');
    return res.send(csv);
  }
} 