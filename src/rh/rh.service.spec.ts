import { Test, TestingModule } from '@nestjs/testing';
import { RhService } from './rh.service';
import { PrismaService } from '../database/prismaService';
import { NotFoundException } from '@nestjs/common';
import { preenchimentoStatus, cicloStatus } from '@prisma/client';

describe('RhService', () => {
  let service: RhService;
  let prismaService: PrismaService;

  // Mock do PrismaService
  const mockPrismaService = {
    cicloAvaliacao: {
      findUnique: jest.fn(),
    },
    colaboradorCiclo: {
      count: jest.fn(),
    },
    avaliacao: {
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    colaborador: {
      findMany: jest.fn(),
    },
  };

  // Dados de teste
  const mockCiclo = {
    idCiclo: '123e4567-e89b-12d3-a456-426614174000',
    nomeCiclo: '2024.1',
    dataInicio: new Date('2024-01-01'),
    dataFim: new Date('2024-12-31'),
    status: cicloStatus.EM_ANDAMENTO,
    duracaoEmAndamentoDias: 30,
    duracaoEmRevisaoDias: 7,
    duracaoEmEqualizacaoDias: 7,
  };

  const mockColaborador1 = {
    idColaborador: '456e7890-e89b-12d3-a456-426614174001',
    nomeCompleto: 'João Silva',
    email: 'joao.silva@empresa.com',
    cargo: 'Desenvolvedor',
    unidade: 'TI',
    trilhaCarreira: 'Backend',
  };

  const mockColaborador2 = {
    idColaborador: '789e0123-e89b-12d3-a456-426614174002',
    nomeCompleto: 'Maria Santos',
    email: 'maria.santos@empresa.com',
    cargo: 'Analista',
    unidade: 'Financeiro',
    trilhaCarreira: 'Frontend',
  };

  const mockColaborador3 = {
    idColaborador: '987e6543-e89b-12d3-a456-426614174003',
    nomeCompleto: 'Pedro Oliveira',
    email: 'pedro.oliveira@empresa.com',
    cargo: 'Coordenador',
    unidade: 'TI',
    trilhaCarreira: 'Backend',
  };

  const mockColaborador4 = {
    idColaborador: '654e3210-e89b-12d3-a456-426614174004',
    nomeCompleto: 'Ana Costa',
    email: 'ana.costa@empresa.com',
    cargo: 'Gerente',
    unidade: 'RH',
    trilhaCarreira: 'Gestão',
  };

  const mockAvaliacao1 = {
    idAvaliacao: 'aval-001',
    idCiclo: mockCiclo.idCiclo,
    idAvaliador: mockColaborador1.idColaborador,
    idAvaliado: mockColaborador2.idColaborador,
    status: preenchimentoStatus.CONCLUIDA,
    avaliado: { unidade: mockColaborador2.unidade, trilhaCarreira: mockColaborador2.trilhaCarreira },
  };

  const mockAvaliacao2 = {
    idAvaliacao: 'aval-002',
    idCiclo: mockCiclo.idCiclo,
    idAvaliador: mockColaborador2.idColaborador,
    idAvaliado: mockColaborador1.idColaborador,
    status: preenchimentoStatus.PENDENTE,
    avaliado: { unidade: mockColaborador1.unidade, trilhaCarreira: mockColaborador1.trilhaCarreira },
  };

  const mockAvaliacao3 = {
    idAvaliacao: 'aval-003',
    idCiclo: mockCiclo.idCiclo,
    idAvaliador: mockColaborador3.idColaborador,
    idAvaliado: mockColaborador4.idColaborador,
    status: preenchimentoStatus.CONCLUIDA,
    avaliado: { unidade: mockColaborador4.unidade, trilhaCarreira: mockColaborador4.trilhaCarreira },
  };

  const mockAvaliacao4 = {
    idAvaliacao: 'aval-004',
    idCiclo: mockCiclo.idCiclo,
    idAvaliador: mockColaborador4.idColaborador,
    idAvaliado: mockColaborador3.idColaborador,
    status: preenchimentoStatus.PENDENTE,
    avaliado: { unidade: mockColaborador3.unidade, trilhaCarreira: mockColaborador3.trilhaCarreira },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RhService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RhService>(RhService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Definição do service', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('validarCiclo (método privado)', () => {
    it('deve retornar ciclo quando encontrado', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);

      // Act - teste indireto através de método público
      const resultado = await service.getQuantidadeColaboradoresPorCiclo(mockCiclo.idCiclo);

      // Assert
      expect(mockPrismaService.cicloAvaliacao.findUnique).toHaveBeenCalledWith({
        where: { idCiclo: mockCiclo.idCiclo },
      });
      expect(resultado).toBeDefined();
    });

    it('deve lançar NotFoundException quando ciclo não encontrado', async () => {
      // Arrange
      const idCicloInexistente = 'ciclo-inexistente';
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getQuantidadeColaboradoresPorCiclo(idCicloInexistente)).rejects.toThrow(NotFoundException);
      await expect(service.getQuantidadeColaboradoresPorCiclo(idCicloInexistente)).rejects.toThrow(
        `Ciclo com ID ${idCicloInexistente} não encontrado.`
      );
      expect(mockPrismaService.cicloAvaliacao.findUnique).toHaveBeenCalledWith({
        where: { idCiclo: idCicloInexistente },
      });
    });

    it('deve validar ciclo em todos os métodos que recebem idCiclo', async () => {
      // Arrange
      const idCicloInvalido = 'ciclo-invalido';
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(null);

      // Act & Assert - testando múltiplos métodos
      await expect(service.getQuantidadeColaboradoresPorCiclo(idCicloInvalido)).rejects.toThrow(NotFoundException);
      await expect(service.getQuantidadeAvaliacoesConcluidasPorCiclo(idCicloInvalido)).rejects.toThrow(NotFoundException);
      await expect(service.getStatusAvaliacoesPorCiclo(idCicloInvalido)).rejects.toThrow(NotFoundException);
      await expect(service.getProgressoPorUnidade(idCicloInvalido)).rejects.toThrow(NotFoundException);
      await expect(service.getProgressoPorTrilha(idCicloInvalido)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getQuantidadeColaboradoresPorCiclo', () => {
    it('deve retornar quantidade total de colaboradores de um ciclo', async () => {
      // Arrange
      const totalColaboradores = 5;
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.colaboradorCiclo.count.mockResolvedValue(totalColaboradores);

      // Act
      const resultado = await service.getQuantidadeColaboradoresPorCiclo(mockCiclo.idCiclo);

      // Assert
      expect(resultado).toEqual({ TotalColaboradores: totalColaboradores });
      expect(mockPrismaService.colaboradorCiclo.count).toHaveBeenCalledWith({
        where: { idCiclo: mockCiclo.idCiclo },
      });
    });

    it('deve retornar zero quando ciclo não possui colaboradores', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.colaboradorCiclo.count.mockResolvedValue(0);

      // Act
      const resultado = await service.getQuantidadeColaboradoresPorCiclo(mockCiclo.idCiclo);

      // Assert
      expect(resultado).toEqual({ TotalColaboradores: 0 });
    });

    it('deve retornar números grandes corretamente', async () => {
      // Arrange
      const totalColaboradores = 1000;
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.colaboradorCiclo.count.mockResolvedValue(totalColaboradores);

      // Act
      const resultado = await service.getQuantidadeColaboradoresPorCiclo(mockCiclo.idCiclo);

      // Assert
      expect(resultado).toEqual({ TotalColaboradores: totalColaboradores });
    });

    it('deve validar ciclo antes de contar colaboradores', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.colaboradorCiclo.count.mockResolvedValue(5);

      // Act
      await service.getQuantidadeColaboradoresPorCiclo(mockCiclo.idCiclo);

      // Assert - Verifica se ambos os métodos foram chamados
      expect(mockPrismaService.cicloAvaliacao.findUnique).toHaveBeenCalledWith({
        where: { idCiclo: mockCiclo.idCiclo },
      });
      expect(mockPrismaService.colaboradorCiclo.count).toHaveBeenCalledWith({
        where: { idCiclo: mockCiclo.idCiclo },
      });
      
      // Verifica que a validação foi chamada exatamente uma vez
      expect(mockPrismaService.cicloAvaliacao.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.colaboradorCiclo.count).toHaveBeenCalledTimes(1);
    });
  });

  describe('getQuantidadeAvaliacoesConcluidasPorCiclo', () => {
    it('deve retornar total de avaliações e quantidade concluída', async () => {
      // Arrange
      const totalAvaliacoes = 10;
      const avaliacoesConcluidas = 7;
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.count
        .mockResolvedValueOnce(totalAvaliacoes)
        .mockResolvedValueOnce(avaliacoesConcluidas);

      // Act
      const resultado = await service.getQuantidadeAvaliacoesConcluidasPorCiclo(mockCiclo.idCiclo);

      // Assert
      expect(resultado).toEqual({
        TotalAvaliacoes: totalAvaliacoes,
        totalConcluidas: avaliacoesConcluidas,
      });
      expect(mockPrismaService.avaliacao.count).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.avaliacao.count).toHaveBeenNthCalledWith(1, {
        where: { idCiclo: mockCiclo.idCiclo },
      });
      expect(mockPrismaService.avaliacao.count).toHaveBeenNthCalledWith(2, {
        where: { idCiclo: mockCiclo.idCiclo, status: preenchimentoStatus.CONCLUIDA },
      });
    });

    it('deve retornar zero quando não há avaliações', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      // Act
      const resultado = await service.getQuantidadeAvaliacoesConcluidasPorCiclo(mockCiclo.idCiclo);

      // Assert
      expect(resultado).toEqual({
        TotalAvaliacoes: 0,
        totalConcluidas: 0,
      });
    });

    it('deve retornar todas concluídas quando 100% concluído', async () => {
      // Arrange
      const totalAvaliacoes = 5;
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.count
        .mockResolvedValueOnce(totalAvaliacoes)
        .mockResolvedValueOnce(totalAvaliacoes);

      // Act
      const resultado = await service.getQuantidadeAvaliacoesConcluidasPorCiclo(mockCiclo.idCiclo);

      // Assert
      expect(resultado).toEqual({
        TotalAvaliacoes: totalAvaliacoes,
        totalConcluidas: totalAvaliacoes,
      });
    });

    it('deve retornar zero concluídas quando nenhuma foi concluída', async () => {
      // Arrange
      const totalAvaliacoes = 8;
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.count
        .mockResolvedValueOnce(totalAvaliacoes)
        .mockResolvedValueOnce(0);

      // Act
      const resultado = await service.getQuantidadeAvaliacoesConcluidasPorCiclo(mockCiclo.idCiclo);

      // Assert
      expect(resultado).toEqual({
        TotalAvaliacoes: totalAvaliacoes,
        totalConcluidas: 0,
      });
    });

    it('deve executar as consultas em paralelo para melhor performance', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5);

      // Act
      await service.getQuantidadeAvaliacoesConcluidasPorCiclo(mockCiclo.idCiclo);

      // Assert
      // As duas consultas devem ser executadas simultaneamente
      expect(mockPrismaService.avaliacao.count).toHaveBeenCalledTimes(2);
    });
  });

  describe('getQuantidadeUnidades', () => {
    it('deve retornar quantidade de unidades distintas', async () => {
      // Arrange
      const unidadesDistintas = [
        { unidade: 'TI' },
        { unidade: 'Financeiro' },
        { unidade: 'RH' },
        { unidade: 'Marketing' },
      ];
      mockPrismaService.colaborador.findMany.mockResolvedValue(unidadesDistintas);

      // Act
      const resultado = await service.getQuantidadeUnidades();

      // Assert
      expect(resultado).toEqual({ quantidadeUnidades: 4 });
      expect(mockPrismaService.colaborador.findMany).toHaveBeenCalledWith({
        where: { unidade: { not: null } },
        distinct: ['unidade'],
        select: { unidade: true },
      });
    });

    it('deve retornar zero quando não há unidades cadastradas', async () => {
      // Arrange
      mockPrismaService.colaborador.findMany.mockResolvedValue([]);

      // Act
      const resultado = await service.getQuantidadeUnidades();

      // Assert
      expect(resultado).toEqual({ quantidadeUnidades: 0 });
    });

    it('deve ignorar colaboradores com unidade null', async () => {
      // Arrange
      const unidadesDistintas = [
        { unidade: 'TI' },
        { unidade: 'Financeiro' },
      ];
      mockPrismaService.colaborador.findMany.mockResolvedValue(unidadesDistintas);

      // Act
      const resultado = await service.getQuantidadeUnidades();

      // Assert
      expect(resultado).toEqual({ quantidadeUnidades: 2 });
      expect(mockPrismaService.colaborador.findMany).toHaveBeenCalledWith({
        where: { unidade: { not: null } },
        distinct: ['unidade'],
        select: { unidade: true },
      });
    });

    it('deve contar corretamente unidades únicas', async () => {
      // Arrange
      const unidadesDistintas = [
        { unidade: 'TI' },
        { unidade: 'Comercial' },
        { unidade: 'Operações' },
        { unidade: 'Juridico' },
        { unidade: 'Financeiro' },
      ];
      mockPrismaService.colaborador.findMany.mockResolvedValue(unidadesDistintas);

      // Act
      const resultado = await service.getQuantidadeUnidades();

      // Assert
      expect(resultado).toEqual({ quantidadeUnidades: 5 });
    });

    it('deve usar distinct para evitar duplicatas', async () => {
      // Arrange
      mockPrismaService.colaborador.findMany.mockResolvedValue([
        { unidade: 'TI' },
        { unidade: 'RH' },
      ]);

      // Act
      await service.getQuantidadeUnidades();

      // Assert
      expect(mockPrismaService.colaborador.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          distinct: ['unidade'],
        })
      );
    });
  });

  describe('getStatusAvaliacoesPorCiclo', () => {
    it('deve retornar contagem de avaliações por status', async () => {
      // Arrange
      const contagemPorStatus = [
        { status: preenchimentoStatus.CONCLUIDA, _count: { status: 6 } },
        { status: preenchimentoStatus.PENDENTE, _count: { status: 4 } },
      ];
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.groupBy.mockResolvedValue(contagemPorStatus);

      // Act
      const resultado = await service.getStatusAvaliacoesPorCiclo(mockCiclo.idCiclo);

      // Assert
      expect(resultado).toEqual({
        quantConcluidas: 6,
        quantPendentes: 4,
        quantEmAndamento: 0,
      });
      expect(mockPrismaService.avaliacao.groupBy).toHaveBeenCalledWith({
        by: ['status'],
        where: { idCiclo: mockCiclo.idCiclo },
        _count: {
          status: true,
        },
      });
    });

    it('deve retornar zeros quando não há avaliações', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.groupBy.mockResolvedValue([]);

      // Act
      const resultado = await service.getStatusAvaliacoesPorCiclo(mockCiclo.idCiclo);

      // Assert
      expect(resultado).toEqual({
        quantConcluidas: 0,
        quantPendentes: 0,
        quantEmAndamento: 0,
      });
    });

    it('deve retornar apenas concluídas quando só há esse status', async () => {
      // Arrange
      const contagemPorStatus = [
        { status: preenchimentoStatus.CONCLUIDA, _count: { status: 8 } },
      ];
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.groupBy.mockResolvedValue(contagemPorStatus);

      // Act
      const resultado = await service.getStatusAvaliacoesPorCiclo(mockCiclo.idCiclo);

      // Assert
      expect(resultado).toEqual({
        quantConcluidas: 8,
        quantPendentes: 0,
        quantEmAndamento: 0,
      });
    });

    it('deve retornar apenas pendentes quando só há esse status', async () => {
      // Arrange
      const contagemPorStatus = [
        { status: preenchimentoStatus.PENDENTE, _count: { status: 3 } },
      ];
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.groupBy.mockResolvedValue(contagemPorStatus);

      // Act
      const resultado = await service.getStatusAvaliacoesPorCiclo(mockCiclo.idCiclo);

      // Assert
      expect(resultado).toEqual({
        quantConcluidas: 0,
        quantPendentes: 3,
        quantEmAndamento: 0,
      });
    });

    it('deve manter estrutura consistente independente dos status presentes', async () => {
      // Arrange
      const contagemPorStatus = [
        { status: preenchimentoStatus.CONCLUIDA, _count: { status: 2 } },
      ];
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.groupBy.mockResolvedValue(contagemPorStatus);

      // Act
      const resultado = await service.getStatusAvaliacoesPorCiclo(mockCiclo.idCiclo);

      // Assert
      expect(resultado).toHaveProperty('quantConcluidas');
      expect(resultado).toHaveProperty('quantPendentes');
      expect(resultado).toHaveProperty('quantEmAndamento');
    });

    it('deve agrupar corretamente avaliações por status', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.groupBy.mockResolvedValue([]);

      // Act
      await service.getStatusAvaliacoesPorCiclo(mockCiclo.idCiclo);

      // Assert
      expect(mockPrismaService.avaliacao.groupBy).toHaveBeenCalledWith({
        by: ['status'],
        where: { idCiclo: mockCiclo.idCiclo },
        _count: {
          status: true,
        },
      });
    });
  });

  describe('getProgressoPorUnidade', () => {
    it('deve retornar progresso de avaliações por unidade', async () => {
      // Arrange
      const avaliacoes = [mockAvaliacao1, mockAvaliacao2, mockAvaliacao3, mockAvaliacao4];
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.findMany.mockResolvedValue(avaliacoes);

      // Act
      const resultado = await service.getProgressoPorUnidade(mockCiclo.idCiclo);

      // Assert
      expect(resultado).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nomeUnidade: 'Financeiro',
            quantConcluidas: 1,
            total: 1,
          }),
          expect.objectContaining({
            nomeUnidade: 'TI',
            quantConcluidas: 0, // mockAvaliacao2 e mockAvaliacao4 são PENDENTE
            total: 2, // 2 avaliações da unidade TI (mockAvaliacao2 e mockAvaliacao4)
          }),
          expect.objectContaining({
            nomeUnidade: 'RH',
            quantConcluidas: 1,
            total: 1,
          }),
        ])
      );

      expect(mockPrismaService.avaliacao.findMany).toHaveBeenCalledWith({
        where: { idCiclo: mockCiclo.idCiclo },
        include: {
          avaliado: { select: { unidade: true } },
        },
      });
    });

    it('deve agrupar corretamente avaliações por unidade', async () => {
      // Arrange
      const avaliacoesTI = [
        { ...mockAvaliacao1, avaliado: { unidade: 'TI' } },
        { ...mockAvaliacao2, avaliado: { unidade: 'TI' } },
        { ...mockAvaliacao3, avaliado: { unidade: 'TI' } },
      ];
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.findMany.mockResolvedValue(avaliacoesTI);

      // Act
      const resultado = await service.getProgressoPorUnidade(mockCiclo.idCiclo);

      // Assert
      expect(resultado).toHaveLength(1);
      expect(resultado[0]).toEqual({
        nomeUnidade: 'TI',
        quantConcluidas: 2, // mockAvaliacao1 e mockAvaliacao3 são CONCLUIDA
        total: 3,
      });
    });

    it('deve lidar com colaboradores sem unidade', async () => {
      // Arrange
      const avaliacoesSemUnidade = [
        { ...mockAvaliacao1, avaliado: { unidade: null } },
        { ...mockAvaliacao2, avaliado: { unidade: undefined } },
      ];
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.findMany.mockResolvedValue(avaliacoesSemUnidade);

      // Act
      const resultado = await service.getProgressoPorUnidade(mockCiclo.idCiclo);

      // Assert
      expect(resultado).toHaveLength(1);
      expect(resultado[0]).toEqual({
        nomeUnidade: 'Sem Unidade',
        quantConcluidas: 1, // apenas mockAvaliacao1 é CONCLUIDA
        total: 2,
      });
    });

    it('deve retornar array vazio quando não há avaliações', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.findMany.mockResolvedValue([]);

      // Act
      const resultado = await service.getProgressoPorUnidade(mockCiclo.idCiclo);

      // Assert
      expect(resultado).toEqual([]);
    });

    it('deve calcular percentual corretamente para múltiplas unidades', async () => {
      // Arrange
      const avaliacoesMultiplas = [
        { ...mockAvaliacao1, status: preenchimentoStatus.CONCLUIDA, avaliado: { unidade: 'TI' } },
        { ...mockAvaliacao2, status: preenchimentoStatus.PENDENTE, avaliado: { unidade: 'TI' } },
        { ...mockAvaliacao3, status: preenchimentoStatus.CONCLUIDA, avaliado: { unidade: 'RH' } },
        { ...mockAvaliacao4, status: preenchimentoStatus.CONCLUIDA, avaliado: { unidade: 'RH' } },
      ];
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.findMany.mockResolvedValue(avaliacoesMultiplas);

      // Act
      const resultado = await service.getProgressoPorUnidade(mockCiclo.idCiclo);

      // Assert
      expect(resultado).toHaveLength(2);

      expect(resultado).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nomeUnidade: 'TI',
            quantConcluidas: 1,
            total: 2,
          }),
          expect.objectContaining({
            nomeUnidade: 'RH',
            quantConcluidas: 2,
            total: 2,
          })
        ])
      );
      
    });

    it('deve incluir dados do avaliado na consulta', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.findMany.mockResolvedValue([]);

      // Act
      await service.getProgressoPorUnidade(mockCiclo.idCiclo);

      // Assert
      expect(mockPrismaService.avaliacao.findMany).toHaveBeenCalledWith({
        where: { idCiclo: mockCiclo.idCiclo },
        include: {
          avaliado: { select: { unidade: true } },
        },
      });
    });
  });

  describe('getProgressoPorTrilha', () => {
    it('deve retornar progresso de avaliações por trilha de carreira', async () => {
      // Arrange
      const avaliacoes = [
        { ...mockAvaliacao1, avaliado: { trilhaCarreira: 'Frontend' } },
        { ...mockAvaliacao2, avaliado: { trilhaCarreira: 'Backend' } },
        { ...mockAvaliacao3, avaliado: { trilhaCarreira: 'Gestão' } },
        { ...mockAvaliacao4, avaliado: { trilhaCarreira: 'Backend' } },
      ];
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.findMany.mockResolvedValue(avaliacoes);

      // Act
      const resultado = await service.getProgressoPorTrilha(mockCiclo.idCiclo);

      // Assert
      expect(resultado).toHaveLength(3);
      expect(mockPrismaService.avaliacao.findMany).toHaveBeenCalledWith({
        where: { idCiclo: mockCiclo.idCiclo },
        include: {
          avaliado: { select: { trilhaCarreira: true } },
        },
      });
    });

    it('deve agrupar corretamente avaliações por trilha', async () => {
      // Arrange
      const avaliacoesBackend = [
        { ...mockAvaliacao1, status: preenchimentoStatus.CONCLUIDA, avaliado: { trilhaCarreira: 'Backend' } },
        { ...mockAvaliacao2, status: preenchimentoStatus.PENDENTE, avaliado: { trilhaCarreira: 'Backend' } },
        { ...mockAvaliacao3, status: preenchimentoStatus.CONCLUIDA, avaliado: { trilhaCarreira: 'Backend' } },
      ];
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.findMany.mockResolvedValue(avaliacoesBackend);

      // Act
      const resultado = await service.getProgressoPorTrilha(mockCiclo.idCiclo);

      // Assert
      expect(resultado).toHaveLength(1);
      expect(resultado[0]).toEqual({
        nomeTrilha: 'Backend',
        quantConcluidas: 2,
        total: 3,
      });
    });

    it('deve lidar com colaboradores sem trilha de carreira', async () => {
      // Arrange
      const avaliacoesSemTrilha = [
        { ...mockAvaliacao1, avaliado: { trilhaCarreira: null } },
        { ...mockAvaliacao2, avaliado: { trilhaCarreira: undefined } },
        { ...mockAvaliacao3, avaliado: { trilhaCarreira: '' } },
      ];
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.findMany.mockResolvedValue(avaliacoesSemTrilha);

      // Act
      const resultado = await service.getProgressoPorTrilha(mockCiclo.idCiclo);

      // Assert
      expect(resultado).toHaveLength(1);
      expect(resultado[0]).toEqual({
        nomeTrilha: 'Sem Trilha',
        quantConcluidas: 2, // mockAvaliacao1 e mockAvaliacao3 são CONCLUIDA
        total: 3,
      });
    });

    it('deve retornar array vazio quando não há avaliações', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.findMany.mockResolvedValue([]);

      // Act
      const resultado = await service.getProgressoPorTrilha(mockCiclo.idCiclo);

      // Assert
      expect(resultado).toEqual([]);
    });

    it('deve calcular corretamente para múltiplas trilhas', async () => {
      // Arrange
      const avaliacoesMultiplas = [
        { ...mockAvaliacao1, status: preenchimentoStatus.CONCLUIDA, avaliado: { trilhaCarreira: 'Frontend' } },
        { ...mockAvaliacao2, status: preenchimentoStatus.PENDENTE, avaliado: { trilhaCarreira: 'Frontend' } },
        { ...mockAvaliacao3, status: preenchimentoStatus.CONCLUIDA, avaliado: { trilhaCarreira: 'Backend' } },
        { ...mockAvaliacao4, status: preenchimentoStatus.CONCLUIDA, avaliado: { trilhaCarreira: 'DevOps' } },
      ];
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.findMany.mockResolvedValue(avaliacoesMultiplas);

      // Act
      const resultado = await service.getProgressoPorTrilha(mockCiclo.idCiclo);

      // Assert
      expect(resultado).toHaveLength(3);
      
      expect(resultado).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nomeTrilha: 'Frontend',
            quantConcluidas: 1,
            total: 2,
          }),
          expect.objectContaining({
            nomeTrilha: 'Backend',
            quantConcluidas: 1,
            total: 1,
          }),
          expect.objectContaining({
            nomeTrilha: 'DevOps',
            quantConcluidas: 1,
            total: 1,
          })
        ])
      );
    });

    it('deve incluir dados do avaliado na consulta', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.findMany.mockResolvedValue([]);

      // Act
      await service.getProgressoPorTrilha(mockCiclo.idCiclo);

      // Assert
      expect(mockPrismaService.avaliacao.findMany).toHaveBeenCalledWith({
        where: { idCiclo: mockCiclo.idCiclo },
        include: {
          avaliado: { select: { trilhaCarreira: true } },
        },
      });
    });

    it('deve tratar string vazia como "Sem Trilha"', async () => {
      // Arrange
      const avaliacoesTrilhaVazia = [
        { ...mockAvaliacao1, avaliado: { trilhaCarreira: '' } },
      ];
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.findMany.mockResolvedValue(avaliacoesTrilhaVazia);

      // Act
      const resultado = await service.getProgressoPorTrilha(mockCiclo.idCiclo);

      // Assert
      expect(resultado).toHaveLength(1);
      expect(resultado[0]).toEqual(
        expect.objectContaining({
          nomeTrilha: 'Sem Trilha',
          quantConcluidas: expect.any(Number),
          total: expect.any(Number),
        })
      );
    });
  });

  describe('Validações e casos extremos', () => {
    it('deve lidar com múltiplas operações simultâneas', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.colaboradorCiclo.count.mockResolvedValue(5);

      // Act
      const promessas = [
        service.getQuantidadeColaboradoresPorCiclo(mockCiclo.idCiclo),
        service.getQuantidadeColaboradoresPorCiclo(mockCiclo.idCiclo),
        service.getQuantidadeColaboradoresPorCiclo(mockCiclo.idCiclo),
      ];

      const resultados = await Promise.all(promessas);

      // Assert
      expect(resultados).toHaveLength(3);
      expect(mockPrismaService.colaboradorCiclo.count).toHaveBeenCalledTimes(3);
      resultados.forEach(resultado => {
        expect(resultado).toEqual({ TotalColaboradores: 5 });
      });
    });

    it('deve manter integridade dos dados durante operações de leitura', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.colaboradorCiclo.count.mockResolvedValue(10);
      mockPrismaService.avaliacao.count
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(15);
      mockPrismaService.avaliacao.groupBy.mockResolvedValue([
        { status: preenchimentoStatus.CONCLUIDA, _count: { status: 15 } },
        { status: preenchimentoStatus.PENDENTE, _count: { status: 5 } },
      ]);

      // Act
      const colaboradores = await service.getQuantidadeColaboradoresPorCiclo(mockCiclo.idCiclo);
      const avaliacoes = await service.getQuantidadeAvaliacoesConcluidasPorCiclo(mockCiclo.idCiclo);
      const status = await service.getStatusAvaliacoesPorCiclo(mockCiclo.idCiclo);

      // Assert
      expect(colaboradores.TotalColaboradores).toBe(10);
      expect(avaliacoes.TotalAvaliacoes).toBe(20);
      expect(avaliacoes.totalConcluidas).toBe(15);
      expect(status.quantConcluidas).toBe(15);
      expect(status.quantPendentes).toBe(5);
    });

    it('deve propagar erros do Prisma corretamente', async () => {
      // Arrange
      const errorPrisma = new Error('Erro de conexão com banco de dados');
      mockPrismaService.cicloAvaliacao.findUnique.mockRejectedValue(errorPrisma);

      // Act & Assert
      await expect(service.getQuantidadeColaboradoresPorCiclo(mockCiclo.idCiclo)).rejects.toThrow(
        'Erro de conexão com banco de dados'
      );
    });

    it('deve validar UUID válido vs inválido', async () => {
      // Arrange
      const uuidValido = '123e4567-e89b-12d3-a456-426614174000';
      const uuidInvalido = 'uuid-invalido';

      mockPrismaService.cicloAvaliacao.findUnique
        .mockResolvedValueOnce(mockCiclo)  // Para UUID válido
        .mockResolvedValueOnce(null);     // Para UUID inválido

      mockPrismaService.colaboradorCiclo.count.mockResolvedValue(5);

      // Act & Assert
      const resultadoValido = await service.getQuantidadeColaboradoresPorCiclo(uuidValido);
      expect(resultadoValido).toEqual({ TotalColaboradores: 5 });

      await expect(service.getQuantidadeColaboradoresPorCiclo(uuidInvalido)).rejects.toThrow(NotFoundException);
    });

    it('deve lidar com dados de produção realistas', async () => {
      // Arrange - simula dados de produção
      const dadosProducao = {
        colaboradores: 250,
        avaliacoes: 1000,
        avaliacoesConcluidas: 780,
        unidades: 15,
      };

      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.colaboradorCiclo.count.mockResolvedValue(dadosProducao.colaboradores);
      mockPrismaService.avaliacao.count
        .mockResolvedValueOnce(dadosProducao.avaliacoes)
        .mockResolvedValueOnce(dadosProducao.avaliacoesConcluidas);
      
      const unidadesArray = Array.from({ length: dadosProducao.unidades }, (_, i) => ({ 
        unidade: `Unidade ${i + 1}` 
      }));
      mockPrismaService.colaborador.findMany.mockResolvedValue(unidadesArray);

      // Act
      const colaboradores = await service.getQuantidadeColaboradoresPorCiclo(mockCiclo.idCiclo);
      const avaliacoes = await service.getQuantidadeAvaliacoesConcluidasPorCiclo(mockCiclo.idCiclo);
      const unidades = await service.getQuantidadeUnidades();

      // Assert
      expect(colaboradores.TotalColaboradores).toBe(250);
      expect(avaliacoes.TotalAvaliacoes).toBe(1000);
      expect(avaliacoes.totalConcluidas).toBe(780);
      expect(unidades.quantidadeUnidades).toBe(15);
    });
  });

  describe('Estrutura de dados e tipos', () => {
    it('deve retornar estrutura correta para quantidade de colaboradores', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.colaboradorCiclo.count.mockResolvedValue(10);

      // Act
      const resultado = await service.getQuantidadeColaboradoresPorCiclo(mockCiclo.idCiclo);

      // Assert
      expect(resultado).toMatchObject({
        TotalColaboradores: expect.any(Number),
      });
    });

    it('deve retornar estrutura correta para quantidade de avaliações', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.count
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(15);

      // Act
      const resultado = await service.getQuantidadeAvaliacoesConcluidasPorCiclo(mockCiclo.idCiclo);

      // Assert
      expect(resultado).toMatchObject({
        TotalAvaliacoes: expect.any(Number),
        totalConcluidas: expect.any(Number),
      });
    });

    it('deve retornar estrutura correta para quantidade de unidades', async () => {
      // Arrange
      mockPrismaService.colaborador.findMany.mockResolvedValue([
        { unidade: 'TI' },
        { unidade: 'RH' },
      ]);

      // Act
      const resultado = await service.getQuantidadeUnidades();

      // Assert
      expect(resultado).toMatchObject({
        quantidadeUnidades: expect.any(Number),
      });
    });

    it('deve retornar estrutura correta para status de avaliações', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.groupBy.mockResolvedValue([]);

      // Act
      const resultado = await service.getStatusAvaliacoesPorCiclo(mockCiclo.idCiclo);

      // Assert
      expect(resultado).toMatchObject({
        quantConcluidas: expect.any(Number),
        quantPendentes: expect.any(Number),
        quantEmAndamento: expect.any(Number),
      });
    });

    it('deve retornar estrutura correta para progresso por unidade', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.findMany.mockResolvedValue([mockAvaliacao1]);

      // Act
      const resultado = await service.getProgressoPorUnidade(mockCiclo.idCiclo);

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

    it('deve retornar estrutura correta para progresso por trilha', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.findMany.mockResolvedValue([mockAvaliacao1]);

      // Act
      const resultado = await service.getProgressoPorTrilha(mockCiclo.idCiclo);

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

    it('deve manter consistência de tipos nos retornos', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.colaboradorCiclo.count.mockResolvedValue(10);

      // Act
      const resultado = await service.getQuantidadeColaboradoresPorCiclo(mockCiclo.idCiclo);

      // Assert
      expect(typeof resultado.TotalColaboradores).toBe('number');
      expect(resultado.TotalColaboradores).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance e otimização', () => {
    it('deve executar consultas em paralelo quando possível', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      
      // Simula delay nas consultas
      mockPrismaService.avaliacao.count
        .mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve(20), 100)))
        .mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve(15), 100)));

      // Act
      const inicio = Date.now();
      await service.getQuantidadeAvaliacoesConcluidasPorCiclo(mockCiclo.idCiclo);
      const fim = Date.now();

      // Assert
      // Se fossem sequenciais, levaria ~200ms. Se paralelas, ~100ms
      expect(fim - inicio).toBeLessThan(150); // Margem para variações
    });

    it('deve minimizar consultas ao banco usando distinct adequadamente', async () => {
      // Arrange
      mockPrismaService.colaborador.findMany.mockResolvedValue([
        { unidade: 'TI' },
        { unidade: 'RH' },
      ]);

      // Act
      await service.getQuantidadeUnidades();

      // Assert
      expect(mockPrismaService.colaborador.findMany).toHaveBeenCalledWith({
        where: { unidade: { not: null } },
        distinct: ['unidade'],
        select: { unidade: true },
      });
      expect(mockPrismaService.colaborador.findMany).toHaveBeenCalledTimes(1);
    });

    it('deve usar agregações do banco em vez de processamento local quando possível', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.groupBy.mockResolvedValue([]);

      // Act
      await service.getStatusAvaliacoesPorCiclo(mockCiclo.idCiclo);

      // Assert
      expect(mockPrismaService.avaliacao.groupBy).toHaveBeenCalledWith({
        by: ['status'],
        where: { idCiclo: mockCiclo.idCiclo },
        _count: { status: true },
      });
    });
  });
});