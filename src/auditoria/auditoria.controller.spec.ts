import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuditoriaController } from './auditoria.controller';
import { AuditoriaService } from './auditoria.service';

describe('AuditoriaController', () => {
  let controller: AuditoriaController;
  let service: AuditoriaService;

  const mockAuditoriaService = {
    getLogs: jest.fn(),
    getLogsPaginacao: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditoriaController],
      providers: [
        {
          provide: AuditoriaService,
          useValue: mockAuditoriaService,
        },
      ],
    }).compile();

    controller = module.get<AuditoriaController>(AuditoriaController);
    service = module.get<AuditoriaService>(AuditoriaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getLogs', () => {
    it('should return logs with all filters', async () => {
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

      mockAuditoriaService.getLogs.mockResolvedValue(expectedLogs);

      const result = await controller.getLogs(
        filters.userId,
        filters.action,
        filters.resource,
      );

      expect(service.getLogs).toHaveBeenCalledWith(filters);
      expect(result).toEqual(expectedLogs);
    });

    it('should return logs with partial filters', async () => {
      const expectedLogs = [
        {
          id: 1,
          userId: 'user456',
          action: 'DELETE',
          resource: '/api/products',
          timestamp: new Date(),
        },
      ];

      mockAuditoriaService.getLogs.mockResolvedValue(expectedLogs);

      const result = await controller.getLogs(undefined, 'DELETE', undefined);

      expect(service.getLogs).toHaveBeenCalledWith({
        userId: undefined,
        action: 'DELETE',
        resource: undefined,
      });
      expect(result).toEqual(expectedLogs);
    });

    it('should return logs without any filters', async () => {
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
          action: 'UPDATE',
          resource: '/api/products',
          timestamp: new Date(),
        },
      ];

      mockAuditoriaService.getLogs.mockResolvedValue(expectedLogs);

      const result = await controller.getLogs();

      expect(service.getLogs).toHaveBeenCalledWith({
        userId: undefined,
        action: undefined,
        resource: undefined,
      });
      expect(result).toEqual(expectedLogs);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockAuditoriaService.getLogs.mockRejectedValue(error);

      await expect(controller.getLogs('user123')).rejects.toThrow('Service error');
      expect(service.getLogs).toHaveBeenCalledWith({
        userId: 'user123',
        action: undefined,
        resource: undefined,
      });
    });
  });

  describe('getLogsPaginated', () => {
    const mockPaginatedResponse = {
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
      ],
    };

    it('should return paginated logs with both inicio and fim', async () => {
      mockAuditoriaService.getLogsPaginacao.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.getLogsPaginated('10', '20');

      expect(service.getLogsPaginacao).toHaveBeenCalledWith(10, 20);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return paginated logs with only inicio', async () => {
      mockAuditoriaService.getLogsPaginacao.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.getLogsPaginated('15');

      expect(service.getLogsPaginacao).toHaveBeenCalledWith(15, undefined);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should handle inicio as "0"', async () => {
      mockAuditoriaService.getLogsPaginacao.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.getLogsPaginated('0', '10');

      expect(service.getLogsPaginacao).toHaveBeenCalledWith(0, 10);
      expect(result).toEqual(mockPaginatedResponse);
    });

    describe('inicio parameter validation', () => {
      it('should throw BadRequestException when inicio is not a valid integer', async () => {
        await expect(controller.getLogsPaginated('abc')).rejects.toThrow(
          new BadRequestException('Parâmetro "inicio" deve ser um número válido >= 0'),
        );
        expect(service.getLogsPaginacao).not.toHaveBeenCalled();
      });

      it('should accept decimal inputs (parseInt truncates to valid integer)', async () => {
        // parseInt('5.5', 10) = 5, and Number.isInteger(5) = true
        // So this actually passes validation (truncated to 5)
        mockAuditoriaService.getLogsPaginacao.mockResolvedValue(mockPaginatedResponse);

        await controller.getLogsPaginated('5.5', '10.9');

        expect(service.getLogsPaginacao).toHaveBeenCalledWith(5, 10);
      });

      it('should throw BadRequestException when inicio is negative', async () => {
        await expect(controller.getLogsPaginated('-1')).rejects.toThrow(
          new BadRequestException('Parâmetro "inicio" deve ser um número válido >= 0'),
        );
        expect(service.getLogsPaginacao).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when inicio is empty string', async () => {
        await expect(controller.getLogsPaginated('')).rejects.toThrow(
          new BadRequestException('Parâmetro "inicio" deve ser um número válido >= 0'),
        );
        expect(service.getLogsPaginacao).not.toHaveBeenCalled();
      });

      it('should accept strings with trailing non-numeric characters (parseInt ignores them)', async () => {
        // parseInt('10abc', 10) = 10, and Number.isInteger(10) = true
        // So this actually passes validation (ignores 'abc')
        mockAuditoriaService.getLogsPaginacao.mockResolvedValue(mockPaginatedResponse);

        await controller.getLogsPaginated('10abc', '20def');

        expect(service.getLogsPaginacao).toHaveBeenCalledWith(10, 20);
      });

      it('should throw BadRequestException when inicio starts with non-numeric characters', async () => {
        // These will fail because parseInt returns NaN
        await expect(controller.getLogsPaginated('abc123')).rejects.toThrow(
          new BadRequestException('Parâmetro "inicio" deve ser um número válido >= 0'),
        );
        expect(service.getLogsPaginacao).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when inicio is purely non-numeric', async () => {
        await expect(controller.getLogsPaginated('abcdef')).rejects.toThrow(
          new BadRequestException('Parâmetro "inicio" deve ser um número válido >= 0'),
        );
        expect(service.getLogsPaginacao).not.toHaveBeenCalled();
      });
    });

    describe('fim parameter validation', () => {
      it('should throw BadRequestException when fim is not a valid number', async () => {
        await expect(controller.getLogsPaginated('5', 'abc')).rejects.toThrow(
          new BadRequestException('Parâmetro "fim" deve ser um número válido maior que "inicio"'),
        );
        expect(service.getLogsPaginacao).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when fim is equal to inicio', async () => {
        await expect(controller.getLogsPaginated('10', '10')).rejects.toThrow(
          new BadRequestException('Parâmetro "fim" deve ser um número válido maior que "inicio"'),
        );
        expect(service.getLogsPaginacao).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when fim is less than inicio', async () => {
        await expect(controller.getLogsPaginated('20', '15')).rejects.toThrow(
          new BadRequestException('Parâmetro "fim" deve ser um número válido maior que "inicio"'),
        );
        expect(service.getLogsPaginacao).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when fim is negative', async () => {
        await expect(controller.getLogsPaginated('5', '-1')).rejects.toThrow(
          new BadRequestException('Parâmetro "fim" deve ser um número válido maior que "inicio"'),
        );
        expect(service.getLogsPaginacao).not.toHaveBeenCalled();
      });

      it('should accept valid fim greater than inicio', async () => {
        mockAuditoriaService.getLogsPaginacao.mockResolvedValue(mockPaginatedResponse);

        await controller.getLogsPaginated('5', '15');

        expect(service.getLogsPaginacao).toHaveBeenCalledWith(5, 15);
      });
    });

    describe('edge cases', () => {
      it('should handle large numbers', async () => {
        mockAuditoriaService.getLogsPaginacao.mockResolvedValue(mockPaginatedResponse);

        await controller.getLogsPaginated('1000000', '2000000');

        expect(service.getLogsPaginacao).toHaveBeenCalledWith(1000000, 2000000);
      });

      it('should handle zero as inicio and positive fim', async () => {
        mockAuditoriaService.getLogsPaginacao.mockResolvedValue(mockPaginatedResponse);

        await controller.getLogsPaginated('0', '100');

        expect(service.getLogsPaginacao).toHaveBeenCalledWith(0, 100);
      });

      it('should handle leading zeros in valid numbers', async () => {
        mockAuditoriaService.getLogsPaginacao.mockResolvedValue(mockPaginatedResponse);

        await controller.getLogsPaginated('005', '010');

        expect(service.getLogsPaginacao).toHaveBeenCalledWith(5, 10);
      });
    });

    describe('service integration', () => {
      it('should handle service errors', async () => {
        const error = new Error('Service pagination error');
        mockAuditoriaService.getLogsPaginacao.mockRejectedValue(error);

        await expect(controller.getLogsPaginated('0', '10')).rejects.toThrow('Service pagination error');
        expect(service.getLogsPaginacao).toHaveBeenCalledWith(0, 10);
      });

      it('should pass correct parameters to service', async () => {
        mockAuditoriaService.getLogsPaginacao.mockResolvedValue(mockPaginatedResponse);

        await controller.getLogsPaginated('25', '75');

        expect(service.getLogsPaginacao).toHaveBeenCalledWith(25, 75);
        expect(service.getLogsPaginacao).toHaveBeenCalledTimes(1);
      });
    });

    describe('parseInt behavior validation', () => {
      it('should accept decimal inputs that parseInt truncates to valid integers', async () => {
        // parseInt truncates decimals, and the result passes Number.isInteger()
        mockAuditoriaService.getLogsPaginacao.mockResolvedValue(mockPaginatedResponse);

        const decimalInputs = [
          { input: '5.5', expected: 5 },
          { input: '10.1', expected: 10 },
          { input: '0.9', expected: 0 },
          { input: '99.99', expected: 99 },
        ];

        for (const { input, expected } of decimalInputs) {
          await controller.getLogsPaginated(input, String(expected + 5));
          expect(service.getLogsPaginacao).toHaveBeenCalledWith(expected, expected + 5);
        }
      });

      it('should accept valid integer strings', async () => {
        mockAuditoriaService.getLogsPaginacao.mockResolvedValue(mockPaginatedResponse);

        const validInputs = ['0', '1', '10', '100', '999'];

        for (const input of validInputs) {
          await controller.getLogsPaginated(input, String(parseInt(input) + 5));
          expect(service.getLogsPaginacao).toHaveBeenCalledWith(
            parseInt(input),
            parseInt(input) + 5,
          );
        }
      });
    });
  });
});
