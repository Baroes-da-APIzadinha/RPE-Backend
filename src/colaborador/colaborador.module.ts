import { Module } from '@nestjs/common';
import { ColaboradorService } from './colaborador.service';
import { ColaboradorController } from './colaborador.controller';
import { PrismaService } from 'src/database/prismaService';

@Module({
  providers: [ColaboradorService, PrismaService],
  controllers: [ColaboradorController]
})
export class ColaboradorModule {}
