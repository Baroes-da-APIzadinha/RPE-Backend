import { Module, forwardRef } from '@nestjs/common';
import { CicloService } from './ciclo.service';
import { CicloController } from './ciclo.controller';
import { CiclosStatus } from './cicloStatus.service';
import { PrismaService } from 'src/database/prismaService';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
  ],
  providers: [CicloService, CiclosStatus, PrismaService],
  controllers: [CicloController],
})
export class CicloModule {}
