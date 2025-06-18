import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CriteriosModule } from './criterios/criterios.module';

@Module({
  imports: [CriteriosModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
