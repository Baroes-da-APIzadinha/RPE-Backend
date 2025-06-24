import { Module } from '@nestjs/common';
import { PrismaService } from './prismaService';

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}