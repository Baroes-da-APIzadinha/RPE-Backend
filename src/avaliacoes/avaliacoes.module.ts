import { Module } from '@nestjs/common';
import { AvaliacoesService } from './avaliacoes.service';
import { AvaliacoesController } from './avaliacoes.controller';
import { PrismaService } from '../database/prismaService';

@Module({
  controllers: [AvaliacoesController],
  providers: [AvaliacoesService, PrismaService],
})
export class AvaliacoesModule {}
