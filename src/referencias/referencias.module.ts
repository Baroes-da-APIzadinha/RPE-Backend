import { Module } from '@nestjs/common';
import { ReferenciasController } from './referencias.controller';
import { ReferenciasService } from './referencias.service';
import { PrismaService } from '../database/prismaService';
import { HashService } from '../common/hash.service';

@Module({
  controllers: [ReferenciasController],
  providers: [ReferenciasService, PrismaService, HashService],
})
export class ReferenciasModule {} 