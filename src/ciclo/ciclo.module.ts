import { Module, forwardRef } from '@nestjs/common';
import { CicloService } from './ciclo.service';
import { CicloController } from './ciclo.controller';
import { CiclosStatus } from './cicloStatus.service';
import { PrismaService } from 'src/database/prismaService';
import { ScheduleModule } from '@nestjs/schedule';
import { AvaliacoesService } from 'src/avaliacoes/avaliacoes.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
  ],
  providers: [CicloService, CiclosStatus, PrismaService, AvaliacoesService],
  controllers: [CicloController],
})
export class CicloModule {}
