import { Module, forwardRef } from '@nestjs/common';
import { CicloService } from './ciclo.service';
import { CicloController } from './ciclo.controller';
import { PrismaService } from 'src/database/prismaService';

@Module({
  providers: [CicloService, PrismaService],
  controllers: [CicloController],
})
export class CicloModule {}
