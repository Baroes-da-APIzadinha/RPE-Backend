import { Module } from '@nestjs/common';
import { ColaboradorService } from './colaborador.service';
import { ColaboradorController } from './colaborador.controller';
import { PrismaService } from 'src/database/prismaService';
import { AvaliacoesService } from '../avaliacoes/avaliacoes.service';
import { CicloService } from '../ciclo/ciclo.service';
import { CriteriosService } from '../criterios/criterios.service';

@Module({
  providers: [ColaboradorService, PrismaService, AvaliacoesService, CicloService, CriteriosService],
  controllers: [ColaboradorController],
  exports: [ColaboradorService],
})
export class ColaboradorModule {}
