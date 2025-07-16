// src/reminders/reminders.module.ts
import { Module } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { RemindersController } from './reminders.controller';
import { PrismaService } from '../database/prismaService';

@Module({
  providers: [RemindersService, PrismaService],
  exports: [RemindersService],
  controllers: [RemindersController], // necessário se outro módulo (ex: Auth) usar
})
export class RemindersModule {}
