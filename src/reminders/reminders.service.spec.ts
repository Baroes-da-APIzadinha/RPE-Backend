import { Test, TestingModule } from '@nestjs/testing';
import { RemindersService } from './reminders.service';
import { PrismaService } from '../database/prismaService';

describe('RemindersService', () => {
  let service: RemindersService;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockPrismaService = {
    colaborador: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemindersService,
        {
          provide: 'CACHE_MANAGER',
          useValue: mockCacheManager,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RemindersService>(RemindersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setGlobalReminder', () => {
    it('should set and verify global reminder', async () => {
      mockCacheManager.set.mockResolvedValueOnce(undefined);
      mockCacheManager.get.mockResolvedValueOnce('mensagem global');
      await service.setGlobalReminder('mensagem global', 10);
      expect(mockCacheManager.set).toHaveBeenCalledWith('global:reminder', 'mensagem global', 10000);
      expect(mockCacheManager.get).toHaveBeenCalledWith('global:reminder');
    });

    it('should throw error if cache fails', async () => {
      mockCacheManager.set.mockRejectedValueOnce(new Error('fail'));
      await expect(service.setGlobalReminder('msg', 1)).rejects.toThrow('fail');
    });
  });

  describe('getGlobalReminder', () => {
    it('should get global reminder', async () => {
      mockCacheManager.get.mockResolvedValueOnce('mensagem global');
      const result = await service.getGlobalReminder();
      expect(result).toBe('mensagem global');
      expect(mockCacheManager.get).toHaveBeenCalledWith('global:reminder');
    });

    it('should return null if cache fails', async () => {
      mockCacheManager.get.mockRejectedValueOnce(new Error('fail'));
      const result = await service.getGlobalReminder();
      expect(result).toBeNull();
    });
  });

  describe('clearGlobalReminder', () => {
    it('should clear global reminder', async () => {
      mockCacheManager.del.mockResolvedValueOnce(undefined);
      await service.clearGlobalReminder();
      expect(mockCacheManager.del).toHaveBeenCalledWith('global:reminder');
    });
  });

  describe('testCache', () => {
    it('should test cache set/get/del', async () => {
      mockCacheManager.set.mockResolvedValueOnce(undefined);
      mockCacheManager.get.mockResolvedValueOnce('test:value');
      mockCacheManager.del.mockResolvedValueOnce(undefined);
      const result = await service.testCache();
      expect(result).toEqual({ set: true, get: 'test:value' });
      expect(mockCacheManager.set).toHaveBeenCalledWith('test:key', 'test:value', 60000);
      expect(mockCacheManager.get).toHaveBeenCalledWith('test:key');
      expect(mockCacheManager.del).toHaveBeenCalledWith('test:key');
    });

    it('should handle cache error', async () => {
      mockCacheManager.set.mockRejectedValueOnce(new Error('fail'));
      const result = await service.testCache();
      expect(result).toEqual({ set: false, get: null });
    });
  });

  describe('setReminderColaborador', () => {
    it('should set reminder for collaborator', async () => {
      mockPrismaService.colaborador.findUnique.mockResolvedValueOnce({ idColaborador: 'abc' });
      mockCacheManager.set.mockResolvedValueOnce(undefined);
      mockCacheManager.get.mockResolvedValueOnce('mensagem colaborador');
      await service.setReminderColaborador('abc', 'mensagem colaborador', 5);
      expect(mockPrismaService.colaborador.findUnique).toHaveBeenCalledWith({ where: { idColaborador: 'abc' } });
      expect(mockCacheManager.set).toHaveBeenCalledWith('collaborator:abc:reminder', 'mensagem colaborador', 5000);
      expect(mockCacheManager.get).toHaveBeenCalledWith('collaborator:abc:reminder');
    });

    it('should throw NotFoundException if collaborator not found', async () => {
      mockPrismaService.colaborador.findUnique.mockResolvedValueOnce(null);
      await expect(service.setReminderColaborador('notfound', 'msg')).rejects.toThrow('Colaborador com ID notfound não encontrado');
    });

    it('should throw error if cache fails', async () => {
      mockPrismaService.colaborador.findUnique.mockResolvedValueOnce({ idColaborador: 'abc' });
      mockCacheManager.set.mockRejectedValueOnce(new Error('fail'));
      await expect(service.setReminderColaborador('abc', 'msg')).rejects.toThrow('fail');
    });
  });

  describe('getReminderColaborador', () => {
    it('should get and clear reminder for collaborator', async () => {
      mockCacheManager.get.mockResolvedValueOnce('mensagem colaborador');
      mockCacheManager.del.mockResolvedValueOnce(undefined);
      const result = await service.getReminderColaborador('abc');
      expect(result).toBe('mensagem colaborador');
      expect(mockCacheManager.get).toHaveBeenCalledWith('collaborator:abc:reminder');
      expect(mockCacheManager.del).toHaveBeenCalledWith('collaborator:abc:reminder');
    });

    it('should return null if cache fails', async () => {
      mockCacheManager.get.mockRejectedValueOnce(new Error('fail'));
      const result = await service.getReminderColaborador('abc');
      expect(result).toBeNull();
    });
  });
});
