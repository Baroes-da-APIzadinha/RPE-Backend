import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ColaboradorModule } from './colaborador/colaborador.module';
import { CriteriosModule } from './criterios/criterios.module';

@Module({
  imports: [ColaboradorModule, CriteriosModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
