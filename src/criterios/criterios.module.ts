import { Module } from '@nestjs/common';
import { CriteriosController } from './criterios.controller';
import { CriteriosService } from './criterios.service';
import { PrismaService } from '../database/prismaService';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [AuditoriaModule],
  controllers: [CriteriosController],
  providers: [CriteriosService, PrismaService],
})
export class CriteriosModule {}