// src/reminders/reminders.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class RemindersService {
  constructor(@Inject('CACHE_MANAGER') private cacheManager: Cache) {}

  private globalKey = 'global:reminder';

  async setGlobalReminder(message: string, ttlSeconds: number = 3600): Promise<void> {
    await this.cacheManager.set(this.globalKey, message, ttlSeconds );
  }

  async getGlobalReminder(): Promise<string | null> {
    const result = await this.cacheManager.get<string>(this.globalKey);
    return result === undefined ? null : result;
  }

  async clearGlobalReminder(): Promise<void> {
    await this.cacheManager.del(this.globalKey);
  }
}