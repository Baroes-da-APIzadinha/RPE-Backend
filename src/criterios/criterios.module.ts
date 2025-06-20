import { Module } from '@nestjs/common';
import { CriteriosController } from './criterios.controller';
import { CriteriosService } from './criterios.service';
import { PrismaService } from '../database/prismaService';

@Module({
  controllers: [CriteriosController],
  providers: [CriteriosService, PrismaService],
})
export class CriteriosModule {}