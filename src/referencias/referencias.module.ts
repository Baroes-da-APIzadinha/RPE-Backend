import { Module } from '@nestjs/common';
import { ReferenciasController } from './referencias.controller';
import { ReferenciasService } from './referencias.service';
import { PrismaService } from '../database/prismaService';

@Module({
  controllers: [ReferenciasController],
  providers: [ReferenciasService, PrismaService],
})
export class ReferenciasModule {} 