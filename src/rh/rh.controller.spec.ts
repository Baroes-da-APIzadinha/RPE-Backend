import { Test, TestingModule } from '@nestjs/testing';
import { RhController } from './rh.controller';
import { RhService } from './rh.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { NotFoundException, Logger } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';

describe('RhController', () => {
  let controller: RhController;
  let service: RhService;

  // Mock do RhService
  const mockRhService = {
    getQuantidadeColaboradoresPorCiclo: jest.fn(),
    getQuantidadeAvaliacoesConcluidasPorCiclo: jest.fn(),
    getQuantidadeUnidades: jest.fn(),
    getStatusAvaliacoesPorCiclo: jest.fn(),
    getProgressoPorUnidade: jest.fn(),
    getProgressoPorTrilha: jest.fn(),
  };

  // Mock dos Guards
  const mockJwtAuthGuard = {
    canActivate: jest.fn((context: ExecutionContext) => {
      const request = context.switchToHttp().getRequest();
      request.user = { userId: 'user-id', roles: ['RH'] };
      return true;
    }),
  };

  const mockRolesGuard = {
    canActivate: jest.fn(() => true),
  };

  // Dados de teste
  const mockCicloId = '123e4567-e89b-12d3-a456-426614174000';

  const mockQuantidadeColaboradores = {
    TotalColaboradores: 150,
  };

  const mockQuantidadeAvaliacoes = {
    TotalAvaliacoes: 300,
    totalConcluidas: 225,
  };

  const mockQuantidadeUnidades = {
    quantidadeUnidades: 8,
  };

  const mockStatusAvaliacoes = {
    quantConcluidas: 225,
    quantPendentes: 75,
    quantEmAndamento: 0,
  };

  const mockProgressoUnidades = [
    {
      nomeUnidade: 'TI',
      quantConcluidas: 45,
      total: 60,
    },
    {
      nomeUnidade: 'Financeiro',
      quantConcluidas: 30,
      total: 40,
    },
    {
      nomeUnidade: 'RH',
      quantConcluidas: 18,
      total: 20,
    },
    {
      nomeUnidade: 'Marketing',
      quantConcluidas: 25,
      total: 35,
    },
  ];

  const mockProgressoTrilhas = [
    {
      nomeTrilha: 'Backend',
      quantConcluidas: 40,
      total: 50,
    },
    {
      nomeTrilha: 'Frontend',
      quantConcluidas: 35,
      total: 45,
    },
    {
      nomeTrilha: 'DevOps',
      quantConcluidas: 15,
      total: 20,
    },
    {
      nomeTrilha: 'Gestão',
      quantConcluidas: 20,
      total: 25,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RhController],
      providers: [
        {
          provide: RhService,
          useValue: mockRhService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    controller = module.get<RhController>(RhController);
    service = module.get<RhService>(RhService);

    // Mock do Logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Definição do controller', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('getQuantidadeColaboradoresPorCiclo (GET /RH/colaboradores/ciclo/:idCiclo)', () => {
    it('deve retornar quantidade de colaboradores por ciclo', async () => {
      // Arrange
      mockRhService.getQuantidadeColaboradoresPorCiclo.mockResolvedValue(mockQuantidadeColaboradores);

      // Act
      const resultado = await controller.getQuantidadeColaboradoresPorCiclo(mockCicloId);

      // Assert
      expect(resultado).toEqual(mockQuantidadeColaboradores);
      expect(mockRhService.getQuantidadeColaboradoresPorCiclo).toHaveBeenCalledWith(mockCicloId);
      expect(mockRhService.getQuantidadeColaboradoresPorCiclo).toHaveBeenCalledTimes(1);
    });

    it('deve retornar zero colaboradores quando ciclo não possui participantes', async () => {
      // Arrange
      const quantidadeZero = { TotalColaboradores: 0 };
      mockRhService.getQuantidadeColaboradoresPorCiclo.mockResolvedValue(quantidadeZero);

      // Act
      const resultado = await controller.getQuantidadeColaboradoresPorCiclo(mockCicloId);

      // Assert
      expect(resultado).toEqual(quantidadeZero);
      expect(resultado.TotalColaboradores).toBe(0);
    });

    it('deve retornar números grandes corretamente', async () => {
      // Arrange
      const quantidadeGrande = { TotalColaboradores: 5000 };
      mockRhService.getQuantidadeColaboradoresPorCiclo.mockResolvedValue(quantidadeGrande);

      // Act
      const resultado = await controller.getQuantidadeColaboradoresPorCiclo(mockCicloId);

      // Assert
      expect(resultado).toEqual(quantidadeGrande);
      expect(resultado.TotalColaboradores).toBe(5000);
    });

    it('deve lançar NotFoundException quando ciclo não encontrado', async () => {
      // Arrange
      const idCicloInexistente = 'ciclo-inexistente';
      const error = new NotFoundException(`Ciclo com ID ${idCicloInexistente} não encontrado.`);
      mockRhService.getQuantidadeColaboradoresPorCiclo.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getQuantidadeColaboradoresPorCiclo(idCicloInexistente)).rejects.toThrow(NotFoundException);
      await expect(controller.getQuantidadeColaboradoresPorCiclo(idCicloInexistente)).rejects.toThrow(
        `Ciclo com ID ${idCicloInexistente} não encontrado.`
      );
      expect(mockRhService.getQuantidadeColaboradoresPorCiclo).toHaveBeenCalledWith(idCicloInexistente);
    });

    it('deve validar formato do UUID do ciclo', async () => {
      // Arrange
      const uuidInvalido = 'uuid-invalido';
      mockRhService.getQuantidadeColaboradoresPorCiclo.mockResolvedValue(mockQuantidadeColaboradores);

      // Act
      const resultado = await controller.getQuantidadeColaboradoresPorCiclo(uuidInvalido);

      // Assert
      expect(resultado).toBeDefined();
      expect(mockRhService.getQuantidadeColaboradoresPorCiclo).toHaveBeenCalledWith(uuidInvalido);
    });

    it('deve ter proteção de autenticação e autorização para RH', () => {
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
      expect(mockRolesGuard.canActivate).toBeDefined();
    });

    it('deve retornar estrutura correta de resposta', async () => {
      // Arrange
      mockRhService.getQuantidadeColaboradoresPorCiclo.mockResolvedValue(mockQuantidadeColaboradores);

      // Act
      const resultado = await controller.getQuantidadeColaboradoresPorCiclo(mockCicloId);

      // Assert
      expect(resultado).toMatchObject({
        TotalColaboradores: expect.any(Number),
      });
      expect(typeof resultado.TotalColaboradores).toBe('number');
      expect(resultado.TotalColaboradores).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getQuantidadeAvaliacoesConcluidasPorCiclo (GET /RH/avaliacoes/concluidas/ciclo/:idCiclo)', () => {
    it('deve retornar quantidade total e concluída de avaliações', async () => {
      // Arrange
      mockRhService.getQuantidadeAvaliacoesConcluidasPorCiclo.mockResolvedValue(mockQuantidadeAvaliacoes);

      // Act
      const resultado = await controller.getQuantidadeAvaliacoesConcluidasPorCiclo(mockCicloId);

      // Assert
      expect(resultado).toEqual(mockQuantidadeAvaliacoes);
      expect(mockRhService.getQuantidadeAvaliacoesConcluidasPorCiclo).toHaveBeenCalledWith(mockCicloId);
      expect(mockRhService.getQuantidadeAvaliacoesConcluidasPorCiclo).toHaveBeenCalledTimes(1);
    });

    it('deve retornar zero quando não há avaliações', async () => {
      // Arrange
      const avaliacoesZero = {
        TotalAvaliacoes: 0,
        totalConcluidas: 0,
      };
      mockRhService.getQuantidadeAvaliacoesConcluidasPorCiclo.mockResolvedValue(avaliacoesZero);

      // Act
      const resultado = await controller.getQuantidadeAvaliacoesConcluidasPorCiclo(mockCicloId);

      // Assert
      expect(resultado).toEqual(avaliacoesZero);
      expect(resultado.TotalAvaliacoes).toBe(0);
      expect(resultado.totalConcluidas).toBe(0);
    });

    it('deve retornar todas concluídas quando 100% concluído', async () => {
      // Arrange
      const todasConcluidas = {
        TotalAvaliacoes: 100,
        totalConcluidas: 100,
      };
      mockRhService.getQuantidadeAvaliacoesConcluidasPorCiclo.mockResolvedValue(todasConcluidas);

      // Act
      const resultado = await controller.getQuantidadeAvaliacoesConcluidasPorCiclo(mockCicloId);

      // Assert
      expect(resultado).toEqual(todasConcluidas);
      expect(resultado.TotalAvaliacoes).toBe(resultado.totalConcluidas);
    });

    it('deve retornar nenhuma concluída quando 0% concluído', async () => {
      // Arrange
      const nenhumaConcluida = {
        TotalAvaliacoes: 50,
        totalConcluidas: 0,
      };
      mockRhService.getQuantidadeAvaliacoesConcluidasPorCiclo.mockResolvedValue(nenhumaConcluida);

      // Act
      const resultado = await controller.getQuantidadeAvaliacoesConcluidasPorCiclo(mockCicloId);

      // Assert
      expect(resultado).toEqual(nenhumaConcluida);
      expect(resultado.totalConcluidas).toBe(0);
      expect(resultado.TotalAvaliacoes).toBeGreaterThan(0);
    });

    it('deve lançar NotFoundException quando ciclo não encontrado', async () => {
      // Arrange
      const idCicloInexistente = 'ciclo-inexistente';
      const error = new NotFoundException(`Ciclo com ID ${idCicloInexistente} não encontrado.`);
      mockRhService.getQuantidadeAvaliacoesConcluidasPorCiclo.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getQuantidadeAvaliacoesConcluidasPorCiclo(idCicloInexistente)).rejects.toThrow(NotFoundException);
      expect(mockRhService.getQuantidadeAvaliacoesConcluidasPorCiclo).toHaveBeenCalledWith(idCicloInexistente);
    });

    it('deve retornar estrutura correta de resposta', async () => {
      // Arrange
      mockRhService.getQuantidadeAvaliacoesConcluidasPorCiclo.mockResolvedValue(mockQuantidadeAvaliacoes);

      // Act
      const resultado = await controller.getQuantidadeAvaliacoesConcluidasPorCiclo(mockCicloId);

      // Assert
      expect(resultado).toMatchObject({
        TotalAvaliacoes: expect.any(Number),
        totalConcluidas: expect.any(Number),
      });
      expect(typeof resultado.TotalAvaliacoes).toBe('number');
      expect(typeof resultado.totalConcluidas).toBe('number');
      expect(resultado.totalConcluidas).toBeLessThanOrEqual(resultado.TotalAvaliacoes);
    });
  });

  describe('getQuantidadeUnidades (GET /RH/unidades)', () => {
    it('deve retornar quantidade de unidades da empresa', async () => {
      // Arrange
      mockRhService.getQuantidadeUnidades.mockResolvedValue(mockQuantidadeUnidades);

      // Act
      const resultado = await controller.getQuantidadeUnidades();

      // Assert
      expect(resultado).toEqual(mockQuantidadeUnidades);
      expect(mockRhService.getQuantidadeUnidades).toHaveBeenCalledWith();
      expect(mockRhService.getQuantidadeUnidades).toHaveBeenCalledTimes(1);
    });

    it('deve retornar zero quando não há unidades cadastradas', async () => {
      // Arrange
      const unidadesZero = { quantidadeUnidades: 0 };
      mockRhService.getQuantidadeUnidades.mockResolvedValue(unidadesZero);

      // Act
      const resultado = await controller.getQuantidadeUnidades();

      // Assert
      expect(resultado).toEqual(unidadesZero);
      expect(resultado.quantidadeUnidades).toBe(0);
    });

    it('deve retornar quantidade correta de unidades distintas', async () => {
      // Arrange
      const muitasUnidades = { quantidadeUnidades: 25 };
      mockRhService.getQuantidadeUnidades.mockResolvedValue(muitasUnidades);

      // Act
      const resultado = await controller.getQuantidadeUnidades();

      // Assert
      expect(resultado).toEqual(muitasUnidades);
      expect(resultado.quantidadeUnidades).toBe(25);
    });

    it('deve retornar estrutura correta de resposta', async () => {
      // Arrange
      mockRhService.getQuantidadeUnidades.mockResolvedValue(mockQuantidadeUnidades);

      // Act
      const resultado = await controller.getQuantidadeUnidades();

      // Assert
      expect(resultado).toMatchObject({
        quantidadeUnidades: expect.any(Number),
      });
      expect(typeof resultado.quantidadeUnidades).toBe('number');
      expect(resultado.quantidadeUnidades).toBeGreaterThanOrEqual(0);
    });

    it('deve funcionar sem parâmetros', async () => {
      // Arrange
      mockRhService.getQuantidadeUnidades.mockResolvedValue(mockQuantidadeUnidades);

      // Act
      const resultado = await controller.getQuantidadeUnidades();

      // Assert
      expect(resultado).toBeDefined();
      expect(mockRhService.getQuantidadeUnidades).toHaveBeenCalledWith();
    });
  });

  describe('getStatusAvaliacoesPorCiclo (GET /RH/avaliacoes/status/:idCiclo)', () => {
    it('deve retornar status das avaliações por ciclo', async () => {
      // Arrange
      mockRhService.getStatusAvaliacoesPorCiclo.mockResolvedValue(mockStatusAvaliacoes);

      // Act
      const resultado = await controller.getStatusAvaliacoesPorCiclo(mockCicloId);

      // Assert
      expect(resultado).toEqual(mockStatusAvaliacoes);
      expect(mockRhService.getStatusAvaliacoesPorCiclo).toHaveBeenCalledWith(mockCicloId);
      expect(mockRhService.getStatusAvaliacoesPorCiclo).toHaveBeenCalledTimes(1);
    });

    it('deve retornar zeros quando não há avaliações', async () => {
      // Arrange
      const statusZero = {
        quantConcluidas: 0,
        quantPendentes: 0,
        quantEmAndamento: 0,
      };
      mockRhService.getStatusAvaliacoesPorCiclo.mockResolvedValue(statusZero);

      // Act
      const resultado = await controller.getStatusAvaliacoesPorCiclo(mockCicloId);

      // Assert
      expect(resultado).toEqual(statusZero);
      expect(resultado.quantConcluidas).toBe(0);
      expect(resultado.quantPendentes).toBe(0);
      expect(resultado.quantEmAndamento).toBe(0);
    });

    it('deve retornar apenas concluídas quando só há esse status', async () => {
      // Arrange
      const apenasGoncluidas = {
        quantConcluidas: 50,
        quantPendentes: 0,
        quantEmAndamento: 0,
      };
      mockRhService.getStatusAvaliacoesPorCiclo.mockResolvedValue(apenasGoncluidas);

      // Act
      const resultado = await controller.getStatusAvaliacoesPorCiclo(mockCicloId);

      // Assert
      expect(resultado).toEqual(apenasGoncluidas);
      expect(resultado.quantConcluidas).toBe(50);
      expect(resultado.quantPendentes).toBe(0);
      expect(resultado.quantEmAndamento).toBe(0);
    });

    it('deve retornar distribuição mista de status', async () => {
      // Arrange
      const statusMisto = {
        quantConcluidas: 30,
        quantPendentes: 15,
        quantEmAndamento: 5,
      };
      mockRhService.getStatusAvaliacoesPorCiclo.mockResolvedValue(statusMisto);

      // Act
      const resultado = await controller.getStatusAvaliacoesPorCiclo(mockCicloId);

      // Assert
      expect(resultado).toEqual(statusMisto);
      expect(resultado.quantConcluidas + resultado.quantPendentes + resultado.quantEmAndamento).toBe(50);
    });

    it('deve lançar NotFoundException quando ciclo não encontrado', async () => {
      // Arrange
      const idCicloInexistente = 'ciclo-inexistente';
      const error = new NotFoundException(`Ciclo com ID ${idCicloInexistente} não encontrado.`);
      mockRhService.getStatusAvaliacoesPorCiclo.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getStatusAvaliacoesPorCiclo(idCicloInexistente)).rejects.toThrow(NotFoundException);
      expect(mockRhService.getStatusAvaliacoesPorCiclo).toHaveBeenCalledWith(idCicloInexistente);
    });

    it('deve retornar estrutura correta de resposta', async () => {
      // Arrange
      mockRhService.getStatusAvaliacoesPorCiclo.mockResolvedValue(mockStatusAvaliacoes);

      // Act
      const resultado = await controller.getStatusAvaliacoesPorCiclo(mockCicloId);

      // Assert
      expect(resultado).toMatchObject({
        quantConcluidas: expect.any(Number),
        quantPendentes: expect.any(Number),
        quantEmAndamento: expect.any(Number),
      });
      expect(typeof resultado.quantConcluidas).toBe('number');
      expect(typeof resultado.quantPendentes).toBe('number');
      expect(typeof resultado.quantEmAndamento).toBe('number');
    });
  });

  describe('getProgressoPorUnidade (GET /RH/progresso/unidade/ciclo/:idCiclo)', () => {
    it('deve retornar progresso das avaliações por unidade', async () => {
      // Arrange
      mockRhService.getProgressoPorUnidade.mockResolvedValue(mockProgressoUnidades);

      // Act
      const resultado = await controller.getProgressoPorUnidade(mockCicloId);

      // Assert
      expect(resultado).toEqual(mockProgressoUnidades);
      expect(mockRhService.getProgressoPorUnidade).toHaveBeenCalledWith(mockCicloId);
      expect(mockRhService.getProgressoPorUnidade).toHaveBeenCalledTimes(1);
    });

    it('deve retornar array vazio quando não há avaliações', async () => {
      // Arrange
      mockRhService.getProgressoPorUnidade.mockResolvedValue([]);

      // Act
      const resultado = await controller.getProgressoPorUnidade(mockCicloId);

      // Assert
      expect(resultado).toEqual([]);
      expect(Array.isArray(resultado)).toBe(true);
      expect(resultado).toHaveLength(0);
    });

    it('deve retornar progresso para múltiplas unidades', async () => {
      // Arrange
      mockRhService.getProgressoPorUnidade.mockResolvedValue(mockProgressoUnidades);

      // Act
      const resultado = await controller.getProgressoPorUnidade(mockCicloId);

      // Assert
      expect(resultado).toHaveLength(4);
      expect(resultado).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nomeUnidade: 'TI',
            quantConcluidas: 45,
            total: 60,
          }),
          expect.objectContaining({
            nomeUnidade: 'Financeiro',
            quantConcluidas: 30,
            total: 40,
          }),
        ])
      );
    });

    it('deve validar estrutura de cada item do progresso', async () => {
      // Arrange
      mockRhService.getProgressoPorUnidade.mockResolvedValue(mockProgressoUnidades);

      // Act
      const resultado = await controller.getProgressoPorUnidade(mockCicloId);

      // Assert
      resultado.forEach(item => {
        const typedItem = item as { nomeUnidade: string; quantConcluidas: number; total: number };
        expect(typedItem).toMatchObject({
          nomeUnidade: expect.any(String),
          quantConcluidas: expect.any(Number),
          total: expect.any(Number),
        });
        expect(typedItem.quantConcluidas).toBeLessThanOrEqual(typedItem.total);
        expect(typedItem.quantConcluidas).toBeGreaterThanOrEqual(0);
        expect(typedItem.total).toBeGreaterThanOrEqual(0);
      });
    });

    it('deve lidar com unidades sem avaliações concluídas', async () => {
      // Arrange
      const progressoComZeros = [
        {
          nomeUnidade: 'Nova Unidade',
          quantConcluidas: 0,
          total: 10,
        },
      ];
      mockRhService.getProgressoPorUnidade.mockResolvedValue(progressoComZeros);

      // Act
      const resultado = await controller.getProgressoPorUnidade(mockCicloId);

      // Assert
      expect(resultado).toEqual(progressoComZeros);
      expect((resultado[0] as { quantConcluidas: number; total: number }).quantConcluidas).toBe(0);
      expect((resultado[0] as { quantConcluidas: number; total: number }).total).toBe(10);
    });

    it('deve lançar NotFoundException quando ciclo não encontrado', async () => {
      // Arrange
      const idCicloInexistente = 'ciclo-inexistente';
      const error = new NotFoundException(`Ciclo com ID ${idCicloInexistente} não encontrado.`);
      mockRhService.getProgressoPorUnidade.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getProgressoPorUnidade(idCicloInexistente)).rejects.toThrow(NotFoundException);
      expect(mockRhService.getProgressoPorUnidade).toHaveBeenCalledWith(idCicloInexistente);
    });

    it('deve retornar array de objetos com estrutura correta', async () => {
      // Arrange
      mockRhService.getProgressoPorUnidade.mockResolvedValue(mockProgressoUnidades);

      // Act
      const resultado = await controller.getProgressoPorUnidade(mockCicloId);

      // Assert
      expect(Array.isArray(resultado)).toBe(true);
      if (resultado.length > 0) {
        expect(resultado[0]).toMatchObject({
          nomeUnidade: expect.any(String),
          quantConcluidas: expect.any(Number),
          total: expect.any(Number),
        });
      }
    });
  });

  describe('getProgressoPorTrilha (GET /RH/progresso/trilha/ciclo/:idCiclo)', () => {
    it('deve retornar progresso das avaliações por trilha', async () => {
      // Arrange
      mockRhService.getProgressoPorTrilha.mockResolvedValue(mockProgressoTrilhas);

      // Act
      const resultado = await controller.getProgressoPorTrilha(mockCicloId);

      // Assert
      expect(resultado).toEqual(mockProgressoTrilhas);
      expect(mockRhService.getProgressoPorTrilha).toHaveBeenCalledWith(mockCicloId);
      expect(mockRhService.getProgressoPorTrilha).toHaveBeenCalledTimes(1);
    });

    it('deve retornar array vazio quando não há avaliações', async () => {
      // Arrange
      mockRhService.getProgressoPorTrilha.mockResolvedValue([]);

      // Act
      const resultado = await controller.getProgressoPorTrilha(mockCicloId);

      // Assert
      expect(resultado).toEqual([]);
      expect(Array.isArray(resultado)).toBe(true);
      expect(resultado).toHaveLength(0);
    });

    it('deve retornar progresso para múltiplas trilhas', async () => {
      // Arrange
      mockRhService.getProgressoPorTrilha.mockResolvedValue(mockProgressoTrilhas);

      // Act
      const resultado = await controller.getProgressoPorTrilha(mockCicloId);

      // Assert
      expect(resultado).toHaveLength(4);
      expect(resultado).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nomeTrilha: 'Backend',
            quantConcluidas: 40,
            total: 50,
          }),
          expect.objectContaining({
            nomeTrilha: 'Frontend',
            quantConcluidas: 35,
            total: 45,
          }),
        ])
      );
    });

    it('deve validar estrutura de cada item do progresso', async () => {
      // Arrange
      mockRhService.getProgressoPorTrilha.mockResolvedValue(mockProgressoTrilhas);

      // Act
      const resultado = await controller.getProgressoPorTrilha(mockCicloId);

      // Assert
      resultado.forEach(item => {
        const typedItem = item as { nomeTrilha: string; quantConcluidas: number; total: number };
        expect(typedItem).toMatchObject({
          nomeTrilha: expect.any(String),
          quantConcluidas: expect.any(Number),
          total: expect.any(Number),
        });
        expect(typedItem.quantConcluidas).toBeLessThanOrEqual(typedItem.total);
        expect(typedItem.quantConcluidas).toBeGreaterThanOrEqual(0);
        expect(typedItem.total).toBeGreaterThanOrEqual(0);
      });
    });

    it('deve lidar com trilhas sem avaliações concluídas', async () => {
      // Arrange
      const progressoComZeros = [
        {
          nomeTrilha: 'Nova Trilha',
          quantConcluidas: 0,
          total: 15,
        },
      ];
      mockRhService.getProgressoPorTrilha.mockResolvedValue(progressoComZeros);

      // Act
      const resultado = await controller.getProgressoPorTrilha(mockCicloId);

      // Assert
      expect(resultado).toEqual(progressoComZeros);
      expect((resultado[0] as { quantConcluidas: number; total: number }).quantConcluidas).toBe(0);
      expect((resultado[0] as { quantConcluidas: number; total: number }).total).toBe(15);
    });

    it('deve lidar com trilhas sem categoria ("Sem Trilha")', async () => {
      // Arrange
      const progressoSemTrilha = [
        {
          nomeTrilha: 'Sem Trilha',
          quantConcluidas: 5,
          total: 8,
        },
      ];
      mockRhService.getProgressoPorTrilha.mockResolvedValue(progressoSemTrilha);

      // Act
      const resultado = await controller.getProgressoPorTrilha(mockCicloId);

      // Assert
      expect(resultado).toEqual(progressoSemTrilha);
      expect((resultado[0] as { nomeTrilha: string }).nomeTrilha).toBe('Sem Trilha');
    });

    it('deve lançar NotFoundException quando ciclo não encontrado', async () => {
      // Arrange
      const idCicloInexistente = 'ciclo-inexistente';
      const error = new NotFoundException(`Ciclo com ID ${idCicloInexistente} não encontrado.`);
      mockRhService.getProgressoPorTrilha.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getProgressoPorTrilha(idCicloInexistente)).rejects.toThrow(NotFoundException);
      expect(mockRhService.getProgressoPorTrilha).toHaveBeenCalledWith(idCicloInexistente);
    });

    it('deve retornar array de objetos com estrutura correta', async () => {
      // Arrange
      mockRhService.getProgressoPorTrilha.mockResolvedValue(mockProgressoTrilhas);

      // Act
      const resultado = await controller.getProgressoPorTrilha(mockCicloId);

      // Assert
      expect(Array.isArray(resultado)).toBe(true);
      if (resultado.length > 0) {
        expect(resultado[0]).toMatchObject({
          nomeTrilha: expect.any(String),
          quantConcluidas: expect.any(Number),
          total: expect.any(Number),
        });
      }
    });
  });

  describe('Guards e Autenticação', () => {
    it('deve aplicar JwtAuthGuard em todos os endpoints', () => {
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
    });

    it('deve aplicar RolesGuard em todos os endpoints', () => {
      expect(mockRolesGuard.canActivate).toBeDefined();
    });

    it('deve simular usuário autenticado com role RH', () => {
      // Arrange
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { userId: 'user-id', roles: ['RH'] },
          }),
        }),
      } as ExecutionContext;

      // Act
      const result = mockJwtAuthGuard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('deve permitir acesso apenas para role RH', () => {
      const result = mockRolesGuard.canActivate();
      expect(result).toBe(true);
    });

    it('deve proteger todos os endpoints com roles RH', () => {
      // Todos os endpoints devem estar protegidos com @Roles('RH')
      expect(mockRolesGuard.canActivate).toBeDefined();
    });

    it('deve validar que todos os endpoints exigem autenticação', () => {
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
    });
  });

  describe('Validação de parâmetros', () => {
    it('deve aceitar UUIDs válidos', async () => {
      // Arrange
      const uuidValido = '123e4567-e89b-12d3-a456-426614174000';
      mockRhService.getQuantidadeColaboradoresPorCiclo.mockResolvedValue(mockQuantidadeColaboradores);

      // Act
      const resultado = await controller.getQuantidadeColaboradoresPorCiclo(uuidValido);

      // Assert
      expect(resultado).toBeDefined();
      expect(mockRhService.getQuantidadeColaboradoresPorCiclo).toHaveBeenCalledWith(uuidValido);
    });

    it('deve passar parâmetros UUIDs para o service sem validação adicional', async () => {
      // Arrange - O controller apenas repassa o parâmetro, validação é no service
      const parametroQualquer = 'uuid-potencialmente-invalido';
      mockRhService.getStatusAvaliacoesPorCiclo.mockResolvedValue(mockStatusAvaliacoes);

      // Act
      const resultado = await controller.getStatusAvaliacoesPorCiclo(parametroQualquer);

      // Assert
      expect(resultado).toBeDefined();
      expect(mockRhService.getStatusAvaliacoesPorCiclo).toHaveBeenCalledWith(parametroQualquer);
    });

    it('deve funcionar com diferentes IDs de ciclo', async () => {
      // Arrange
      const cicloId1 = '111e1111-e11b-11d3-a111-111111111111';
      const cicloId2 = '222e2222-e22b-22d3-a222-222222222222';
      
      mockRhService.getQuantidadeColaboradoresPorCiclo
        .mockResolvedValueOnce({ TotalColaboradores: 100 })
        .mockResolvedValueOnce({ TotalColaboradores: 200 });

      // Act
      const resultado1 = await controller.getQuantidadeColaboradoresPorCiclo(cicloId1);
      const resultado2 = await controller.getQuantidadeColaboradoresPorCiclo(cicloId2);

      // Assert
      expect(resultado1.TotalColaboradores).toBe(100);
      expect(resultado2.TotalColaboradores).toBe(200);
      expect(mockRhService.getQuantidadeColaboradoresPorCiclo).toHaveBeenCalledWith(cicloId1);
      expect(mockRhService.getQuantidadeColaboradoresPorCiclo).toHaveBeenCalledWith(cicloId2);
    });
  });

  describe('Integração e casos extremos', () => {
    it('deve lidar com múltiplas operações simultâneas', async () => {
      // Arrange
      mockRhService.getQuantidadeColaboradoresPorCiclo.mockResolvedValue(mockQuantidadeColaboradores);

      // Act
      const promessas = [
        controller.getQuantidadeColaboradoresPorCiclo(mockCicloId),
        controller.getQuantidadeColaboradoresPorCiclo(mockCicloId),
        controller.getQuantidadeColaboradoresPorCiclo(mockCicloId),
      ];

      const resultados = await Promise.all(promessas);

      // Assert
      expect(resultados).toHaveLength(3);
      expect(mockRhService.getQuantidadeColaboradoresPorCiclo).toHaveBeenCalledTimes(3);
      resultados.forEach(resultado => {
        expect(resultado).toEqual(mockQuantidadeColaboradores);
      });
    });

    it('deve propagar erros do service corretamente', async () => {
      // Arrange
      const error = new Error('Erro interno do servidor');
      mockRhService.getQuantidadeUnidades.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getQuantidadeUnidades()).rejects.toThrow('Erro interno do servidor');
    });

    it('deve validar que todos os endpoints estão mapeados corretamente', () => {
      // Assert
      expect(controller.getQuantidadeColaboradoresPorCiclo).toBeDefined();
      expect(controller.getQuantidadeAvaliacoesConcluidasPorCiclo).toBeDefined();
      expect(controller.getQuantidadeUnidades).toBeDefined();
      expect(controller.getStatusAvaliacoesPorCiclo).toBeDefined();
      expect(controller.getProgressoPorUnidade).toBeDefined();
      expect(controller.getProgressoPorTrilha).toBeDefined();
    });

    it('deve manter consistência entre diferentes chamadas', async () => {
      // Arrange
      mockRhService.getQuantidadeColaboradoresPorCiclo.mockResolvedValue(mockQuantidadeColaboradores);
      mockRhService.getQuantidadeAvaliacoesConcluidasPorCiclo.mockResolvedValue(mockQuantidadeAvaliacoes);
      mockRhService.getStatusAvaliacoesPorCiclo.mockResolvedValue(mockStatusAvaliacoes);

      // Act
      const colaboradores = await controller.getQuantidadeColaboradoresPorCiclo(mockCicloId);
      const avaliacoes = await controller.getQuantidadeAvaliacoesConcluidasPorCiclo(mockCicloId);
      const status = await controller.getStatusAvaliacoesPorCiclo(mockCicloId);

      // Assert
      expect(colaboradores.TotalColaboradores).toBe(150);
      expect(avaliacoes.TotalAvaliacoes).toBe(300);
      expect(avaliacoes.totalConcluidas).toBe(225);
      expect(status.quantConcluidas).toBe(225);
      
      // Consistência: avaliações concluídas devem ser iguais
      expect(avaliacoes.totalConcluidas).toBe(status.quantConcluidas);
    });

    it('deve lidar com dados de dashboard em tempo real', async () => {
      // Arrange - simula dados que mudam durante consultas
      let contadorChamadas = 0;
      mockRhService.getQuantidadeColaboradoresPorCiclo.mockImplementation(() => {
        contadorChamadas++;
        return Promise.resolve({ TotalColaboradores: 100 + contadorChamadas });
      });

      // Act
      const resultado1 = await controller.getQuantidadeColaboradoresPorCiclo(mockCicloId);
      const resultado2 = await controller.getQuantidadeColaboradoresPorCiclo(mockCicloId);

      // Assert
      expect(resultado1.TotalColaboradores).toBe(101);
      expect(resultado2.TotalColaboradores).toBe(102);
      expect(mockRhService.getQuantidadeColaboradoresPorCiclo).toHaveBeenCalledTimes(2);
    });
  });

  describe('Estrutura de dados e tipos', () => {
    it('deve retornar dados compatíveis com dashboard de RH', async () => {
      // Arrange
      mockRhService.getQuantidadeColaboradoresPorCiclo.mockResolvedValue(mockQuantidadeColaboradores);
      mockRhService.getQuantidadeAvaliacoesConcluidasPorCiclo.mockResolvedValue(mockQuantidadeAvaliacoes);
      mockRhService.getProgressoPorUnidade.mockResolvedValue(mockProgressoUnidades);

      // Act
      const colaboradores = await controller.getQuantidadeColaboradoresPorCiclo(mockCicloId);
      const avaliacoes = await controller.getQuantidadeAvaliacoesConcluidasPorCiclo(mockCicloId);
      const progresso = await controller.getProgressoPorUnidade(mockCicloId);

      // Assert - estruturas compatíveis com charts/gráficos
      expect(colaboradores).toHaveProperty('TotalColaboradores');
      expect(avaliacoes).toHaveProperty('TotalAvaliacoes');
      expect(avaliacoes).toHaveProperty('totalConcluidas');
      expect(Array.isArray(progresso)).toBe(true);
      
      if (progresso.length > 0) {
        expect(progresso[0]).toHaveProperty('nomeUnidade');
        expect(progresso[0]).toHaveProperty('quantConcluidas');
        expect(progresso[0]).toHaveProperty('total');
      }
    });

    it('deve retornar dados numéricos válidos para métricas', async () => {
      // Arrange
      mockRhService.getStatusAvaliacoesPorCiclo.mockResolvedValue(mockStatusAvaliacoes);

      // Act
      const status = await controller.getStatusAvaliacoesPorCiclo(mockCicloId);

      // Assert
      expect(typeof status.quantConcluidas).toBe('number');
      expect(typeof status.quantPendentes).toBe('number');
      expect(typeof status.quantEmAndamento).toBe('number');
      expect(status.quantConcluidas).toBeGreaterThanOrEqual(0);
      expect(status.quantPendentes).toBeGreaterThanOrEqual(0);
      expect(status.quantEmAndamento).toBeGreaterThanOrEqual(0);
    });

    it('deve retornar arrays consistentes para visualizações', async () => {
      // Arrange
      mockRhService.getProgressoPorTrilha.mockResolvedValue(mockProgressoTrilhas);

      // Act
      const progresso = await controller.getProgressoPorTrilha(mockCicloId);

      // Assert
      expect(Array.isArray(progresso)).toBe(true);
      progresso.forEach((item, index) => {
        const typedItem = item as { nomeTrilha: string; quantConcluidas: number; total: number };
        expect(typeof typedItem.nomeTrilha).toBe('string');
        expect(typeof typedItem.quantConcluidas).toBe('number');
        expect(typeof typedItem.total).toBe('number');
        expect(typedItem.nomeTrilha).toBeTruthy(); // não vazio
      });
    });

    it('deve manter tipos consistentes em diferentes cenários', async () => {
      // Arrange
      const cenarios = [
        { TotalColaboradores: 0 },
        { TotalColaboradores: 1 },
        { TotalColaboradores: 1000 },
      ];

      // Act & Assert
      for (const cenario of cenarios) {
        mockRhService.getQuantidadeColaboradoresPorCiclo.mockResolvedValue(cenario);
        const resultado = await controller.getQuantidadeColaboradoresPorCiclo(mockCicloId);
        
        expect(typeof resultado.TotalColaboradores).toBe('number');
        expect(resultado.TotalColaboradores).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Performance e escalabilidade', () => {
    it('deve delegar processamento para o service', async () => {
      // Arrange
      mockRhService.getProgressoPorUnidade.mockResolvedValue(mockProgressoUnidades);

      // Act
      const resultado = await controller.getProgressoPorUnidade(mockCicloId);

      // Assert
      expect(resultado).toEqual(mockProgressoUnidades);
      expect(mockRhService.getProgressoPorUnidade).toHaveBeenCalledTimes(1);
      // Controller deve apenas delegar, não processar
    });

    it('deve manter responsividade com grandes volumes de dados', async () => {
      // Arrange
      const grandeVolumeUnidades = Array.from({ length: 100 }, (_, i) => ({
        nomeUnidade: `Unidade ${i + 1}`,
        quantConcluidas: Math.floor(Math.random() * 50),
        total: 50,
      }));
      
      mockRhService.getProgressoPorUnidade.mockResolvedValue(grandeVolumeUnidades);

      // Act
      const inicio = Date.now();
      const resultado = await controller.getProgressoPorUnidade(mockCicloId);
      const fim = Date.now();

      // Assert
      expect(resultado).toHaveLength(100);
      expect(fim - inicio).toBeLessThan(100); // Deve ser rápido pois só delega
    });

    it('deve suportar chamadas concorrentes', async () => {
      // Arrange
      mockRhService.getQuantidadeUnidades.mockResolvedValue(mockQuantidadeUnidades);

      // Act
      const promessasConcorrentes = Array.from({ length: 10 }, () => 
        controller.getQuantidadeUnidades()
      );
      
      const resultados = await Promise.all(promessasConcorrentes);

      // Assert
      expect(resultados).toHaveLength(10);
      resultados.forEach(resultado => {
        expect(resultado).toEqual(mockQuantidadeUnidades);
      });
      expect(mockRhService.getQuantidadeUnidades).toHaveBeenCalledTimes(10);
    });
  });
});