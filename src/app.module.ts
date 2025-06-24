import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ColaboradorModule } from './colaborador/colaborador.module';
import { CriteriosModule } from './criterios/criterios.module';
import { CicloModule } from './ciclo/ciclo.module';
import { AvaliacoesModule } from './avaliacoes/avaliacoes.module';

@Module({
  imports: [ColaboradorModule, CriteriosModule, CicloModule, AvaliacoesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
