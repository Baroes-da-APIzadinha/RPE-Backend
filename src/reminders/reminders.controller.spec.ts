import { Test, TestingModule } from '@nestjs/testing';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';

describe('RemindersController', () => {
  let controller: RemindersController;

  const mockRemindersService = {
    getGlobalReminder: jest.fn(),
    setGlobalReminder: jest.fn(),
    clearGlobalReminder: jest.fn(),
    getReminderColaborador: jest.fn(),
    setReminderColaborador: jest.fn(),
    testCache: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RemindersController],
      providers: [
        {
          provide: RemindersService,
          useValue: mockRemindersService,
        },
      ],
    }).compile();

    controller = module.get<RemindersController>(RemindersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getGlobalReminder', () => {
    it('should return global reminder', async () => {
      mockRemindersService.getGlobalReminder.mockResolvedValueOnce('mensagem global');
      const result = await controller.getGlobalReminder();
      expect(result).toEqual({ message: 'mensagem global', hasReminder: true });
      expect(mockRemindersService.getGlobalReminder).toHaveBeenCalled();
    });
    it('should return hasReminder false if no reminder', async () => {
      mockRemindersService.getGlobalReminder.mockResolvedValueOnce(null);
      const result = await controller.getGlobalReminder();
      expect(result).toEqual({ message: null, hasReminder: false });
    });
  });

  describe('setGlobalReminder', () => {
    it('should set global reminder', async () => {
      mockRemindersService.setGlobalReminder.mockResolvedValueOnce(undefined);
      const body = { message: 'mensagem global', ttlSeconds: 120 };
      const result = await controller.setGlobalReminder(body);
      expect(result).toEqual({ success: true, message: 'Global reminder set successfully' });
      expect(mockRemindersService.setGlobalReminder).toHaveBeenCalledWith('mensagem global', 120);
    });
    it('should use default ttlSeconds if not provided', async () => {
      mockRemindersService.setGlobalReminder.mockResolvedValueOnce(undefined);
      const body = { message: 'mensagem global' };
      const result = await controller.setGlobalReminder(body);
      expect(result).toEqual({ success: true, message: 'Global reminder set successfully' });
      expect(mockRemindersService.setGlobalReminder).toHaveBeenCalledWith('mensagem global', 3600);
    });
  });

  describe('testCache', () => {
    it('should return cache test result', async () => {
      mockRemindersService.testCache.mockResolvedValueOnce({ set: true, get: 'test' });
      const result = await controller.testCache();
      expect(result).toEqual({ cacheWorking: true, details: { set: true, get: 'test' } });
      expect(mockRemindersService.testCache).toHaveBeenCalled();
    });
    it('should return cacheWorking false if not working', async () => {
      mockRemindersService.testCache.mockResolvedValueOnce({ set: false, get: null });
      const result = await controller.testCache();
      expect(result).toEqual({ cacheWorking: false, details: { set: false, get: null } });
    });
  });

  describe('setReminderColaborador', () => {
    it('should set reminder for collaborator', async () => {
      mockRemindersService.setReminderColaborador.mockResolvedValueOnce(undefined);
      const body = { message: 'mensagem colaborador', ttlSeconds: 100 };
      const result = await controller.setReminderColaborador('abc', body);
      expect(result).toEqual({ success: true, message: 'Collaborator reminder set successfully', idColaborador: 'abc' });
      expect(mockRemindersService.setReminderColaborador).toHaveBeenCalledWith('abc', 'mensagem colaborador', 100);
    });
    it('should use default ttlSeconds if not provided', async () => {
      mockRemindersService.setReminderColaborador.mockResolvedValueOnce(undefined);
      const body = { message: 'mensagem colaborador' };
      const result = await controller.setReminderColaborador('abc', body);
      expect(result).toEqual({ success: true, message: 'Collaborator reminder set successfully', idColaborador: 'abc' });
      expect(mockRemindersService.setReminderColaborador).toHaveBeenCalledWith('abc', 'mensagem colaborador', 3600);
    });
  });

  describe('getReminderColaborador', () => {
    it('should get reminder for collaborator', async () => {
      mockRemindersService.getReminderColaborador.mockResolvedValueOnce('mensagem colaborador');
      const result = await controller.getReminderColaborador('abc');
      expect(result).toEqual({ message: 'mensagem colaborador', hasReminder: true, idColaborador: 'abc' });
      expect(mockRemindersService.getReminderColaborador).toHaveBeenCalledWith('abc');
    });
    it('should return hasReminder false if no reminder', async () => {
      mockRemindersService.getReminderColaborador.mockResolvedValueOnce(null);
      const result = await controller.getReminderColaborador('abc');
      expect(result).toEqual({ message: null, hasReminder: false, idColaborador: 'abc' });
    });
  });
});
