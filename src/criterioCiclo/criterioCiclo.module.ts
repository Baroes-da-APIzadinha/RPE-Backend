import { Module } from '@nestjs/common';
import { AssociacaoCriterioCicloController } from './criterioCiclo.controller';
import { AssociacaoCriterioCicloService } from './criterioCiclo.service';
import { PrismaService } from 'src/database/prismaService';

@Module({
  controllers: [AssociacaoCriterioCicloController],
  providers: [AssociacaoCriterioCicloService, PrismaService],
})
export class AssociacaoCriterioCicloModule {}
