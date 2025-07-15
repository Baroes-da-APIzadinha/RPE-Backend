import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { CiclosStatus } from './cicloStatus.service';
import { PrismaService } from '../database/prismaService';
import { AvaliacoesService } from '../avaliacoes/avaliacoes.service';
import { EqualizacaoService } from '../equalizacao/equalizacao.service';
import { cicloStatus } from '@prisma/client';

describe('CiclosStatus', () => {
  let service: CiclosStatus;
  let prismaService: any;
  let avaliacoesService: jest.Mocked<AvaliacoesService>;
  let equalizacaoService: jest.Mocked<EqualizacaoService>;

  const mockPrismaService = {
    cicloAvaliacao: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockAvaliacoesService = {
    lancarAutoAvaliacoes: jest.fn(),
    lancarAvaliacaoPares: jest.fn(),
    lancarAvaliacaoColaboradorMentor: jest.fn(),
    lancarAvaliacaoLiderColaborador: jest.fn(),
  };

  const mockEqualizacaoService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CiclosStatus,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AvaliacoesService,
          useValue: mockAvaliacoesService,
        },
        {
          provide: EqualizacaoService,
          useValue: mockEqualizacaoService,
        },
      ],
    }).compile();

    service = module.get<CiclosStatus>(CiclosStatus);
    prismaService = module.get(PrismaService);
    avaliacoesService = module.get(AvaliacoesService);
    equalizacaoService = module.get(EqualizacaoService);

    // Reset all mocks before each test
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('Definição do service', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('deve retornar todos os ciclos', async () => {
      const mockCiclos = [
        {
          idCiclo: 'ciclo-1',
          nomeCiclo: 'Ciclo 2024.1',
          status: cicloStatus.AGENDADO,
          dataInicio: new Date('2024-01-01'),
          dataFim: new Date('2024-03-31'),
        },
        {
          idCiclo: 'ciclo-2',
          nomeCiclo: 'Ciclo 2024.2',
          status: cicloStatus.EM_ANDAMENTO,
          dataInicio: new Date('2024-04-01'),
          dataFim: new Date('2024-06-30'),
        },
      ];

      prismaService.cicloAvaliacao.findMany.mockResolvedValue(mockCiclos as any);

      const result = await service.findAll();

      expect(result).toEqual(mockCiclos);
      expect(prismaService.cicloAvaliacao.findMany).toHaveBeenCalledWith();
      expect(prismaService.cicloAvaliacao.findMany).toHaveBeenCalledTimes(1);
    });

    it('deve retornar array vazio quando não há ciclos', async () => {
      prismaService.cicloAvaliacao.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
      expect(prismaService.cicloAvaliacao.findMany).toHaveBeenCalledWith();
    });

    it('deve propagar erro do banco', async () => {
      const mockError = new Error('Erro de conexão com banco');
      prismaService.cicloAvaliacao.findMany.mockRejectedValue(mockError);

      await expect(service.findAll()).rejects.toThrow(mockError);
      expect(prismaService.cicloAvaliacao.findMany).toHaveBeenCalledWith();
    });
  });

  describe('updateStatus', () => {
    it('deve atualizar status do ciclo com sucesso', async () => {
      const idCiclo = 'ciclo-123';
      const novoStatus = cicloStatus.EM_ANDAMENTO;

      prismaService.cicloAvaliacao.update.mockResolvedValue({} as any);

      await service.updateStatus(idCiclo, novoStatus);

      expect(prismaService.cicloAvaliacao.update).toHaveBeenCalledWith({
        where: { idCiclo },
        data: { status: novoStatus },
      });
      expect(prismaService.cicloAvaliacao.update).toHaveBeenCalledTimes(1);
    });

    it('deve propagar erro do banco ao atualizar', async () => {
      const idCiclo = 'ciclo-123';
      const novoStatus = cicloStatus.EM_REVISAO;
      const mockError = new Error('Erro ao atualizar');

      prismaService.cicloAvaliacao.update.mockRejectedValue(mockError);

      await expect(service.updateStatus(idCiclo, novoStatus)).rejects.toThrow(mockError);
      expect(prismaService.cicloAvaliacao.update).toHaveBeenCalledWith({
        where: { idCiclo },
        data: { status: novoStatus },
      });
    });
  });

  describe('handleCron', () => {
    const createMockCiclo = (overrides = {}) => ({
      idCiclo: 'ciclo-1',
      nomeCiclo: 'Ciclo Teste',
      status: cicloStatus.AGENDADO,
      dataInicio: new Date('2024-01-01'),
      dataFim: new Date('2024-01-31'),
      duracaoEmAndamentoDias: 10,
      duracaoEmRevisaoDias: 5,
      duracaoEmEqualizacaoDias: 3,
      ...overrides,
    });

    beforeEach(() => {
      // Mock da data atual para testes consistentes
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T10:00:00Z')); // Meio do ciclo
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('deve processar ciclos sem alteração de status', async () => {
      const mockCiclo = createMockCiclo({
        status: cicloStatus.EM_ANDAMENTO,
        dataInicio: new Date('2024-01-01'),
      });

      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-03T10:00:00Z')); // Data dentro do período EM_ANDAMENTO

      prismaService.cicloAvaliacao.findMany.mockResolvedValue([mockCiclo] as any);

      await service.handleCron();

      // Não deve atualizar status pois já está correto
      expect(prismaService.cicloAvaliacao.update).not.toHaveBeenCalled();
      
      jest.useRealTimers();
    });

    it('deve transicionar de AGENDADO para EM_ANDAMENTO e lançar avaliações', async () => {
      const mockCiclo = createMockCiclo({
        status: cicloStatus.AGENDADO,
        dataInicio: new Date('2024-01-15'), // Hoje
      });

      const mockRelatorios = {
        autoAvaliacao: { lancadas: 5, existentes: 0, erros: 0 },
        avaliacaoPares: { lancadas: 3, existentes: 0, erros: 0 },
        avaliacaoMentor: { lancadas: 2, existentes: 0, erros: 0 },
      };

      prismaService.cicloAvaliacao.findMany.mockResolvedValue([mockCiclo] as any);
      avaliacoesService.lancarAutoAvaliacoes.mockResolvedValue(mockRelatorios.autoAvaliacao);
      avaliacoesService.lancarAvaliacaoPares.mockResolvedValue(mockRelatorios.avaliacaoPares);
      avaliacoesService.lancarAvaliacaoColaboradorMentor.mockResolvedValue(mockRelatorios.avaliacaoMentor);
      prismaService.cicloAvaliacao.update.mockResolvedValue({} as any);

      await service.handleCron();

      expect(avaliacoesService.lancarAutoAvaliacoes).toHaveBeenCalledWith(mockCiclo.idCiclo);
      expect(avaliacoesService.lancarAvaliacaoPares).toHaveBeenCalledWith(mockCiclo.idCiclo);
      expect(avaliacoesService.lancarAvaliacaoColaboradorMentor).toHaveBeenCalledWith(mockCiclo.idCiclo);
      expect(prismaService.cicloAvaliacao.update).toHaveBeenCalledWith({
        where: { idCiclo: mockCiclo.idCiclo },
        data: { status: cicloStatus.EM_ANDAMENTO },
      });
    });

    it('deve transicionar para EM_REVISAO e lançar avaliações de líder', async () => {
      const mockCiclo = createMockCiclo({
        status: cicloStatus.EM_ANDAMENTO,
        dataInicio: new Date('2024-01-01'),
        duracaoEmAndamentoDias: 10, // Fim em 10/01, revisão inicia em 11/01
      });

      // Simular data no período de revisão (15/01)
      jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));

      const mockRelatorio = { lancadas: 4, existentes: 0, erros: 0 };

      prismaService.cicloAvaliacao.findMany.mockResolvedValue([mockCiclo] as any);
      avaliacoesService.lancarAvaliacaoLiderColaborador.mockResolvedValue(mockRelatorio);
      prismaService.cicloAvaliacao.update.mockResolvedValue({} as any);

      await service.handleCron();

      expect(avaliacoesService.lancarAvaliacaoLiderColaborador).toHaveBeenCalledWith(mockCiclo.idCiclo);
      expect(prismaService.cicloAvaliacao.update).toHaveBeenCalledWith({
        where: { idCiclo: mockCiclo.idCiclo },
        data: { status: cicloStatus.EM_REVISAO },
      });
    });

    it('deve transicionar para EM_EQUALIZAÇÃO e criar equalizações', async () => {
      const mockCiclo = createMockCiclo({
        status: cicloStatus.EM_REVISAO,
        dataInicio: new Date('2024-01-01'),
        dataFim: new Date('2024-01-31'),
        duracaoEmAndamentoDias: 5,  // 01/01 - 05/01
        duracaoEmRevisaoDias: 5,    // 06/01 - 10/01  
        duracaoEmEqualizacaoDias: 3, // 11/01 - 13/01
      });

      // Simular data no período de equalização (11/01 - primeiro dia)
      jest.setSystemTime(new Date('2024-01-11T10:00:00Z'));

      prismaService.cicloAvaliacao.findMany.mockResolvedValue([mockCiclo] as any);
      equalizacaoService.create.mockResolvedValue({} as any);
      prismaService.cicloAvaliacao.update.mockResolvedValue({} as any);

      await service.handleCron();

      expect(equalizacaoService.create).toHaveBeenCalledWith({ idCiclo: mockCiclo.idCiclo });
      expect(prismaService.cicloAvaliacao.update).toHaveBeenCalledWith({
        where: { idCiclo: mockCiclo.idCiclo },
        data: { status: cicloStatus.EM_EQUALIZAÇÃO },
      });
    });

    it('deve transicionar para FECHADO quando ciclo termina', async () => {
      const mockCiclo = createMockCiclo({
        status: cicloStatus.EM_EQUALIZAÇÃO,
        dataInicio: new Date('2024-01-01'),
        dataFim: new Date('2024-01-13'), // Fim do ciclo na data 13
        duracaoEmAndamentoDias: 5,  // 01/01 - 05/01
        duracaoEmRevisaoDias: 5,    // 06/01 - 10/01  
        duracaoEmEqualizacaoDias: 3, // 11/01 - 13/01
      });

      // Simular data após o fim do ciclo (dataFim)
      jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));

      prismaService.cicloAvaliacao.findMany.mockResolvedValue([mockCiclo] as any);
      prismaService.cicloAvaliacao.update.mockResolvedValue({} as any);

      await service.handleCron();

      expect(prismaService.cicloAvaliacao.update).toHaveBeenCalledWith({
        where: { idCiclo: mockCiclo.idCiclo },
        data: { status: cicloStatus.FECHADO },
      });
    });

    it('deve continuar processamento mesmo com erro em avaliações', async () => {
      const mockCiclo = createMockCiclo({
        status: cicloStatus.AGENDADO,
        dataInicio: new Date('2024-01-15'), // Hoje
      });

      const mockError = new Error('Erro ao lançar avaliações');

      prismaService.cicloAvaliacao.findMany.mockResolvedValue([mockCiclo] as any);
      avaliacoesService.lancarAutoAvaliacoes.mockRejectedValue(mockError);
      prismaService.cicloAvaliacao.update.mockResolvedValue({} as any);

      await service.handleCron();

      // Deve ainda assim atualizar o status
      expect(prismaService.cicloAvaliacao.update).toHaveBeenCalledWith({
        where: { idCiclo: mockCiclo.idCiclo },
        data: { status: cicloStatus.EM_ANDAMENTO },
      });
    });

    it('deve processar múltiplos ciclos corretamente', async () => {
      const mockCiclos = [
        createMockCiclo({
          idCiclo: 'ciclo-1',
          status: cicloStatus.AGENDADO,
          dataInicio: new Date('2024-01-15'),
        }),
        createMockCiclo({
          idCiclo: 'ciclo-2',
          status: cicloStatus.EM_ANDAMENTO,
          dataInicio: new Date('2024-01-01'),
          duracaoEmAndamentoDias: 10,
        }),
      ];

      prismaService.cicloAvaliacao.findMany.mockResolvedValue(mockCiclos as any);
      avaliacoesService.lancarAutoAvaliacoes.mockResolvedValue({ lancadas: 1, existentes: 0, erros: 0 });
      avaliacoesService.lancarAvaliacaoPares.mockResolvedValue({ lancadas: 1, existentes: 0, erros: 0 });
      avaliacoesService.lancarAvaliacaoColaboradorMentor.mockResolvedValue({ lancadas: 1, existentes: 0, erros: 0 });
      avaliacoesService.lancarAvaliacaoLiderColaborador.mockResolvedValue({ lancadas: 1, existentes: 0, erros: 0 });
      prismaService.cicloAvaliacao.update.mockResolvedValue({} as any);

      // Data no período de revisão para ciclo-2
      jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));

      await service.handleCron();

      expect(prismaService.cicloAvaliacao.update).toHaveBeenCalledTimes(2);
      expect(prismaService.cicloAvaliacao.update).toHaveBeenNthCalledWith(1, {
        where: { idCiclo: 'ciclo-1' },
        data: { status: cicloStatus.EM_ANDAMENTO },
      });
      expect(prismaService.cicloAvaliacao.update).toHaveBeenNthCalledWith(2, {
        where: { idCiclo: 'ciclo-2' },
        data: { status: cicloStatus.EM_REVISAO },
      });
    });

    it('deve lidar com ciclo sem durações válidas', async () => {
      const mockCiclo = createMockCiclo({
        duracaoEmAndamentoDias: 0,
        duracaoEmRevisaoDias: 0,
        duracaoEmEqualizacaoDias: 0,
      });

      prismaService.cicloAvaliacao.findMany.mockResolvedValue([mockCiclo] as any);

      await expect(service.handleCron()).resolves.not.toThrow();
    });

    it('deve manter status quando não há mudança necessária', async () => {
      const mockCiclo = createMockCiclo({
        status: cicloStatus.FECHADO,
        dataInicio: new Date('2024-01-01'),
        dataFim: new Date('2024-01-10'),
      });

      // Data após o fim
      jest.setSystemTime(new Date('2024-01-20T10:00:00Z'));

      prismaService.cicloAvaliacao.findMany.mockResolvedValue([mockCiclo] as any);

      await service.handleCron();

      // Não deve chamar update pois status já está correto
      expect(prismaService.cicloAvaliacao.update).not.toHaveBeenCalled();
    });
  });

  describe('Cálculo de datas e transições', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('deve calcular corretamente as fases do ciclo', async () => {
      const mockCiclo = {
        idCiclo: 'ciclo-1',
        nomeCiclo: 'Teste',
        status: cicloStatus.AGENDADO,
        dataInicio: new Date('2024-01-01'),
        dataFim: new Date('2024-01-13'),    // Fim do ciclo na data 13
        duracaoEmAndamentoDias: 5,   // 01/01 - 05/01
        duracaoEmRevisaoDias: 5,     // 06/01 - 10/01
        duracaoEmEqualizacaoDias: 3, // 11/01 - 13/01
      };

      // Testar cada fase
      const testCases = [
        { data: '2023-12-31', expectedStatus: cicloStatus.AGENDADO },
        { data: '2024-01-03', expectedStatus: cicloStatus.EM_ANDAMENTO },
        { data: '2024-01-08', expectedStatus: cicloStatus.EM_REVISAO },
        { data: '2024-01-12', expectedStatus: cicloStatus.EM_EQUALIZAÇÃO },
        { data: '2024-01-15', expectedStatus: cicloStatus.FECHADO }, // Após dataFim
      ];

      for (const testCase of testCases) {
        jest.setSystemTime(new Date(testCase.data + 'T10:00:00Z'));
        
        prismaService.cicloAvaliacao.findMany.mockResolvedValue([{
          ...mockCiclo,
          status: cicloStatus.AGENDADO, // Sempre começar do AGENDADO
        }] as any);
        
        if (testCase.expectedStatus !== cicloStatus.AGENDADO) {
          prismaService.cicloAvaliacao.update.mockResolvedValue({} as any);
          avaliacoesService.lancarAutoAvaliacoes.mockResolvedValue({ lancadas: 0, existentes: 0, erros: 0 });
          avaliacoesService.lancarAvaliacaoPares.mockResolvedValue({ lancadas: 0, existentes: 0, erros: 0 });
          avaliacoesService.lancarAvaliacaoColaboradorMentor.mockResolvedValue({ lancadas: 0, existentes: 0, erros: 0 });
          avaliacoesService.lancarAvaliacaoLiderColaborador.mockResolvedValue({ lancadas: 0, existentes: 0, erros: 0 });
          equalizacaoService.create.mockResolvedValue({} as any);
        }

        await service.handleCron();

        if (testCase.expectedStatus !== cicloStatus.AGENDADO) {
          expect(prismaService.cicloAvaliacao.update).toHaveBeenCalledWith({
            where: { idCiclo: mockCiclo.idCiclo },
            data: { status: testCase.expectedStatus },
          });
        }

        jest.clearAllMocks();
      }
    });
  });

  describe('Integração com services externos', () => {
    it('deve chamar todos os métodos de avaliação para EM_ANDAMENTO', async () => {
      const mockCiclo = {
        idCiclo: 'ciclo-1',
        nomeCiclo: 'Teste',
        status: cicloStatus.AGENDADO,
        dataInicio: new Date('2024-01-15'),
        dataFim: new Date('2024-01-31'),
        duracaoEmAndamentoDias: 10,
        duracaoEmRevisaoDias: 5,
        duracaoEmEqualizacaoDias: 3,
      };

      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));

      prismaService.cicloAvaliacao.findMany.mockResolvedValue([mockCiclo] as any);
      avaliacoesService.lancarAutoAvaliacoes.mockResolvedValue({ lancadas: 1, existentes: 0, erros: 0 });
      avaliacoesService.lancarAvaliacaoPares.mockResolvedValue({ lancadas: 1, existentes: 0, erros: 0 });
      avaliacoesService.lancarAvaliacaoColaboradorMentor.mockResolvedValue({ lancadas: 1, existentes: 0, erros: 0 });
      prismaService.cicloAvaliacao.update.mockResolvedValue({} as any);

      await service.handleCron();

      expect(avaliacoesService.lancarAutoAvaliacoes).toHaveBeenCalledWith(mockCiclo.idCiclo);
      expect(avaliacoesService.lancarAvaliacaoPares).toHaveBeenCalledWith(mockCiclo.idCiclo);
      expect(avaliacoesService.lancarAvaliacaoColaboradorMentor).toHaveBeenCalledWith(mockCiclo.idCiclo);

      jest.useRealTimers();
    });

    it('deve chamar create do EqualizacaoService para EM_EQUALIZAÇÃO', async () => {
      const mockCiclo = {
        idCiclo: 'ciclo-1',
        nomeCiclo: 'Teste',
        status: cicloStatus.EM_REVISAO,
        dataInicio: new Date('2024-01-01'),
        dataFim: new Date('2024-01-31'),
        duracaoEmAndamentoDias: 5,  // 01/01 - 05/01
        duracaoEmRevisaoDias: 5,    // 06/01 - 10/01
        duracaoEmEqualizacaoDias: 3, // 11/01 - 13/01
      };

      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-12T10:00:00Z'));

      prismaService.cicloAvaliacao.findMany.mockResolvedValue([mockCiclo] as any);
      equalizacaoService.create.mockResolvedValue({} as any);
      prismaService.cicloAvaliacao.update.mockResolvedValue({} as any);

      await service.handleCron();

      expect(equalizacaoService.create).toHaveBeenCalledWith({ idCiclo: mockCiclo.idCiclo });

      jest.useRealTimers();
    });
  });

  describe('Logging e tratamento de erros', () => {
    it('deve logar informações durante o processamento', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'debug');
      const loggerLogSpy = jest.spyOn(service['logger'], 'log');

      prismaService.cicloAvaliacao.findMany.mockResolvedValue([]);

      await service.handleCron();

      expect(loggerSpy).toHaveBeenCalledWith('Verificando status dos ciclos...');
      expect(loggerSpy).toHaveBeenCalledWith('Verificação de status dos ciclos concluída.');
    });

    it('deve logar erro quando service falha', async () => {
      const loggerErrorSpy = jest.spyOn(service['logger'], 'error');
      const mockCiclo = {
        idCiclo: 'ciclo-1',
        nomeCiclo: 'Teste',
        status: cicloStatus.AGENDADO,
        dataInicio: new Date('2024-01-15'),
        dataFim: new Date('2024-01-31'),
        duracaoEmAndamentoDias: 10,
        duracaoEmRevisaoDias: 5,
        duracaoEmEqualizacaoDias: 3,
      };

      const mockError = new Error('Falha no service');

      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));

      prismaService.cicloAvaliacao.findMany.mockResolvedValue([mockCiclo] as any);
      avaliacoesService.lancarAutoAvaliacoes.mockRejectedValue(mockError);
      prismaService.cicloAvaliacao.update.mockResolvedValue({} as any);

      await service.handleCron();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `Erro ao processar avaliações/equalizações para o ciclo ${mockCiclo.nomeCiclo}:`,
        mockError
      );

      jest.useRealTimers();
    });
  });
});
