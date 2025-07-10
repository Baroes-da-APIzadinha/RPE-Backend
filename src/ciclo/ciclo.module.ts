import { Module, forwardRef } from '@nestjs/common';
import { CicloService } from './ciclo.service';
import { CicloController } from './ciclo.controller';
import { PrismaService } from 'src/database/prismaService';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [AuditoriaModule],
  providers: [CicloService, PrismaService],
  controllers: [CicloController],
})
export class CicloModule {}
