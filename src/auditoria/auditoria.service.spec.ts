import { Test, TestingModule } from '@nestjs/testing';
import { AuditoriaService } from './auditoria.service';
import { PrismaService } from '../database/prismaService';

describe('AuditoriaService', () => {
  let service: AuditoriaService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditoriaService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuditoriaService>(AuditoriaService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should create a new audit log with all parameters', async () => {
      const logParams = {
        userId: 'user123',
        action: 'CREATE',
        resource: '/api/users',
        details: { name: 'John Doe' },
        ip: '192.168.1.1',
      };

      const expectedResult = {
        id: 1,
        timestamp: new Date(),
        ...logParams,
      };

      mockPrismaService.auditLog.create.mockResolvedValue(expectedResult);

      const result = await service.log(logParams);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: logParams,
      });
      expect(result).toEqual(expectedResult);
    });

    it('should create a new audit log with only required parameters', async () => {
      const logParams = {
        action: 'DELETE',
        resource: '/api/products',
      };

      const expectedResult = {
        id: 2,
        timestamp: new Date(),
        userId: undefined,
        details: undefined,
        ip: undefined,
        ...logParams,
      };

      mockPrismaService.auditLog.create.mockResolvedValue(expectedResult);

      const result = await service.log(logParams);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: undefined,
          action: 'DELETE',
          resource: '/api/products',
          details: undefined,
          ip: undefined,
        },
      });
      expect(result).toEqual(expectedResult);
    });

    it('should handle errors when creating audit log', async () => {
      const logParams = {
        action: 'UPDATE',
        resource: '/api/orders',
      };

      const error = new Error('Database connection failed');
      mockPrismaService.auditLog.create.mockRejectedValue(error);

      await expect(service.log(logParams)).rejects.toThrow('Database connection failed');
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: undefined,
          action: 'UPDATE',
          resource: '/api/orders',
          details: undefined,
          ip: undefined,
        },
      });
    });
  });

  describe('getLogs', () => {
    it('should return filtered logs with all filters', async () => {
      const filters = {
        userId: 'user123',
        action: 'CREATE',
        resource: '/api/users',
      };

      const expectedLogs = [
        {
          id: 1,
          userId: 'user123',
          action: 'CREATE',
          resource: '/api/users',
          timestamp: new Date(),
        },
        {
          id: 2,
          userId: 'user123',
          action: 'CREATE',
          resource: '/api/users',
          timestamp: new Date(),
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(expectedLogs);

      const result = await service.getLogs(filters);

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user123',
          action: 'CREATE',
          resource: '/api/users',
        },
        orderBy: { timestamp: 'desc' },
      });
      expect(result).toEqual(expectedLogs);
    });

    it('should return logs with partial filters', async () => {
      const filters = {
        action: 'DELETE',
      };

      const expectedLogs = [
        {
          id: 3,
          userId: 'user456',
          action: 'DELETE',
          resource: '/api/products',
          timestamp: new Date(),
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(expectedLogs);

      const result = await service.getLogs(filters);

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          action: 'DELETE',
        },
        orderBy: { timestamp: 'desc' },
      });
      expect(result).toEqual(expectedLogs);
    });

    it('should return all logs when no filters provided', async () => {
      const filters = {};

      const expectedLogs = [
        {
          id: 1,
          userId: 'user123',
          action: 'CREATE',
          resource: '/api/users',
          timestamp: new Date(),
        },
        {
          id: 2,
          userId: 'user456',
          action: 'DELETE',
          resource: '/api/products',
          timestamp: new Date(),
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(expectedLogs);

      const result = await service.getLogs(filters);

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { timestamp: 'desc' },
      });
      expect(result).toEqual(expectedLogs);
    });

    it('should handle errors when fetching logs', async () => {
      const filters = { action: 'UPDATE' };
      const error = new Error('Database query failed');

      mockPrismaService.auditLog.findMany.mockRejectedValue(error);

      await expect(service.getLogs(filters)).rejects.toThrow('Database query failed');
    });
  });

  describe('getLogsPaginacao', () => {
    const mockLogsFromDb = [
      {
        id: 1,
        timestamp: new Date('2025-01-15T10:00:00Z'),
        action: 'CREATE',
        resource: '/api/users',
        user: { email: 'admin@example.com' },
      },
      {
        id: 2,
        timestamp: new Date('2025-01-15T11:00:00Z'),
        action: 'UPDATE',
        resource: '/api/products',
        user: { email: 'user@example.com' },
      },
      {
        id: 3,
        timestamp: new Date('2025-01-15T12:00:00Z'),
        action: 'DELETE',
        resource: '/api/orders',
        user: null,
      },
    ];

    it('should return paginated logs with both inicio and fim', async () => {
      const inicio = 5;
      const fim = 10;

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogsFromDb);

      const result = await service.getLogsPaginacao(inicio, fim);

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        skip: 5,
        take: 5,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      });

      expect(result).toEqual({
        logs: [
          {
            dataHora: new Date('2025-01-15T10:00:00Z'),
            usuario: 'admin@example.com',
            acao: 'CREATE',
            endpoint: '/api/users',
          },
          {
            dataHora: new Date('2025-01-15T11:00:00Z'),
            usuario: 'user@example.com',
            acao: 'UPDATE',
            endpoint: '/api/products',
          },
          {
            dataHora: new Date('2025-01-15T12:00:00Z'),
            usuario: 'Sistema',
            acao: 'DELETE',
            endpoint: '/api/orders',
          },
        ],
      });
    });

    it('should return paginated logs with only inicio (take undefined)', async () => {
      const inicio = 10;

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogsFromDb);

      const result = await service.getLogsPaginacao(inicio);

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        skip: 10,
        take: undefined,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      });

      expect(result.logs).toHaveLength(3);
    });

    it('should return logs starting from index 0', async () => {
      const inicio = 0;
      const fim = 2;

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogsFromDb.slice(0, 2));

      const result = await service.getLogsPaginacao(inicio, fim);

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 2,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      });

      expect(result.logs).toHaveLength(2);
    });

    it('should handle logs without user (show "Sistema")', async () => {
      const logsWithoutUser = [
        {
          id: 1,
          timestamp: new Date('2025-01-15T10:00:00Z'),
          action: 'SYSTEM_UPDATE',
          resource: '/api/system',
          user: null,
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(logsWithoutUser);

      const result = await service.getLogsPaginacao(0, 1);

      expect(result.logs[0].usuario).toBe('Sistema');
    });

    it('should handle logs with user having no email', async () => {
      const logsWithUserNoEmail = [
        {
          id: 1,
          timestamp: new Date('2025-01-15T10:00:00Z'),
          action: 'CREATE',
          resource: '/api/users',
          user: {},
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(logsWithUserNoEmail);

      const result = await service.getLogsPaginacao(0, 1);

      expect(result.logs[0].usuario).toBe('Sistema');
    });

    it('should handle empty result set', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      const result = await service.getLogsPaginacao(100, 110);

      expect(result.logs).toEqual([]);
    });

    it('should handle errors when fetching paginated logs', async () => {
      const error = new Error('Database pagination failed');
      mockPrismaService.auditLog.findMany.mockRejectedValue(error);

      await expect(service.getLogsPaginacao(0, 10)).rejects.toThrow('Database pagination failed');
    });

    it('should calculate correct take value for different ranges', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      // Test various ranges
      await service.getLogsPaginacao(0, 50);
      expect(mockPrismaService.auditLog.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ skip: 0, take: 50 })
      );

      await service.getLogsPaginacao(25, 100);
      expect(mockPrismaService.auditLog.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ skip: 25, take: 75 })
      );

      await service.getLogsPaginacao(10);
      expect(mockPrismaService.auditLog.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ skip: 10, take: undefined })
      );
    });
  });
});
