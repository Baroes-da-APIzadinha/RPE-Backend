import { Controller, Get, Post, Body, HttpCode, HttpStatus, Logger, UseGuards } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
  async setGlobalReminder(
    @Body() body: { message: string; ttlSeconds?: number }
  ) {
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
}
