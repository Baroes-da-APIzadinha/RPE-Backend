// src/reminders/reminders.service.ts
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { PrismaService } from '../database/prismaService';

@Injectable()
export class RemindersService {
  constructor(
    @Inject('CACHE_MANAGER') private cacheManager: Cache,
    private readonly prisma: PrismaService
  ) {}

  private globalKey = 'global:reminder';

  async setGlobalReminder(message: string, ttlSeconds: number = 3600): Promise<void> {
    try {
      // Alguns cache managers esperam TTL em milissegundos
      const ttlMs = ttlSeconds * 1000;
      await this.cacheManager.set(this.globalKey, message, ttlMs);
      console.log(`Reminder salvo: "${message}" com TTL: ${ttlSeconds}s`);
      
      // Verificar se foi salvo corretamente
      const verification = await this.cacheManager.get<string>(this.globalKey);
      console.log(`Verificação após salvar: "${verification}"`);
    } catch (error) {
      console.error('Erro ao salvar reminder:', error);
      throw error;
    }
  }

  async getGlobalReminder(): Promise<string | null> {
    try {
      const result = await this.cacheManager.get<string>(this.globalKey);
      console.log(`Reminder recuperado: "${result}"`);
      return result || null;
    } catch (error) {
      console.error('Erro ao recuperar reminder:', error);
      return null;
    }
  }

  async clearGlobalReminder(): Promise<void> {
    await this.cacheManager.del(this.globalKey);
  }

  // Método para debug - verificar se o cache está funcionando
  async testCache(): Promise<{ set: boolean; get: string | null }> {
    const testKey = 'test:key';
    const testValue = 'test:value';
    
    try {
      await this.cacheManager.set(testKey, testValue, 60000); // 1 minuto
      const retrieved = await this.cacheManager.get<string>(testKey);
      await this.cacheManager.del(testKey);
      
      return {
        set: true,
        get: retrieved || null
      };
    } catch (error) {
      console.error('Erro no teste de cache:', error);
      return {
        set: false,
        get: null
      };
    }
  }

  // Métodos para lembretes por colaborador
  async setReminderColaborador(idColaborador: string, message: string, ttlSeconds: number = 3600): Promise<void> {
    try {
      // Validar se o colaborador existe
      const colaborador = await this.prisma.colaborador.findUnique({
        where: { idColaborador },
      });

      if (!colaborador) {
        throw new NotFoundException(`Colaborador com ID ${idColaborador} não encontrado`);
      }

      const collaboratorKey = `collaborator:${idColaborador}:reminder`;
      const ttlMs = ttlSeconds * 1000;
      await this.cacheManager.set(collaboratorKey, message, ttlMs);
      console.log(`Reminder salvo para colaborador ${idColaborador}: "${message}" com TTL: ${ttlSeconds}s`);
      
      // Verificar se foi salvo corretamente
      const verification = await this.cacheManager.get<string>(collaboratorKey);
      console.log(`Verificação após salvar para colaborador ${idColaborador}: "${verification}"`);
    } catch (error) {
      console.error(`Erro ao salvar reminder para colaborador ${idColaborador}:`, error);
      throw error;
    }
  }

  async getReminderColaborador(idColaborador: string): Promise<string | null> {
    try {
      const collaboratorKey = `collaborator:${idColaborador}:reminder`;
      const result = await this.cacheManager.get<string>(collaboratorKey);
      console.log(`Reminder recuperado para colaborador ${idColaborador}: "${result}"`);
      
      // Apagar o reminder do cache após a leitura
      if (result) {
        await this.cacheManager.del(collaboratorKey);
        console.log(`Reminder apagado do cache para colaborador ${idColaborador}`);
      }
      
      return result || null;
    } catch (error) {
      console.error(`Erro ao recuperar reminder para colaborador ${idColaborador}:`, error);
      return null;
    }
  }
}