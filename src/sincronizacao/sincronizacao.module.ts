import { Module } from '@nestjs/common';
import { SincronizacaoService } from './sincronizacao.service';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module'; 
@Module({
  imports: [HttpModule, DatabaseModule], // Adicione os módulos aqui
  providers: [SincronizacaoService],
})
export class SincronizacaoModule {}