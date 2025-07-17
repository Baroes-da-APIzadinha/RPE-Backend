import { Module } from '@nestjs/common';
import { ImportacaoController } from './importacao.controller';
import { ImportacaoService } from './importacao.service';
import { DatabaseModule } from '../database/database.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { HashService } from 'src/common/hash.service';

@Module({
  imports: [DatabaseModule, AuditoriaModule, ],
  controllers: [ImportacaoController],
  providers: [ImportacaoService, HashService]
})
export class ImportacaoModule {}
