// src/reminders/reminders.module.ts
import { Module } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { RemindersController } from './reminders.controller';

@Module({
  providers: [RemindersService],
  exports: [RemindersService],
  controllers: [RemindersController], // necessário se outro módulo (ex: Auth) usar
})
export class RemindersModule {}
