import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ColaboradorModule } from './colaborador/colaborador.module';
import { CicloModule } from './ciclo/ciclo.module';
import { CriteriosModule } from './criterios/criterios.module';
import { AssociacaoCriterioCicloModule } from './criterioCiclo/criterioCiclo.module';

@Module({
  imports: [ColaboradorModule, CriteriosModule, CicloModule, AssociacaoCriterioCicloModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
