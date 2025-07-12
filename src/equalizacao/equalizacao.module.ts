import { EqualizacaoService } from './equalizacao.service';
import { EqualizacaoController } from './equalizacao.controller';
import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prismaService';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { HashService } from '../common/hash.service';

@Module({
  imports: [AuditoriaModule],
  controllers: [EqualizacaoController],
  providers: [EqualizacaoService, PrismaService, HashService],
})
export class EqualizacaoModule {}