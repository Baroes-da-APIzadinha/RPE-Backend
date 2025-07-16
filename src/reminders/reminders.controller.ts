import { Controller, Get, Post, Body, HttpCode, HttpStatus, Logger, UseGuards, Param } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SetReminderDto } from './dto/reminder.dto';

@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}
  @UseGuards(JwtAuthGuard)
  @Get('global')
  async getGlobalReminder() {
    const message = await this.remindersService.getGlobalReminder();
    Logger.debug("message", message);
    return {
      message,
      hasReminder: message !== null,
    };
  }
  @UseGuards(JwtAuthGuard)
  @Post('global')
  @HttpCode(HttpStatus.CREATED)
  async setGlobalReminder(@Body() body: SetReminderDto) {
    const { message, ttlSeconds = 3600 } = body;
    Logger.debug("message", message);
    await this.remindersService.setGlobalReminder(message, ttlSeconds);
    return {
      success: true,
      message: 'Global reminder set successfully',
    };
  }

  @Get('test-cache')
  async testCache() {
    const result = await this.remindersService.testCache();
    return {
      cacheWorking: result.set && result.get !== null,
      details: result,
    };
  }

  // Endpoints para lembretes por colaborador
  @UseGuards(JwtAuthGuard)
  @Post('collaborator/:idColaborador')
  @HttpCode(HttpStatus.CREATED)
  async setReminderColaborador(
    @Param('idColaborador') idColaborador: string,
    @Body() body: SetReminderDto
  ) {
    const { message, ttlSeconds = 3600 } = body;
    Logger.debug(`Setting reminder for collaborator ${idColaborador}:`, message);
    await this.remindersService.setReminderColaborador(idColaborador, message, ttlSeconds);
    return {
      success: true,
      message: 'Collaborator reminder set successfully',
      idColaborador,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('collaborator/:idColaborador')
  async getReminderColaborador(@Param('idColaborador') idColaborador: string) {
    const message = await this.remindersService.getReminderColaborador(idColaborador);
    Logger.debug(`Getting reminder for collaborator ${idColaborador}:`, message);
    return {
      message,
      hasReminder: message !== null,
      idColaborador,
    };
  }
}
