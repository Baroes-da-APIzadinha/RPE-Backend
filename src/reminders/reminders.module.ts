// src/reminders/reminders.module.ts
import { Module } from '@nestjs/common';
import { RemindersService } from './reminders.service';

@Module({
  providers: [RemindersService],
  exports: [RemindersService], // necessário se outro módulo (ex: Auth) usar
})
export class RemindersModule {}
