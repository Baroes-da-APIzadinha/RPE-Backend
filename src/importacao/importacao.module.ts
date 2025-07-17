import { Module } from '@nestjs/common';
import { ImportacaoController } from './importacao.controller';
import { ImportacaoService } from './importacao.service';
import { DatabaseModule } from '../database/database.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [DatabaseModule, AuditoriaModule],
  controllers: [ImportacaoController],
  providers: [ImportacaoService]
})
export class ImportacaoModule {}
