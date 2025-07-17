import { Module } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';
import { PrismaService } from '../database/prismaService';
import { AuditoriaController } from './auditoria.controller';

@Module({
  controllers: [AuditoriaController],
  providers: [AuditoriaService, PrismaService],
  exports: [AuditoriaService],
})
export class AuditoriaModule {} 