import { Module, forwardRef } from '@nestjs/common';
import { CicloService } from './ciclo.service';
import { CicloController } from './ciclo.controller';
import { CiclosStatus } from './cicloStatus.service';
import { PrismaService } from 'src/database/prismaService';
import { ScheduleModule } from '@nestjs/schedule';
import { AvaliacoesService } from 'src/avaliacoes/avaliacoes.service';
import { EqualizacaoService } from 'src/equalizacao/equalizacao.service';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { HashService } from 'src/common/hash.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuditoriaModule,
  ],
  providers: [CicloService, CiclosStatus, PrismaService, AvaliacoesService, EqualizacaoService, HashService],
  controllers: [CicloController],
})
export class CicloModule {}
