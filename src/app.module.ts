import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ColaboradorModule } from './colaborador/colaborador.module';
import { CicloModule } from './ciclo/ciclo.module';

@Module({
  imports: [ColaboradorModule, CicloModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
