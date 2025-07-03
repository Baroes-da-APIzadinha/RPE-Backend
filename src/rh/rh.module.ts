import { Module } from '@nestjs/common';
import { RhController } from './rh.controller';
import { RhService } from './rh.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [RhController],
  providers: [RhService]
})
export class RhModule {}
