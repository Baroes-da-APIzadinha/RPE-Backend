import { Module } from '@nestjs/common';
import { SincronizacaoService } from './sincronizacao.service';
import { SincronizacaoController } from './sincronizacao.controller';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module'; 
@Module({
  imports: [HttpModule, DatabaseModule],
  providers: [SincronizacaoService],
  controllers: [SincronizacaoController],
})
export class SincronizacaoModule {}