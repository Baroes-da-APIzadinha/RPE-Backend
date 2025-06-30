import { Module } from '@nestjs/common';
import { ImportacaoController } from './importacao.controller';
import { ImportacaoService } from './importacao.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ImportacaoController],
  providers: [ImportacaoService]
})
export class ImportacaoModule {}
