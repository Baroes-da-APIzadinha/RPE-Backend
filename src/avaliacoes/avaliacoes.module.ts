import { Module, forwardRef } from '@nestjs/common';
import { AvaliacoesService } from './avaliacoes.service';
import { AvaliacoesController } from './avaliacoes.controller';
import { PrismaService } from '../database/prismaService';

@Module({
  controllers: [AvaliacoesController],
  providers: [AvaliacoesService, PrismaService],
  exports: [AvaliacoesService],
})
export class AvaliacoesModule {}
