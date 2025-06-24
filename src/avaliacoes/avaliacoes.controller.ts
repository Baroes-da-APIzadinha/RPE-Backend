import { Controller, Post, Body, Get, Param } from '@nestjs/common';
// Make sure the file exists at the specified path, or update the path if necessary
import { AvaliacoesService } from './avaliacoes.service';
import { CreateAutoAvaliacaoDto, CreateAvaliacao360Dto } from './avaliacoes.dto';

@Controller('avaliacoes')
export class AvaliacoesController {
  constructor(private readonly avaliacoesService: AvaliacoesService) {}

  // Endpoint para autoavaliação
  @Post('auto')
  async criarAutoAvaliacao(@Body() dto: CreateAutoAvaliacaoDto) {
    return this.avaliacoesService.criarAutoAvaliacao(dto);
  }

  // Endpoint para avaliação 360
  @Post('360')
  async criarAvaliacao360(@Body() dto: CreateAvaliacao360Dto) {
    return this.avaliacoesService.criarAvaliacao360(dto);
  }

  // (Opcional) Listar avaliações por colaborador NÃO IMPLEMENTADO AINDA
  @Get('colaborador/:id')
  async listarPorColaborador(@Param('id') id: string) {
    return this.avaliacoesService.listarPorColaborador(id);
  }
}
