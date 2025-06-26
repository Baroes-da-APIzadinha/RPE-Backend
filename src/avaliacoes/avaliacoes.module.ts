import { Module } from '@nestjs/common';
import { AvaliacoesController } from './avaliacoes.controller';
import { AvaliacoesService } from './avaliacoes.service';
import { PrismaService } from '../database/prismaService';

@Module({
    controllers: [AvaliacoesController],
    providers: [AvaliacoesService, PrismaService],
})
export class AvaliacoesModule {}
