import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  async getLogs(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
  ) {
    return this.auditoriaService.getLogs({ userId, action, resource });
  }

  @Get('logs')
  async getLogsPaginated(@Query('inicio') inicio: string, @Query('fim') fim?: string,){
    const inicioNum = parseInt(inicio, 10);
    const fimNum = fim ? parseInt(fim, 10) : undefined;

    if (isNaN(inicioNum) || inicioNum < 0) {
      throw new BadRequestException('Parâmetro "inicio" deve ser um número válido >= 0');
    }

    if (fimNum !== undefined && (isNaN(fimNum) || fimNum <= inicioNum)) {
      throw new BadRequestException('Parâmetro "fim" deve ser um número válido maior que "inicio"');
    }

    return this.auditoriaService.getLogsPaginacao(inicioNum, fimNum);
  }
}