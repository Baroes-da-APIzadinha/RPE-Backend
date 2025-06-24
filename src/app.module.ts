import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ColaboradorModule } from './colaborador/colaborador.module';
import { CriteriosModule } from './criterios/criterios.module';
import { AuthModule } from './auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './database/prismaService';

@Module({
  imports: [ColaboradorModule, AuthModule, JwtModule.register({}), CriteriosModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
