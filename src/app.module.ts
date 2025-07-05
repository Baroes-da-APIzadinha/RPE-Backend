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
import { EqualizacaoService } from './equalizacao/equalizacao.service';
import { EqualizacaoController } from './equalizacao/equalizacao.controller';
import { EqualizacaoModule } from './equalizacao/equalizacao.module';
import { ReferenciasModule } from './referencias/referencias.module';
import { ImportacaoModule } from './importacao/importacao.module';
import { RhModule } from './rh/rh.module';
import { ProjetosModule } from './projetos/projetos.module';


@Module({
  imports: [ColaboradorModule, CriteriosModule, CicloModule, AssociacaoCriterioCicloModule, AuthModule, JwtModule.register({}), AvaliacoesModule, EqualizacaoModule, ReferenciasModule, ImportacaoModule, RhModule, ProjetosModule],
  controllers: [AppController, AvaliacoesController, EqualizacaoController],
  providers: [AppService, PrismaService, AvaliacoesService, EqualizacaoService],
})
export class AppModule {}