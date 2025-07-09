import { Module } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';
import { PrismaService } from '../database/prismaService';

@Module({
  providers: [AuditoriaService, PrismaService],
  exports: [AuditoriaService],
})
export class AuditoriaModule {} 