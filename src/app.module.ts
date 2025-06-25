import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ColaboradorModule } from './colaborador/colaborador.module';
import { CriteriosModule } from './criterios/criterios.module';
import { AuthModule } from './auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './database/prismaService';
import { AssociacaoCriterioCicloModule } from './criterioCiclo/criterioCiclo.module';
import { CicloModule } from './ciclo/ciclo.module';
import { AvaliacoesController } from './avaliacoes/avaliacoes.controller';
import { AvaliacoesService } from './avaliacoes/avaliacoes.service';
import { AvaliacoesModule } from './avaliacoes/avaliacoes.module';


@Module({
  imports: [ColaboradorModule, CriteriosModule, CicloModule, AssociacaoCriterioCicloModule, AuthModule, JwtModule.register({}), AvaliacoesModule],
  controllers: [AppController, AvaliacoesController],
  providers: [AppService, PrismaService, AvaliacoesService],
})
export class AppModule {}