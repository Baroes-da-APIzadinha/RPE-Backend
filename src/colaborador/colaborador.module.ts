import { Module } from '@nestjs/common';
import { ColaboradorService } from './colaborador.service';
import { ColaboradorController } from './colaborador.controller';
import { PrismaService } from 'src/database/prismaService';
import { AvaliacoesService } from '../avaliacoes/avaliacoes.service';
import { CicloService } from '../ciclo/ciclo.service';
import { CriteriosService } from '../criterios/criterios.service';
import { EqualizacaoService } from 'src/equalizacao/equalizacao.service';
import { HashService } from 'src/common/hash.service';
import { AuditoriaService } from 'src/auditoria/auditoria.service';

@Module({
  providers: [ColaboradorService, PrismaService, AvaliacoesService, CicloService, CriteriosService, EqualizacaoService, HashService, AuditoriaService],
  controllers: [ColaboradorController],
  exports: [ColaboradorService],
})
export class ColaboradorModule {}
