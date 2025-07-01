import { Controller, Get, Param } from '@nestjs/common';
import { RhService } from './rh.service';

@Controller('rh')
export class RhController {
  constructor(private readonly rhService: RhService) {}

  // 1. Quantidade de colaboradores participando naquele ciclo
  @Get('colaboradores/ciclo/:idCiclo')
  async getQuantidadeColaboradoresPorCiclo(@Param('idCiclo') idCiclo: string) {
    return this.rhService.getQuantidadeColaboradoresPorCiclo(idCiclo);
  }

  // 2. Quantidade de avaliações respondidas naquele ciclo
  @Get('avaliacoes/concluidas/ciclo/:idCiclo')
  async getQuantidadeAvaliacoesConcluidasPorCiclo(@Param('idCiclo') idCiclo: string) {
    return this.rhService.getQuantidadeAvaliacoesConcluidasPorCiclo(idCiclo);
  }

  // 3. Quantidade de unidades
  @Get('unidades')
  async getQuantidadeUnidades() {
    return this.rhService.getQuantidadeUnidades();
  }

  // 4. Status das avaliações do ciclo em curso
  @Get('avaliacoes/status/:idCiclo')
  async getStatusAvaliacoesPorCiclo(@Param('idCiclo') idCiclo: string) {
    return this.rhService.getStatusAvaliacoesPorCiclo(idCiclo);
  }

  // 5. Progresso de conclusão por unidade
  @Get('progresso/unidade/ciclo/:idCiclo')
  async getProgressoPorUnidade(@Param('idCiclo') idCiclo: string) {
    return this.rhService.getProgressoPorUnidade(idCiclo);
  }

  // 6. Progresso de conclusão por trilha
  @Get('progresso/trilha/ciclo/:idCiclo')
  async getProgressoPorTrilha(@Param('idCiclo') idCiclo: string) {
    return this.rhService.getProgressoPorTrilha(idCiclo);
  }
}