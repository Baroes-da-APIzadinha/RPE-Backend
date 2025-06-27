import { EqualizacaoService } from './equalizacao.service';
import { EqualizacaoController } from './equalizacao.controller';
import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prismaService';

@Module({
  controllers: [EqualizacaoController],
  providers: [EqualizacaoService, PrismaService],
})
export class EqualizacaoModule {}