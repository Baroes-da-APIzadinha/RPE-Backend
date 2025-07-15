import { Module } from '@nestjs/common';
import { ExportacaoController } from './exportacao.controller';
import { ExportacaoService } from './exportacao.service';
import { PrismaService } from '../database/prismaService'; 

@Module({
  controllers: [ExportacaoController],
  providers: [ExportacaoService, PrismaService]
})
export class ExportacaoModule {}
