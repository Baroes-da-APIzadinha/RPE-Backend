import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { SincronizacaoService } from './sincronizacao.service';
import { PrismaService } from '../database/prismaService';
import { of, throwError } from 'rxjs';
import { projetoStatus } from '@prisma/client';

describe('SincronizacaoService', () => {
  let service: SincronizacaoService;
  let httpService: HttpService;
  let prismaService: PrismaService;
  let loggerSpy: jest.SpyInstance;

  // Mock do HttpService
  const mockHttpService = {
    get: jest.fn(),
  };

  // Mock do PrismaService
  const mockPrismaService = {
    colaborador: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    projeto: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    alocacaoColaboradorProjeto: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  };

  // Dados de teste para ERP
  const mockColaboradoresErp = [
    {
      id: 'erp-1',
      nomeCompleto: 'João Silva',
      email: 'joao@empresa.com',
      cargo: 'Desenvolvedor',
      unidade: 'TI',
      trilhaCarreira: 'Técnica',
    },
    {
      id: 'erp-2',
      nomeCompleto: 'Maria Santos',
      email: 'maria@empresa.com',
      cargo: 'Analista',
      unidade: 'RH',
      trilhaCarreira: 'Gestão',
    },
  ];

  const mockProjetosErp = [
    {
      id: 'proj-1',
      nomeProjeto: 'Projeto Alpha',
      status: projetoStatus.EM_ANDAMENTO,
      idLider: 'erp-1',
    },
    {
      id: 'proj-2',
      nomeProjeto: 'Projeto Beta',
      status: projetoStatus.PLANEJADO,
      idLider: null,
    },
  ];

  const mockAlocacoesErp = [
    {
      id: 'aloc-1',
      idColaborador: 'erp-1',
      idProjeto: 'proj-1',
      dataEntrada: '2026-01-01',
      dataSaida: null,
    },
    {
      id: 'aloc-2',
      idColaborador: 'erp-2',
      idProjeto: 'proj-2',
      dataEntrada: '2026-02-01',
      dataSaida: '2026-06-30',
    },
  ];

  // Dados de teste para RPE
  const mockColaboradoresRpe = [
    {
      idColaborador: 'rpe-1',
      email: 'joao@empresa.com',
    },
    {
      idColaborador: 'rpe-2',
      email: 'maria@empresa.com',
    },
  ];

  const mockProjetosRpe = [
    {
      idProjeto: 'rpe-proj-1',
      nomeProjeto: 'Projeto Alpha',
    },
    {
      idProjeto: 'rpe-proj-2',
      nomeProjeto: 'Projeto Beta',
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SincronizacaoService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SincronizacaoService>(SincronizacaoService);
    httpService = module.get<HttpService>(HttpService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Mock do Logger
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Definição do service', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('deve ter HttpService injetado', () => {
      expect(httpService).toBeDefined();
    });

    it('deve ter PrismaService injetado', () => {
      expect(prismaService).toBeDefined();
    });
  });

  describe('handleCronSincronizacao', () => {
    it('deve executar sincronização completa com sucesso', async () => {
      // Arrange
      const mockResponses = [
        { data: mockColaboradoresErp },
        { data: mockProjetosErp },
        { data: mockAlocacoesErp },
      ];

      mockHttpService.get
        .mockReturnValueOnce(of(mockResponses[0]))
        .mockReturnValueOnce(of(mockResponses[1]))
        .mockReturnValueOnce(of(mockResponses[2]));

      // Mocks para sincronização de colaboradores
      mockPrismaService.colaborador.upsert.mockResolvedValue({});
      mockPrismaService.colaborador.deleteMany.mockResolvedValue({ count: 0 });

      // Mocks para sincronização de projetos
      mockPrismaService.colaborador.findMany.mockResolvedValue(mockColaboradoresRpe);
      mockPrismaService.projeto.upsert.mockResolvedValue({});
      mockPrismaService.projeto.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.projeto.findMany.mockResolvedValue(mockProjetosRpe);

      // Mocks para sincronização de alocações
      mockPrismaService.alocacaoColaboradorProjeto.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.alocacaoColaboradorProjeto.createMany.mockResolvedValue({ count: 2 });

      // Act
      await service.handleCronSincronizacao();

      // Assert
      expect(mockHttpService.get).toHaveBeenCalledTimes(3);
      expect(mockHttpService.get).toHaveBeenCalledWith('http://localhost:3001/colaboradores');
      expect(mockHttpService.get).toHaveBeenCalledWith('http://localhost:3001/projetos');
      expect(mockHttpService.get).toHaveBeenCalledWith('http://localhost:3001/alocacoes');

      expect(loggerSpy).toHaveBeenCalledWith('🚀 Iniciando rotina de sincronização completa com o ERP...');
      expect(loggerSpy).toHaveBeenCalledWith('🔍 Encontrados no ERP: 2 colaboradores, 2 projetos, 2 alocações.');
      expect(loggerSpy).toHaveBeenCalledWith('✅ Sincronização completa com o ERP concluída com sucesso!');
    });

    it('deve tratar erro na comunicação com ERP', async () => {
      // Arrange
      const httpError = new Error('Connection timeout');
      mockHttpService.get.mockReturnValue(throwError(() => httpError));

      // Act
      await service.handleCronSincronizacao();

      // Assert
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        '❌ Falha na sincronização com o ERP.',
        httpError.stack
      );
    });

    it('deve tratar erro em uma das sincronizações', async () => {
      // Arrange
      const mockResponses = [
        { data: mockColaboradoresErp },
        { data: mockProjetosErp },
        { data: mockAlocacoesErp },
      ];

      mockHttpService.get
        .mockReturnValueOnce(of(mockResponses[0]))
        .mockReturnValueOnce(of(mockResponses[1]))
        .mockReturnValueOnce(of(mockResponses[2]));

      const dbError = new Error('Database error');
      mockPrismaService.colaborador.upsert.mockRejectedValue(dbError);

      // Act
      await service.handleCronSincronizacao();

      // Assert
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        '❌ Falha na sincronização com o ERP.',
        dbError.stack
      );
    });

    it('deve executar requisições HTTP em paralelo', async () => {
      // Arrange
      const mockResponses = [
        { data: mockColaboradoresErp },
        { data: mockProjetosErp },
        { data: mockAlocacoesErp },
      ];

      mockHttpService.get
        .mockReturnValueOnce(of(mockResponses[0]))
        .mockReturnValueOnce(of(mockResponses[1]))
        .mockReturnValueOnce(of(mockResponses[2]));

      // Mocks básicos para não quebrar
      mockPrismaService.colaborador.upsert.mockResolvedValue({});
      mockPrismaService.colaborador.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.colaborador.findMany.mockResolvedValue(mockColaboradoresRpe);
      mockPrismaService.projeto.upsert.mockResolvedValue({});
      mockPrismaService.projeto.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.projeto.findMany.mockResolvedValue(mockProjetosRpe);
      mockPrismaService.alocacaoColaboradorProjeto.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.alocacaoColaboradorProjeto.createMany.mockResolvedValue({ count: 2 });

      // Act
      await service.handleCronSincronizacao();

      // Assert - Verifica que as 3 chamadas HTTP foram feitas
      expect(mockHttpService.get).toHaveBeenCalledTimes(3);
    });
  });

  describe('sincronizarColaboradores', () => {
    it('deve criar e atualizar colaboradores do ERP', async () => {
      // Arrange
      mockPrismaService.colaborador.upsert.mockResolvedValue({});
      mockPrismaService.colaborador.deleteMany.mockResolvedValue({ count: 0 });

      // Act
      await (service as any).sincronizarColaboradores(mockColaboradoresErp);

      // Assert
      expect(mockPrismaService.colaborador.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.colaborador.upsert).toHaveBeenCalledWith({
        where: { email: 'joao@empresa.com' },
        update: {
          nomeCompleto: 'João Silva',
          cargo: 'Desenvolvedor',
          unidade: 'TI',
          trilhaCarreira: 'Técnica',
        },
        create: {
          email: 'joao@empresa.com',
          nomeCompleto: 'João Silva',
          cargo: 'Desenvolvedor',
          unidade: 'TI',
          trilhaCarreira: 'Técnica',
          senha: 'senha_padrao_para_novos_usuarios_do_erp',
        },
      });

      expect(mockPrismaService.colaborador.deleteMany).toHaveBeenCalledWith({
        where: {
          email: {
            notIn: ['joao@empresa.com', 'maria@empresa.com'],
          },
        },
      });
    });

    it('deve remover colaboradores órfãos', async () => {
      // Arrange
      mockPrismaService.colaborador.upsert.mockResolvedValue({});
      mockPrismaService.colaborador.deleteMany.mockResolvedValue({ count: 3 });

      // Act
      await (service as any).sincronizarColaboradores(mockColaboradoresErp);

      // Assert
      expect(mockPrismaService.colaborador.deleteMany).toHaveBeenCalledWith({
        where: {
          email: {
            notIn: ['joao@empresa.com', 'maria@empresa.com'],
          },
        },
      });

      expect(loggerSpy).toHaveBeenCalledWith('  - ✔️ 3 colaboradores órfãos removidos.');
    });

    it('deve tratar lista vazia de colaboradores', async () => {
      // Arrange
      mockPrismaService.colaborador.deleteMany.mockResolvedValue({ count: 0 });

      // Act
      await (service as any).sincronizarColaboradores([]);

      // Assert
      expect(mockPrismaService.colaborador.upsert).not.toHaveBeenCalled();
      expect(mockPrismaService.colaborador.deleteMany).toHaveBeenCalledWith({
        where: {
          email: {
            notIn: [],
          },
        },
      });
    });

    it('deve propagar erro do Prisma', async () => {
      // Arrange
      const prismaError = new Error('Database connection failed');
      mockPrismaService.colaborador.upsert.mockRejectedValue(prismaError);

      // Act & Assert
      await expect((service as any).sincronizarColaboradores(mockColaboradoresErp)).rejects.toThrow(prismaError);
    });
  });

  describe('sincronizarProjetos', () => {
    beforeEach(() => {
      mockPrismaService.colaborador.findMany.mockResolvedValue(mockColaboradoresRpe);
    });

    it('deve criar e atualizar projetos do ERP', async () => {
      // Arrange
      mockPrismaService.projeto.upsert.mockResolvedValue({});
      mockPrismaService.projeto.deleteMany.mockResolvedValue({ count: 0 });

      // Act
      await (service as any).sincronizarProjetos(mockProjetosErp, mockColaboradoresErp);

      // Assert
      expect(mockPrismaService.projeto.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.projeto.upsert).toHaveBeenCalledWith({
        where: { nomeProjeto: 'Projeto Alpha' },
        update: { status: projetoStatus.EM_ANDAMENTO, idLider: 'rpe-1' },
        create: { nomeProjeto: 'Projeto Alpha', status: projetoStatus.EM_ANDAMENTO, idLider: 'rpe-1' },
      });

      expect(mockPrismaService.projeto.upsert).toHaveBeenCalledWith({
        where: { nomeProjeto: 'Projeto Beta' },
        update: { status: projetoStatus.PLANEJADO, idLider: undefined },
        create: { nomeProjeto: 'Projeto Beta', status: projetoStatus.PLANEJADO, idLider: undefined },
      });
    });

    it('deve sincronizar projeto sem líder', async () => {
      // Arrange
      const projetoSemLider = [{
        id: 'proj-3',
        nomeProjeto: 'Projeto Sem Líder',
        status: projetoStatus.PLANEJADO,
        idLider: null,
      }];

      mockPrismaService.projeto.upsert.mockResolvedValue({});
      mockPrismaService.projeto.deleteMany.mockResolvedValue({ count: 0 });

      // Act
      await (service as any).sincronizarProjetos(projetoSemLider, mockColaboradoresErp);

      // Assert
      expect(mockPrismaService.projeto.upsert).toHaveBeenCalledWith({
        where: { nomeProjeto: 'Projeto Sem Líder' },
        update: { status: projetoStatus.PLANEJADO, idLider: undefined },
        create: { nomeProjeto: 'Projeto Sem Líder', status: projetoStatus.PLANEJADO, idLider: undefined },
      });
    });

    it('deve remover projetos órfãos', async () => {
      // Arrange
      mockPrismaService.projeto.upsert.mockResolvedValue({});
      mockPrismaService.projeto.deleteMany.mockResolvedValue({ count: 2 });

      // Act
      await (service as any).sincronizarProjetos(mockProjetosErp, mockColaboradoresErp);

      // Assert
      expect(mockPrismaService.projeto.deleteMany).toHaveBeenCalledWith({
        where: {
          nomeProjeto: {
            notIn: ['Projeto Alpha', 'Projeto Beta'],
          },
        },
      });

      expect(loggerSpy).toHaveBeenCalledWith('  - ✔️ 2 projetos órfãos removidos.');
    });

    it('deve funcionar sem colaboradores fornecidos', async () => {
      // Arrange
      mockPrismaService.projeto.upsert.mockResolvedValue({});
      mockPrismaService.projeto.deleteMany.mockResolvedValue({ count: 0 });

      // Act
      await (service as any).sincronizarProjetos(mockProjetosErp);

      // Assert
      expect(mockPrismaService.colaborador.findMany).toHaveBeenCalled();
      expect(mockPrismaService.projeto.upsert).toHaveBeenCalledTimes(2);
    });

    it('deve propagar erro do Prisma', async () => {
      // Arrange
      const prismaError = new Error('Constraint violation');
      mockPrismaService.projeto.upsert.mockRejectedValue(prismaError);

      // Act & Assert
      await expect((service as any).sincronizarProjetos(mockProjetosErp, mockColaboradoresErp)).rejects.toThrow(prismaError);
    });
  });

  describe('sincronizarAlocacoes', () => {
    beforeEach(() => {
      mockPrismaService.colaborador.findMany.mockResolvedValue(mockColaboradoresRpe);
      mockPrismaService.projeto.findMany.mockResolvedValue(mockProjetosRpe);
    });

    it('deve sincronizar alocações com sucesso', async () => {
      // Arrange
      mockPrismaService.alocacaoColaboradorProjeto.deleteMany.mockResolvedValue({ count: 5 });
      mockPrismaService.alocacaoColaboradorProjeto.createMany.mockResolvedValue({ count: 2 });

      // Act
      await (service as any).sincronizarAlocacoes(mockAlocacoesErp, mockColaboradoresErp, mockProjetosErp);

      // Assert
      expect(mockPrismaService.alocacaoColaboradorProjeto.deleteMany).toHaveBeenCalledWith({});
      expect(loggerSpy).toHaveBeenCalledWith('  - ✔️ 5 alocações antigas removidas.');

      expect(mockPrismaService.alocacaoColaboradorProjeto.createMany).toHaveBeenCalledWith({
        data: [
          {
            idColaborador: 'rpe-1',
            idProjeto: 'rpe-proj-1',
            dataEntrada: new Date('2026-01-01'),
            dataSaida: null,
          },
          {
            idColaborador: 'rpe-2',
            idProjeto: 'rpe-proj-2',
            dataEntrada: new Date('2026-02-01'),
            dataSaida: new Date('2026-06-30'),
          },
        ],
      });

      expect(loggerSpy).toHaveBeenCalledWith('  - ✔️ 2 novas alocações inseridas.');
    });

    it('deve tratar alocação com colaborador ou projeto inexistente', async () => {
      // Arrange
      const alocacoesComDadosInvalidos = [
        {
          id: 'aloc-invalid',
          idColaborador: 'erp-inexistente',
          idProjeto: 'proj-1',
          dataEntrada: '2026-01-01',
          dataSaida: null,
        },
      ];

      mockPrismaService.alocacaoColaboradorProjeto.deleteMany.mockResolvedValue({ count: 0 });

      // Act
      await (service as any).sincronizarAlocacoes(alocacoesComDadosInvalidos, mockColaboradoresErp, mockProjetosErp);

      // Assert
      expect(mockPrismaService.alocacaoColaboradorProjeto.deleteMany).toHaveBeenCalledWith({});
      // Como não conseguiu mapear os IDs, não chama createMany
      expect(mockPrismaService.alocacaoColaboradorProjeto.createMany).not.toHaveBeenCalled();
    });

    it('deve funcionar com lista vazia de alocações', async () => {
      // Arrange
      mockPrismaService.alocacaoColaboradorProjeto.deleteMany.mockResolvedValue({ count: 0 });

      // Act
      await (service as any).sincronizarAlocacoes([], mockColaboradoresErp, mockProjetosErp);

      // Assert
      expect(mockPrismaService.alocacaoColaboradorProjeto.deleteMany).toHaveBeenCalledWith({});
      expect(mockPrismaService.alocacaoColaboradorProjeto.createMany).not.toHaveBeenCalled();
    });

    it('deve converter datas corretamente', async () => {
      // Arrange
      const alocacaoComDatas = [{
        id: 'aloc-test',
        idColaborador: 'erp-1',
        idProjeto: 'proj-1',
        dataEntrada: '2026-03-15',
        dataSaida: '2026-09-30',
      }];

      mockPrismaService.alocacaoColaboradorProjeto.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.alocacaoColaboradorProjeto.createMany.mockResolvedValue({ count: 1 });

      // Act
      await (service as any).sincronizarAlocacoes(alocacaoComDatas, mockColaboradoresErp, mockProjetosErp);

      // Assert
      expect(mockPrismaService.alocacaoColaboradorProjeto.createMany).toHaveBeenCalledWith({
        data: [{
          idColaborador: 'rpe-1',
          idProjeto: 'rpe-proj-1',
          dataEntrada: new Date('2026-03-15'),
          dataSaida: new Date('2026-09-30'),
        }],
      });
    });

    it('deve propagar erro do Prisma', async () => {
      // Arrange
      const prismaError = new Error('Foreign key constraint');
      mockPrismaService.alocacaoColaboradorProjeto.deleteMany.mockRejectedValue(prismaError);

      // Act & Assert
      await expect((service as any).sincronizarAlocacoes(mockAlocacoesErp, mockColaboradoresErp, mockProjetosErp)).rejects.toThrow(prismaError);
    });
  });

  describe('Testes de integração e mapeamento', () => {
    it('deve mapear IDs do ERP para IDs do RPE corretamente', async () => {
      // Arrange
      mockPrismaService.colaborador.findMany.mockResolvedValue([
        { idColaborador: 'uuid-1', email: 'joao@empresa.com' },
        { idColaborador: 'uuid-2', email: 'maria@empresa.com' },
      ]);

      mockPrismaService.projeto.findMany.mockResolvedValue([
        { idProjeto: 'proj-uuid-1', nomeProjeto: 'Projeto Alpha' },
      ]);

      mockPrismaService.alocacaoColaboradorProjeto.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.alocacaoColaboradorProjeto.createMany.mockResolvedValue({ count: 1 });

      const alocacao = [{
        id: 'aloc-1',
        idColaborador: 'erp-1', // João
        idProjeto: 'proj-1', // Projeto Alpha
        dataEntrada: '2026-01-01',
        dataSaida: null,
      }];

      // Act
      await (service as any).sincronizarAlocacoes(alocacao, mockColaboradoresErp, mockProjetosErp);

      // Assert
      expect(mockPrismaService.alocacaoColaboradorProjeto.createMany).toHaveBeenCalledWith({
        data: [{
          idColaborador: 'uuid-1', // Mapeado para UUID do RPE
          idProjeto: 'proj-uuid-1', // Mapeado para UUID do RPE
          dataEntrada: new Date('2026-01-01'),
          dataSaida: null,
        }],
      });
    });

    it('deve funcionar com diferentes status de projeto', async () => {
      // Arrange
      const projetosComDiferentesStatus = [
        { id: 'p1', nomeProjeto: 'Projeto Planejado', status: projetoStatus.PLANEJADO },
        { id: 'p2', nomeProjeto: 'Projeto Em Andamento', status: projetoStatus.EM_ANDAMENTO },
        { id: 'p3', nomeProjeto: 'Projeto Concluído', status: projetoStatus.CONCLUIDO },
        { id: 'p4', nomeProjeto: 'Projeto Cancelado', status: projetoStatus.CANCELADO },
      ];

      mockPrismaService.colaborador.findMany.mockResolvedValue([]);
      mockPrismaService.projeto.upsert.mockResolvedValue({});
      mockPrismaService.projeto.deleteMany.mockResolvedValue({ count: 0 });

      // Act
      await (service as any).sincronizarProjetos(projetosComDiferentesStatus, []);

      // Assert
      expect(mockPrismaService.projeto.upsert).toHaveBeenCalledTimes(4);
      projetosComDiferentesStatus.forEach(projeto => {
        expect(mockPrismaService.projeto.upsert).toHaveBeenCalledWith({
          where: { nomeProjeto: projeto.nomeProjeto },
          update: { status: projeto.status, idLider: undefined },
          create: { nomeProjeto: projeto.nomeProjeto, status: projeto.status, idLider: undefined },
        });
      });
    });

    it('deve executar sincronização na ordem correta', async () => {
      // Arrange
      const mockResponses = [
        { data: mockColaboradoresErp },
        { data: mockProjetosErp },
        { data: mockAlocacoesErp },
      ];

      mockHttpService.get
        .mockReturnValueOnce(of(mockResponses[0]))
        .mockReturnValueOnce(of(mockResponses[1]))
        .mockReturnValueOnce(of(mockResponses[2]));

      const callOrder: string[] = [];

      // Mock com rastreamento de ordem
      mockPrismaService.colaborador.upsert.mockImplementation(() => {
        callOrder.push('colaborador.upsert');
        return Promise.resolve({});
      });

      mockPrismaService.projeto.upsert.mockImplementation(() => {
        callOrder.push('projeto.upsert');
        return Promise.resolve({});
      });

      mockPrismaService.alocacaoColaboradorProjeto.createMany.mockImplementation(() => {
        callOrder.push('alocacao.createMany');
        return Promise.resolve({ count: 0 });
      });

      // Outros mocks necessários
      mockPrismaService.colaborador.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.colaborador.findMany.mockResolvedValue(mockColaboradoresRpe);
      mockPrismaService.projeto.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.projeto.findMany.mockResolvedValue(mockProjetosRpe);
      mockPrismaService.alocacaoColaboradorProjeto.deleteMany.mockResolvedValue({ count: 0 });

      // Act
      await service.handleCronSincronizacao();

      // Assert - Verifica que colaboradores foram processados antes de projetos e alocações
      const colaboradorIndex = callOrder.findIndex(call => call === 'colaborador.upsert');
      const projetoIndex = callOrder.findIndex(call => call === 'projeto.upsert');
      const alocacaoIndex = callOrder.findIndex(call => call === 'alocacao.createMany');

      expect(colaboradorIndex).toBeLessThan(projetoIndex);
      expect(projetoIndex).toBeLessThan(alocacaoIndex);
    });
  });

  describe('Logs e monitoramento', () => {
    it('deve gerar logs corretos durante sincronização bem-sucedida', async () => {
      // Arrange
      const mockResponses = [
        { data: mockColaboradoresErp },
        { data: mockProjetosErp },
        { data: mockAlocacoesErp },
      ];

      mockHttpService.get
        .mockReturnValueOnce(of(mockResponses[0]))
        .mockReturnValueOnce(of(mockResponses[1]))
        .mockReturnValueOnce(of(mockResponses[2]));

      // Mocks básicos
      mockPrismaService.colaborador.upsert.mockResolvedValue({});
      mockPrismaService.colaborador.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaService.colaborador.findMany.mockResolvedValue(mockColaboradoresRpe);
      mockPrismaService.projeto.upsert.mockResolvedValue({});
      mockPrismaService.projeto.deleteMany.mockResolvedValue({ count: 2 });
      mockPrismaService.projeto.findMany.mockResolvedValue(mockProjetosRpe);
      mockPrismaService.alocacaoColaboradorProjeto.deleteMany.mockResolvedValue({ count: 3 });
      mockPrismaService.alocacaoColaboradorProjeto.createMany.mockResolvedValue({ count: 2 });

      // Act
      await service.handleCronSincronizacao();

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('🚀 Iniciando rotina de sincronização completa com o ERP...');
      expect(loggerSpy).toHaveBeenCalledWith('🔍 Encontrados no ERP: 2 colaboradores, 2 projetos, 2 alocações.');
      expect(loggerSpy).toHaveBeenCalledWith('  - ✔️ 2 colaboradores sincronizados (criados/atualizados).');
      expect(loggerSpy).toHaveBeenCalledWith('  - ✔️ 1 colaboradores órfãos removidos.');
      expect(loggerSpy).toHaveBeenCalledWith('  - ✔️ 2 projetos sincronizados (criados/atualizados).');
      expect(loggerSpy).toHaveBeenCalledWith('  - ✔️ 2 projetos órfãos removidos.');
      expect(loggerSpy).toHaveBeenCalledWith('  - ✔️ 3 alocações antigas removidas.');
      expect(loggerSpy).toHaveBeenCalledWith('  - ✔️ 2 novas alocações inseridas.');
      expect(loggerSpy).toHaveBeenCalledWith('✅ Sincronização completa com o ERP concluída com sucesso!');
    });

    it('deve gerar log de erro quando a sincronização falha', async () => {
      // Arrange
      const httpError = new Error('Network error');
      httpError.stack = 'Error stack trace';
      mockHttpService.get.mockReturnValue(throwError(() => httpError));

      // Act
      await service.handleCronSincronizacao();

      // Assert
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        '❌ Falha na sincronização com o ERP.',
        'Error stack trace'
      );
    });
  });

  describe('Casos edge e validações', () => {
    it('deve funcionar com dados vazios do ERP', async () => {
      // Arrange
      const mockResponses = [
        { data: [] },
        { data: [] },
        { data: [] },
      ];

      mockHttpService.get
        .mockReturnValueOnce(of(mockResponses[0]))
        .mockReturnValueOnce(of(mockResponses[1]))
        .mockReturnValueOnce(of(mockResponses[2]));

      mockPrismaService.colaborador.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.colaborador.findMany.mockResolvedValue([]);
      mockPrismaService.projeto.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.projeto.findMany.mockResolvedValue([]);
      mockPrismaService.alocacaoColaboradorProjeto.deleteMany.mockResolvedValue({ count: 0 });

      // Act
      await service.handleCronSincronizacao();

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('🔍 Encontrados no ERP: 0 colaboradores, 0 projetos, 0 alocações.');
      expect(mockPrismaService.alocacaoColaboradorProjeto.createMany).not.toHaveBeenCalled();
    });

    it('deve tratar resposta HTTP com estrutura inesperada', async () => {
      // Arrange
      const mockResponses = [
        { data: null },
        { data: undefined },
        { data: 'invalid' },
      ];

      mockHttpService.get
        .mockReturnValueOnce(of(mockResponses[0]))
        .mockReturnValueOnce(of(mockResponses[1]))
        .mockReturnValueOnce(of(mockResponses[2]));

      // Act
      await service.handleCronSincronizacao();

      // Assert - Deve logar erro ao tentar processar dados inválidos
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        '❌ Falha na sincronização com o ERP.',
        expect.any(String)
      );
    });
  });
});
