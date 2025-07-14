import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { RhService } from './rh.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('RH')
@Controller('RH')
export class RhController {
  constructor(private readonly rhService: RhService) {}

  @Get('colaboradores/ciclo/:idCiclo')
  async getQuantidadeColaboradoresPorCiclo(@Param('idCiclo') idCiclo: string) {
    return this.rhService.getQuantidadeColaboradoresPorCiclo(idCiclo);
  }

  @Get('avaliacoes/concluidas/ciclo/:idCiclo')
  async getQuantidadeAvaliacoesConcluidasPorCiclo(@Param('idCiclo') idCiclo: string) {
    return this.rhService.getQuantidadeAvaliacoesConcluidasPorCiclo(idCiclo);
  }

  @Get('unidades')
  async getQuantidadeUnidades() {
    return this.rhService.getQuantidadeUnidades();
  }

  @Get('avaliacoes/status/:idCiclo')
  async getStatusAvaliacoesPorCiclo(@Param('idCiclo') idCiclo: string) {
    return this.rhService.getStatusAvaliacoesPorCiclo(idCiclo);
  }

  @Get('progresso/unidade/ciclo/:idCiclo')
  async getProgressoPorUnidade(@Param('idCiclo') idCiclo: string) {
    return this.rhService.getProgressoPorUnidade(idCiclo);
  }

  @Get('progresso/trilha/ciclo/:idCiclo')
  async getProgressoPorTrilha(@Param('idCiclo') idCiclo: string) {
    return this.rhService.getProgressoPorTrilha(idCiclo);
  }
}