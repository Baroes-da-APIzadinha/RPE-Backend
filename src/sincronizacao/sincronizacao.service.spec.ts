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

  // Mock do PrismaService (baseado no service atual)
  const mockPrismaService = {
    colaborador: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    colaboradorPerfil: {
      createMany: jest.fn(),
    },
    projeto: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    alocacaoColaboradorProjeto: {
      createMany: jest.fn(),
    },
  };

  // Dados de teste para ERP (com o novo formato)
  const mockColaboradoresErp = [
    {
      id: 'erp-col-1',
      nomeCompleto: 'João Silva',
      email: 'joao@empresa.com',
      cargo: 'Desenvolvedor Senior',
      unidade: 'TI',
      trilhaCarreira: 'Técnica',
      perfis: ['COLABORADOR', 'TECH_LEAD'],
    },
    {
      id: 'erp-col-2',
      nomeCompleto: 'Maria Santos',
      email: 'maria@empresa.com',
      cargo: 'Analista de RH',
      unidade: 'Recursos Humanos',
      trilhaCarreira: 'Gestão',
      perfis: ['COLABORADOR', 'RH'],
    },
  ];

  const mockProjetosErp = [
    {
      id: 'erp-proj-1',
      nomeProjeto: 'Sistema de Vendas',
      status: projetoStatus.EM_ANDAMENTO,
      idLider: 'erp-col-1', // João será o líder
    },
    {
      id: 'erp-proj-2',
      nomeProjeto: 'Migração de Dados',
      status: projetoStatus.PLANEJADO,
      idLider: null, // Sem líder
    },
  ];

  const mockAlocacoesErp = [
    {
      id: 'erp-aloc-1',
      idColaborador: 'erp-col-1',
      idProjeto: 'erp-proj-1',
      dataEntrada: '2025-01-15',
      dataSaida: null,
    },
    {
      id: 'erp-aloc-2',
      idColaborador: 'erp-col-2',
      idProjeto: 'erp-proj-2',
      dataEntrada: '2025-02-01',
      dataSaida: '2025-06-30',
    },
  ];

  // Dados de teste para RPE (IDs internos do sistema)
  const mockColaboradoresRpe = [
    {
      idColaborador: 'uuid-colaborador-1',
      email: 'joao@empresa.com',
    },
    {
      idColaborador: 'uuid-colaborador-2',
      email: 'maria@empresa.com',
    },
  ];

  const mockProjetosRpe = [
    {
      idProjeto: 'uuid-projeto-1',
      nomeProjeto: 'Sistema de Vendas',
    },
    {
      idProjeto: 'uuid-projeto-2',
      nomeProjeto: 'Migração de Dados',
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
    it('deve executar sincronização automática com sucesso', async () => {
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
      mockPrismaService.colaborador.upsert.mockResolvedValue({ 
        idColaborador: 'uuid-mocked', 
        email: 'test@email.com' 
      });
      mockPrismaService.colaboradorPerfil.createMany.mockResolvedValue({ count: 2 });

      // Mocks para sincronização de projetos
      mockPrismaService.colaborador.findMany.mockResolvedValue(mockColaboradoresRpe);
      mockPrismaService.projeto.upsert.mockResolvedValue({});

      // Mocks para sincronização de alocações
      mockPrismaService.projeto.findMany.mockResolvedValue(mockProjetosRpe);
      mockPrismaService.alocacaoColaboradorProjeto.createMany.mockResolvedValue({ count: 2 });

      // Act
      await service.handleCronSincronizacao();

      // Assert
      expect(mockHttpService.get).toHaveBeenCalledTimes(3);
      expect(mockHttpService.get).toHaveBeenCalledWith('http://localhost:3001/colaboradores');
      expect(mockHttpService.get).toHaveBeenCalledWith('http://localhost:3001/projetos');
      expect(mockHttpService.get).toHaveBeenCalledWith('http://localhost:3001/alocacoes');

      expect(loggerSpy).toHaveBeenCalledWith('🚀 Iniciando rotina de sincronização completa com o ERP (automática)...');
      expect(loggerSpy).toHaveBeenCalledWith('🔍 Encontrados no ERP: 2 colaboradores, 2 projetos, 2 alocações.');
      expect(loggerSpy).toHaveBeenCalledWith('✅ Sincronização completa com o ERP concluída com sucesso!');
    });

    it('deve tratar erro na comunicação com ERP', async () => {
      // Arrange
      const httpError = new Error('Connection timeout');
      httpError.stack = 'Error stack trace';
      mockHttpService.get.mockReturnValue(throwError(() => httpError));

      // Act & Assert
      await expect(service.handleCronSincronizacao()).rejects.toThrow(httpError);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        '❌ Falha na sincronização com o ERP.',
        'Error stack trace'
      );
    });
  });

  describe('dispararSincronizacaoManual', () => {
    it('deve executar sincronização manual e retornar resultado', async () => {
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
      mockPrismaService.colaborador.upsert.mockResolvedValue({ idColaborador: 'test' });
      mockPrismaService.colaboradorPerfil.createMany.mockResolvedValue({ count: 2 });
      mockPrismaService.colaborador.findMany.mockResolvedValue(mockColaboradoresRpe);
      mockPrismaService.projeto.upsert.mockResolvedValue({});
      mockPrismaService.projeto.findMany.mockResolvedValue(mockProjetosRpe);
      mockPrismaService.alocacaoColaboradorProjeto.createMany.mockResolvedValue({ count: 2 });

      // Act
      const resultado = await service.dispararSincronizacaoManual();

      // Assert
      expect(resultado).toEqual({
        message: 'Sincronização completa com o ERP concluída com sucesso!',
        colaboradores: 2,
        projetos: 2,
        alocacoes: 2,
      });

      expect(loggerSpy).toHaveBeenCalledWith('🚀 Iniciando rotina de sincronização completa com o ERP (manual)...');
    });
  });

  describe('sincronizarColaboradores', () => {
    it('deve sincronizar colaboradores com perfis', async () => {
      // Arrange
      mockPrismaService.colaborador.upsert
        .mockResolvedValueOnce({ idColaborador: 'uuid-1' })
        .mockResolvedValueOnce({ idColaborador: 'uuid-2' });
      mockPrismaService.colaboradorPerfil.createMany.mockResolvedValue({ count: 2 });

      // Act
      await (service as any).sincronizarColaboradores(mockColaboradoresErp);

      // Assert
      expect(mockPrismaService.colaborador.upsert).toHaveBeenCalledTimes(2);
      
      // Verifica primeiro colaborador
      expect(mockPrismaService.colaborador.upsert).toHaveBeenCalledWith({
        where: { email: 'joao@empresa.com' },
        update: {
          nomeCompleto: 'João Silva',
          cargo: 'Desenvolvedor Senior',
          unidade: 'TI',
          trilhaCarreira: 'Técnica',
        },
        create: {
          email: 'joao@empresa.com',
          nomeCompleto: 'João Silva',
          cargo: 'Desenvolvedor Senior',
          unidade: 'TI',
          trilhaCarreira: 'Técnica',
          senha: 'senha_padrao_para_novos_usuarios_do_erp',
        },
      });

      // Verifica que perfis foram criados para ambos colaboradores
      expect(mockPrismaService.colaboradorPerfil.createMany).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.colaboradorPerfil.createMany).toHaveBeenCalledWith({
        data: [
          { idColaborador: 'uuid-1', tipoPerfil: 'COLABORADOR' },
          { idColaborador: 'uuid-1', tipoPerfil: 'TECH_LEAD' },
        ],
        skipDuplicates: true,
      });

      expect(loggerSpy).toHaveBeenCalledWith('  - ✔️ 2 colaboradores sincronizados (criados/atualizados e perfis preenchidos).');
    });

    it('deve sincronizar colaborador sem perfis', async () => {
      // Arrange
      const colaboradorSemPerfis = [{
        id: 'erp-col-3',
        nomeCompleto: 'Pedro Santos',
        email: 'pedro@empresa.com',
        cargo: 'Estagiário',
        unidade: 'TI',
        trilhaCarreira: 'Técnica',
        perfis: [], // Array vazio
      }];

      mockPrismaService.colaborador.upsert.mockResolvedValue({ idColaborador: 'uuid-3' });

      // Act
      await (service as any).sincronizarColaboradores(colaboradorSemPerfis);

      // Assert
      expect(mockPrismaService.colaborador.upsert).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.colaboradorPerfil.createMany).not.toHaveBeenCalled();
    });

    it('deve tratar colaborador com perfis undefined', async () => {
      // Arrange
      const colaboradorComPerfisUndefined = [{
        id: 'erp-col-4',
        nomeCompleto: 'Ana Costa',
        email: 'ana@empresa.com',
        cargo: 'Analista',
        unidade: 'Financeiro',
        trilhaCarreira: 'Gestão',
        // perfis não definido
      }];

      mockPrismaService.colaborador.upsert.mockResolvedValue({ idColaborador: 'uuid-4' });

      // Act
      await (service as any).sincronizarColaboradores(colaboradorComPerfisUndefined);

      // Assert
      expect(mockPrismaService.colaborador.upsert).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.colaboradorPerfil.createMany).not.toHaveBeenCalled();
    });

    it('deve propagar erro do Prisma', async () => {
      // Arrange
      const prismaError = new Error('Database connection failed');
      mockPrismaService.colaborador.upsert.mockRejectedValue(prismaError);

      // Act & Assert
      await expect((service as any).sincronizarColaboradores(mockColaboradoresErp))
        .rejects.toThrow(prismaError);
    });
  });

  describe('sincronizarProjetos', () => {
    beforeEach(() => {
      mockPrismaService.colaborador.findMany.mockResolvedValue(mockColaboradoresRpe);
    });

    it('deve sincronizar projetos com líder', async () => {
      // Arrange
      mockPrismaService.projeto.upsert.mockResolvedValue({});

      // Act
      await (service as any).sincronizarProjetos(mockProjetosErp, mockColaboradoresErp);

      // Assert
      expect(mockPrismaService.projeto.upsert).toHaveBeenCalledTimes(2);
      
      // Verifica projeto com líder
      expect(mockPrismaService.projeto.upsert).toHaveBeenCalledWith({
        where: { nomeProjeto: 'Sistema de Vendas' },
        update: { 
          status: projetoStatus.EM_ANDAMENTO, 
          idLider: 'uuid-colaborador-1' // Mapeado do ERP para RPE
        },
        create: { 
          nomeProjeto: 'Sistema de Vendas', 
          status: projetoStatus.EM_ANDAMENTO, 
          idLider: 'uuid-colaborador-1'
        },
      });

      // Verifica projeto sem líder
      expect(mockPrismaService.projeto.upsert).toHaveBeenCalledWith({
        where: { nomeProjeto: 'Migração de Dados' },
        update: { 
          status: projetoStatus.PLANEJADO, 
          idLider: undefined
        },
        create: { 
          nomeProjeto: 'Migração de Dados', 
          status: projetoStatus.PLANEJADO, 
          idLider: undefined
        },
      });

      expect(loggerSpy).toHaveBeenCalledWith('  - ✔️ 2 projetos sincronizados (criados/atualizados).');
    });

    it('deve funcionar sem colaboradores fornecidos', async () => {
      // Arrange
      mockPrismaService.projeto.upsert.mockResolvedValue({});

      // Act
      await (service as any).sincronizarProjetos(mockProjetosErp);

      // Assert
      expect(mockPrismaService.colaborador.findMany).toHaveBeenCalled();
      expect(mockPrismaService.projeto.upsert).toHaveBeenCalledTimes(2);
    });

    it('deve tratar líder inexistente no mapeamento', async () => {
      // Arrange
      const projetoComLiderInexistente = [{
        id: 'erp-proj-3',
        nomeProjeto: 'Projeto Teste',
        status: projetoStatus.PLANEJADO,
        idLider: 'erp-col-inexistente',
      }];

      mockPrismaService.projeto.upsert.mockResolvedValue({});

      // Act
      await (service as any).sincronizarProjetos(projetoComLiderInexistente, mockColaboradoresErp);

      // Assert
      expect(mockPrismaService.projeto.upsert).toHaveBeenCalledWith({
        where: { nomeProjeto: 'Projeto Teste' },
        update: { 
          status: projetoStatus.PLANEJADO, 
          idLider: undefined // Líder não encontrado
        },
        create: { 
          nomeProjeto: 'Projeto Teste', 
          status: projetoStatus.PLANEJADO, 
          idLider: undefined
        },
      });
    });
  });

  describe('sincronizarAlocacoes', () => {
    beforeEach(() => {
      mockPrismaService.colaborador.findMany.mockResolvedValue(mockColaboradoresRpe);
      mockPrismaService.projeto.findMany.mockResolvedValue(mockProjetosRpe);
    });

    it('deve sincronizar alocações com sucesso', async () => {
      // Arrange
      mockPrismaService.alocacaoColaboradorProjeto.createMany.mockResolvedValue({ count: 2 });

      // Act
      await (service as any).sincronizarAlocacoes(mockAlocacoesErp, mockColaboradoresErp, mockProjetosErp);

      // Assert
      expect(mockPrismaService.alocacaoColaboradorProjeto.createMany).toHaveBeenCalledWith({
        data: [
          {
            idColaborador: 'uuid-colaborador-1',
            idProjeto: 'uuid-projeto-1',
            dataEntrada: new Date('2025-01-15'),
            dataSaida: null,
          },
          {
            idColaborador: 'uuid-colaborador-2',
            idProjeto: 'uuid-projeto-2',
            dataEntrada: new Date('2025-02-01'),
            dataSaida: new Date('2025-06-30'),
          },
        ],
      });

      expect(loggerSpy).toHaveBeenCalledWith('  - ✔️ 2 novas alocações inseridas.');
    });

    it('deve ignorar alocações com colaborador inexistente', async () => {
      // Arrange
      const alocacoesComColaboradorInexistente = [
        {
          id: 'erp-aloc-3',
          idColaborador: 'erp-col-inexistente',
          idProjeto: 'erp-proj-1',
          dataEntrada: '2025-03-01',
          dataSaida: null,
        },
      ];

      // Act
      await (service as any).sincronizarAlocacoes(
        alocacoesComColaboradorInexistente, 
        mockColaboradoresErp, 
        mockProjetosErp
      );

      // Assert
      expect(mockPrismaService.alocacaoColaboradorProjeto.createMany).not.toHaveBeenCalled();
    });

    it('deve ignorar alocações com projeto inexistente', async () => {
      // Arrange
      const alocacoesComProjetoInexistente = [
        {
          id: 'erp-aloc-4',
          idColaborador: 'erp-col-1',
          idProjeto: 'erp-proj-inexistente',
          dataEntrada: '2025-03-01',
          dataSaida: null,
        },
      ];

      // Act
      await (service as any).sincronizarAlocacoes(
        alocacoesComProjetoInexistente, 
        mockColaboradoresErp, 
        mockProjetosErp
      );

      // Assert
      expect(mockPrismaService.alocacaoColaboradorProjeto.createMany).not.toHaveBeenCalled();
    });

    it('deve funcionar com lista vazia de alocações', async () => {
      // Act
      await (service as any).sincronizarAlocacoes([], mockColaboradoresErp, mockProjetosErp);

      // Assert
      expect(mockPrismaService.alocacaoColaboradorProjeto.createMany).not.toHaveBeenCalled();
    });

    it('deve converter datas corretamente', async () => {
      // Arrange
      const alocacaoComDatas = [{
        id: 'erp-aloc-5',
        idColaborador: 'erp-col-1',
        idProjeto: 'erp-proj-1',
        dataEntrada: '2025-12-25',
        dataSaida: '2026-03-15',
      }];

      mockPrismaService.alocacaoColaboradorProjeto.createMany.mockResolvedValue({ count: 1 });

      // Act
      await (service as any).sincronizarAlocacoes(alocacaoComDatas, mockColaboradoresErp, mockProjetosErp);

      // Assert
      expect(mockPrismaService.alocacaoColaboradorProjeto.createMany).toHaveBeenCalledWith({
        data: [{
          idColaborador: 'uuid-colaborador-1',
          idProjeto: 'uuid-projeto-1',
          dataEntrada: new Date('2025-12-25'),
          dataSaida: new Date('2026-03-15'),
        }],
      });
    });
  });

  describe('Testes de integração e mapeamento', () => {
    it('deve executar sincronização completa na ordem correta', async () => {
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
        return Promise.resolve({ idColaborador: 'test' });
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
      mockPrismaService.colaboradorPerfil.createMany.mockResolvedValue({ count: 0 });
      mockPrismaService.colaborador.findMany.mockResolvedValue(mockColaboradoresRpe);
      mockPrismaService.projeto.findMany.mockResolvedValue(mockProjetosRpe);

      // Act
      await service.handleCronSincronizacao();

      // Assert - Verifica ordem de execução
      const colaboradorIndex = callOrder.findIndex(call => call === 'colaborador.upsert');
      const projetoIndex = callOrder.findIndex(call => call === 'projeto.upsert');
      const alocacaoIndex = callOrder.findIndex(call => call === 'alocacao.createMany');

      expect(colaboradorIndex).toBeLessThan(projetoIndex);
      expect(projetoIndex).toBeLessThan(alocacaoIndex);
    });

    it('deve mapear IDs corretamente entre ERP e RPE', async () => {
      // Arrange
      const colaboradorEspecifico = [{
        id: 'erp-especial',
        nomeCompleto: 'Usuário Especial',
        email: 'especial@empresa.com',
        cargo: 'Gerente',
        unidade: 'Administração',
        trilhaCarreira: 'Gestão',
        perfis: ['COLABORADOR', 'GESTOR'],
      }];

      const projetoEspecifico = [{
        id: 'erp-proj-especial',
        nomeProjeto: 'Projeto Especial',
        status: projetoStatus.EM_ANDAMENTO,
        idLider: 'erp-especial',
      }];

      const alocacaoEspecifica = [{
        id: 'erp-aloc-especial',
        idColaborador: 'erp-especial',
        idProjeto: 'erp-proj-especial',
        dataEntrada: '2025-01-01',
        dataSaida: null,
      }];

      // Mocks para RPE
      const colaboradorRpeEspecifico = [{ 
        idColaborador: 'uuid-especial', 
        email: 'especial@empresa.com' 
      }];
      const projetoRpeEspecifico = [{ 
        idProjeto: 'uuid-proj-especial', 
        nomeProjeto: 'Projeto Especial' 
      }];

      mockPrismaService.colaborador.findMany.mockResolvedValue(colaboradorRpeEspecifico);
      mockPrismaService.projeto.findMany.mockResolvedValue(projetoRpeEspecifico);
      mockPrismaService.alocacaoColaboradorProjeto.createMany.mockResolvedValue({ count: 1 });

      // Act
      await (service as any).sincronizarAlocacoes(
        alocacaoEspecifica, 
        colaboradorEspecifico, 
        projetoEspecifico
      );

      // Assert
      expect(mockPrismaService.alocacaoColaboradorProjeto.createMany).toHaveBeenCalledWith({
        data: [{
          idColaborador: 'uuid-especial',
          idProjeto: 'uuid-proj-especial',
          dataEntrada: new Date('2025-01-01'),
          dataSaida: null,
        }],
      });
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

      mockPrismaService.colaborador.findMany.mockResolvedValue([]);
      mockPrismaService.projeto.findMany.mockResolvedValue([]);

      // Act
      await service.handleCronSincronizacao();

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('🔍 Encontrados no ERP: 0 colaboradores, 0 projetos, 0 alocações.');
      expect(loggerSpy).toHaveBeenCalledWith('  - ✔️ 0 colaboradores sincronizados (criados/atualizados e perfis preenchidos).');
      expect(loggerSpy).toHaveBeenCalledWith('  - ✔️ 0 projetos sincronizados (criados/atualizados).');
    });

    it('deve tratar resposta HTTP com estrutura inesperada', async () => {
      // Arrange
      const mockResponses = [
        { data: null }, // Estrutura inesperada
        { data: mockProjetosErp },
        { data: mockAlocacoesErp },
      ];

      mockHttpService.get
        .mockReturnValueOnce(of(mockResponses[0]))
        .mockReturnValueOnce(of(mockResponses[1]))
        .mockReturnValueOnce(of(mockResponses[2]));

      // Act & Assert
      await expect(service.handleCronSincronizacao()).rejects.toThrow();
      expect(Logger.prototype.error).toHaveBeenCalled();
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

      // Mocks básicos
      mockPrismaService.colaborador.upsert.mockResolvedValue({ idColaborador: 'test' });
      mockPrismaService.colaboradorPerfil.createMany.mockResolvedValue({ count: 0 });
      mockPrismaService.colaborador.findMany.mockResolvedValue(mockColaboradoresRpe);
      mockPrismaService.projeto.upsert.mockResolvedValue({});
      mockPrismaService.projeto.findMany.mockResolvedValue(mockProjetosRpe);
      mockPrismaService.alocacaoColaboradorProjeto.createMany.mockResolvedValue({ count: 0 });

      // Act
      await service.handleCronSincronizacao();

      // Assert
      expect(mockHttpService.get).toHaveBeenCalledTimes(3);
      // Verifica que as chamadas foram feitas para os endpoints corretos
      expect(mockHttpService.get).toHaveBeenCalledWith('http://localhost:3001/colaboradores');
      expect(mockHttpService.get).toHaveBeenCalledWith('http://localhost:3001/projetos');
      expect(mockHttpService.get).toHaveBeenCalledWith('http://localhost:3001/alocacoes');
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
      mockPrismaService.colaborador.upsert.mockResolvedValue({ idColaborador: 'test' });
      mockPrismaService.colaboradorPerfil.createMany.mockResolvedValue({ count: 4 });
      mockPrismaService.colaborador.findMany.mockResolvedValue(mockColaboradoresRpe);
      mockPrismaService.projeto.upsert.mockResolvedValue({});
      mockPrismaService.projeto.findMany.mockResolvedValue(mockProjetosRpe);
      mockPrismaService.alocacaoColaboradorProjeto.createMany.mockResolvedValue({ count: 2 });

      // Act
      await service.handleCronSincronizacao();

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('🚀 Iniciando rotina de sincronização completa com o ERP (automática)...');
      expect(loggerSpy).toHaveBeenCalledWith('🔍 Encontrados no ERP: 2 colaboradores, 2 projetos, 2 alocações.');
      expect(loggerSpy).toHaveBeenCalledWith('  - ✔️ 2 colaboradores sincronizados (criados/atualizados e perfis preenchidos).');
      expect(loggerSpy).toHaveBeenCalledWith('  - ✔️ 2 projetos sincronizados (criados/atualizados).');
      expect(loggerSpy).toHaveBeenCalledWith('  - ✔️ 2 novas alocações inseridas.');
      expect(loggerSpy).toHaveBeenCalledWith('✅ Sincronização completa com o ERP concluída com sucesso!');
    });

    it('deve gerar log de erro quando a sincronização falha', async () => {
      // Arrange
      const httpError = new Error('Network error');
      httpError.stack = 'Error stack trace';
      mockHttpService.get.mockReturnValue(throwError(() => httpError));

      // Act & Assert
      await expect(service.handleCronSincronizacao()).rejects.toThrow();
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        '❌ Falha na sincronização com o ERP.',
        'Error stack trace'
      );
    });
  });
});
