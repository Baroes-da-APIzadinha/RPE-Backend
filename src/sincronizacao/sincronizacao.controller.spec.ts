import { Test, TestingModule } from '@nestjs/testing';
import { SincronizacaoController } from './sincronizacao.controller';
import { SincronizacaoService } from './sincronizacao.service';

describe('SincronizacaoController', () => {
  let controller: SincronizacaoController;
  let sincronizacaoService: SincronizacaoService;

  // Mock do SincronizacaoService
  const mockSincronizacaoService = {
    dispararSincronizacaoManual: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SincronizacaoController],
      providers: [
        {
          provide: SincronizacaoService,
          useValue: mockSincronizacaoService,
        },
      ],
    }).compile();

    controller = module.get<SincronizacaoController>(SincronizacaoController);
    sincronizacaoService = module.get<SincronizacaoService>(SincronizacaoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Definição do controller', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('deve ter SincronizacaoService injetado', () => {
      expect(sincronizacaoService).toBeDefined();
    });
  });

  describe('POST /sincronizacao - triggerSincronizacao', () => {
    it('deve executar sincronização manual com sucesso', async () => {
      // Arrange
      const expectedResult = {
        message: 'Sincronização completa com o ERP concluída com sucesso!',
        colaboradores: 5,
        projetos: 3,
        alocacoes: 8,
      };

      mockSincronizacaoService.dispararSincronizacaoManual.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.triggerSincronizacao();

      // Assert
      expect(mockSincronizacaoService.dispararSincronizacaoManual).toHaveBeenCalledTimes(1);
      expect(mockSincronizacaoService.dispararSincronizacaoManual).toHaveBeenCalledWith();
      expect(result).toEqual(expectedResult);
    });

    it('deve retornar dados de sincronização com zero registros', async () => {
      // Arrange
      const expectedResult = {
        message: 'Sincronização completa com o ERP concluída com sucesso!',
        colaboradores: 0,
        projetos: 0,
        alocacoes: 0,
      };

      mockSincronizacaoService.dispararSincronizacaoManual.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.triggerSincronizacao();

      // Assert
      expect(result).toEqual(expectedResult);
      expect(result.colaboradores).toBe(0);
      expect(result.projetos).toBe(0);
      expect(result.alocacoes).toBe(0);
    });

    it('deve propagar erro do service quando sincronização falha', async () => {
      // Arrange
      const serviceError = new Error('Falha na comunicação com o ERP');
      mockSincronizacaoService.dispararSincronizacaoManual.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.triggerSincronizacao()).rejects.toThrow(serviceError);
      expect(mockSincronizacaoService.dispararSincronizacaoManual).toHaveBeenCalledTimes(1);
    });

    it('deve propagar erro de timeout do service', async () => {
      // Arrange
      const timeoutError = new Error('Request timeout');
      mockSincronizacaoService.dispararSincronizacaoManual.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(controller.triggerSincronizacao()).rejects.toThrow('Request timeout');
    });

    it('deve propagar erro de conexão com banco de dados', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockSincronizacaoService.dispararSincronizacaoManual.mockRejectedValue(dbError);

      // Act & Assert
      await expect(controller.triggerSincronizacao()).rejects.toThrow('Database connection failed');
    });

    it('deve chamar o service apenas uma vez por requisição', async () => {
      // Arrange
      const expectedResult = {
        message: 'Sincronização completa com o ERP concluída com sucesso!',
        colaboradores: 2,
        projetos: 1,
        alocacoes: 3,
      };

      mockSincronizacaoService.dispararSincronizacaoManual.mockResolvedValue(expectedResult);

      // Act
      await controller.triggerSincronizacao();
      await controller.triggerSincronizacao();
      await controller.triggerSincronizacao();

      // Assert
      expect(mockSincronizacaoService.dispararSincronizacaoManual).toHaveBeenCalledTimes(3);
    });
  });

  describe('Validações de integração', () => {
    it('deve manter a estrutura esperada do retorno', async () => {
      // Arrange
      const expectedResult = {
        message: 'Sincronização completa com o ERP concluída com sucesso!',
        colaboradores: 10,
        projetos: 5,
        alocacoes: 15,
      };

      mockSincronizacaoService.dispararSincronizacaoManual.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.triggerSincronizacao();

      // Assert
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('colaboradores');
      expect(result).toHaveProperty('projetos');
      expect(result).toHaveProperty('alocacoes');

      expect(typeof result.message).toBe('string');
      expect(typeof result.colaboradores).toBe('number');
      expect(typeof result.projetos).toBe('number');
      expect(typeof result.alocacoes).toBe('number');

      expect(result.colaboradores).toBeGreaterThanOrEqual(0);
      expect(result.projetos).toBeGreaterThanOrEqual(0);
      expect(result.alocacoes).toBeGreaterThanOrEqual(0);
    });

    it('deve aceitar diferentes cenários de quantidade de dados', async () => {
      // Arrange
      const cenarios = [
        { colaboradores: 0, projetos: 0, alocacoes: 0 },
        { colaboradores: 1, projetos: 0, alocacoes: 0 },
        { colaboradores: 0, projetos: 1, alocacoes: 0 },
        { colaboradores: 0, projetos: 0, alocacoes: 1 },
        { colaboradores: 100, projetos: 50, alocacoes: 200 },
      ];

      for (const cenario of cenarios) {
        // Arrange
        const expectedResult = {
          message: 'Sincronização completa com o ERP concluída com sucesso!',
          ...cenario,
        };

        mockSincronizacaoService.dispararSincronizacaoManual.mockResolvedValue(expectedResult);

        // Act
        const result = await controller.triggerSincronizacao();

        // Assert
        expect(result.colaboradores).toBe(cenario.colaboradores);
        expect(result.projetos).toBe(cenario.projetos);
        expect(result.alocacoes).toBe(cenario.alocacoes);

        // Reset mock for next iteration
        mockSincronizacaoService.dispararSincronizacaoManual.mockReset();
      }
    });
  });

  describe('Tratamento de erros específicos', () => {
    it('deve tratar erro de validação do service', async () => {
      // Arrange
      const validationError = new Error('Dados inválidos recebidos do ERP');
      mockSincronizacaoService.dispararSincronizacaoManual.mockRejectedValue(validationError);

      // Act & Assert
      await expect(controller.triggerSincronizacao()).rejects.toThrow('Dados inválidos recebidos do ERP');
    });

    it('deve tratar erro de rede/HTTP', async () => {
      // Arrange
      const networkError = new Error('Network Error: ECONNREFUSED');
      mockSincronizacaoService.dispararSincronizacaoManual.mockRejectedValue(networkError);

      // Act & Assert
      await expect(controller.triggerSincronizacao()).rejects.toThrow('Network Error: ECONNREFUSED');
    });

    it('deve tratar erro de constraint do banco', async () => {
      // Arrange
      const constraintError = new Error('Unique constraint violation');
      mockSincronizacaoService.dispararSincronizacaoManual.mockRejectedValue(constraintError);

      // Act & Assert
      await expect(controller.triggerSincronizacao()).rejects.toThrow('Unique constraint violation');
    });

    it('deve tratar erro genérico', async () => {
      // Arrange
      const genericError = new Error('Erro inesperado');
      mockSincronizacaoService.dispararSincronizacaoManual.mockRejectedValue(genericError);

      // Act & Assert
      await expect(controller.triggerSincronizacao()).rejects.toThrow('Erro inesperado');
    });
  });

  describe('Cenários de performance e concorrência', () => {
    it('deve permitir chamadas simultâneas', async () => {
      // Arrange
      const expectedResult = {
        message: 'Sincronização completa com o ERP concluída com sucesso!',
        colaboradores: 3,
        projetos: 2,
        alocacoes: 5,
      };

      mockSincronizacaoService.dispararSincronizacaoManual.mockResolvedValue(expectedResult);

      // Act - Executa 3 chamadas simultâneas
      const promises = [
        controller.triggerSincronizacao(),
        controller.triggerSincronizacao(),
        controller.triggerSincronizacao(),
      ];

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toEqual(expectedResult);
      });

      expect(mockSincronizacaoService.dispararSincronizacaoManual).toHaveBeenCalledTimes(3);
    });

    it('deve tratar falha parcial em chamadas simultâneas', async () => {
      // Arrange
      const successResult = {
        message: 'Sincronização completa com o ERP concluída com sucesso!',
        colaboradores: 2,
        projetos: 1,
        alocacoes: 3,
      };

      const error = new Error('Falha na sincronização');

      mockSincronizacaoService.dispararSincronizacaoManual
        .mockResolvedValueOnce(successResult)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(successResult);

      // Act
      const promises = [
        controller.triggerSincronizacao(),
        controller.triggerSincronizacao(),
        controller.triggerSincronizacao(),
      ];

      const results = await Promise.allSettled(promises);

      // Assert
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');

      if (results[0].status === 'fulfilled') {
        expect(results[0].value).toEqual(successResult);
      }

      if (results[1].status === 'rejected') {
        expect(results[1].reason).toEqual(error);
      }

      if (results[2].status === 'fulfilled') {
        expect(results[2].value).toEqual(successResult);
      }
    });
  });

  describe('Validações de contrato da API', () => {
    it('deve retornar a mensagem correta de sucesso', async () => {
      // Arrange
      const expectedResult = {
        message: 'Sincronização completa com o ERP concluída com sucesso!',
        colaboradores: 7,
        projetos: 4,
        alocacoes: 12,
      };

      mockSincronizacaoService.dispararSincronizacaoManual.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.triggerSincronizacao();

      // Assert
      expect(result.message).toBe('Sincronização completa com o ERP concluída com sucesso!');
    });

    it('deve retornar números válidos para contadores', async () => {
      // Arrange
      const expectedResult = {
        message: 'Sincronização completa com o ERP concluída com sucesso!',
        colaboradores: 25,
        projetos: 8,
        alocacoes: 45,
      };

      mockSincronizacaoService.dispararSincronizacaoManual.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.triggerSincronizacao();

      // Assert
      expect(Number.isInteger(result.colaboradores)).toBe(true);
      expect(Number.isInteger(result.projetos)).toBe(true);
      expect(Number.isInteger(result.alocacoes)).toBe(true);

      expect(result.colaboradores).toBeGreaterThanOrEqual(0);
      expect(result.projetos).toBeGreaterThanOrEqual(0);
      expect(result.alocacoes).toBeGreaterThanOrEqual(0);
    });
  });
});
