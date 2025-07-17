import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ImportacaoService } from './importacao.service';
import { PrismaService } from '../database/prismaService';
import * as xlsx from 'xlsx';

// Mock do xlsx
jest.mock('xlsx');
const mockedXlsx = xlsx as jest.Mocked<typeof xlsx>;

// Mock sheet_to_json as a jest function
//(mockedXlsx.utils.sheet_to_json as jest.Mock).mockImplementation(() => []);

// Helper function para criar workbook mock
const createMockWorkbook = (sheets: Record<string, any> = {}): xlsx.WorkBook => ({
  Sheets: sheets,
  SheetNames: Object.keys(sheets),
  Props: {},
  Custprops: {},
  Workbook: {},
});

describe('ImportacaoService', () => {
  let service: ImportacaoService;
  let prismaService: PrismaService;

  // Mock do PrismaService
  const mockPrismaService = {
    colaborador: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    cicloAvaliacao: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    criterioAvaliativo: {
      findUnique: jest.fn(),
    },
    avaliacao: {
      create: jest.fn(),
    },
    autoAvaliacao: {
      create: jest.fn(),
    },
    cardAutoAvaliacao: {
      create: jest.fn(),
    },
    avaliacaoPares: {
      create: jest.fn(),
    },
    indicacaoReferencia: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  // Mock dos dados de teste
  const mockFileBuffer = Buffer.from('mock excel data');
  const mockFile = {
    originalname: 'test-import.xlsx',
    buffer: mockFileBuffer,
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };

  const mockWorkbook = createMockWorkbook({
    'Perfil': {},
    'Autoavaliação': {},
    'Avaliação 360': {},
    'Pesquisa de Referências': {},
  });

  const mockPerfilData = [
    {
      'Email': 'joao.silva@empresa.com',
      'Nome ( nome.sobrenome )': 'João Silva',
      'Unidade': 'TI',
      'Ciclo (ano.semestre)': '2024.1',
    },
  ];

  const mockAutoavaliacaoData = [
    {
      'CRITÉRIO': 'Organização',
      'AUTO-AVALIAÇÃO': '4',
      'DADOS E FATOS DA AUTO-AVALIAÇÃO': 'Sempre organizo meu trabalho de forma eficiente',
    },
    {
      'CRITÉRIO': 'Iniciativa',
      'AUTO-AVALIAÇÃO': '5',
      'DADOS E FATOS DA AUTO-AVALIAÇÃO': 'Busco proativamente novas soluções',
    },
  ];

  const mockAvaliacao360Data = [
    {
      'EMAIL DO AVALIADO ( nome.sobrenome )': 'maria.santos@empresa.com',
      'DÊ UMA NOTA GERAL PARA O COLABORADOR': '4.5',
      'PONTOS QUE FAZ BEM E DEVE EXPLORAR': 'Excelente comunicação',
      'PONTOS QUE DEVE MELHORAR': 'Gestão de tempo',
      'VOCÊ FICARIA MOTIVADO EM TRABALHAR NOVAMENTE COM ESTE COLABORADOR': 'Sim, definitivamente',
    },
  ];

  const mockReferenciasData = [
    {
      'EMAIL DA REFERÊNCIA ( nome.sobrenome )': 'pedro.oliveira@empresa.com',
      'JUSTIFICATIVA': 'Excelente profissional com grande conhecimento técnico',
    },
  ];

  const mockColaborador = {
    idColaborador: '123e4567-e89b-12d3-a456-426614174000',
    email: 'joao.silva@empresa.com',
    nomeCompleto: 'João Silva',
    unidade: 'TI',
    senha: 'senha123',
  };

  const mockCiclo = {
    idCiclo: '456e7890-e89b-12d3-a456-426614174001',
    nomeCiclo: '2024.1',
    dataInicio: new Date('2024-01-01'),
    dataFim: new Date('2024-03-31'),
    status: 'FECHADO',
  };

  const mockAvaliacao = {
    idAvaliacao: '789e0123-e89b-12d3-a456-426614174002',
    idCiclo: mockCiclo.idCiclo,
    idAvaliador: mockColaborador.idColaborador,
    idAvaliado: mockColaborador.idColaborador,
    tipoAvaliacao: 'AUTOAVALIACAO',
    status: 'CONCLUIDA',
  };

  const mockCriterio = {
    idCriterio: 'criterio-uuid-123',
    nomeCriterio: 'Organização no Trabalho',
    peso: 1.0,
    obrigatorio: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportacaoService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ImportacaoService>(ImportacaoService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Mock do Logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    // Setup padrão dos mocks
    mockPrismaService.$transaction.mockImplementation(async (callback) => {
      return await callback(mockPrismaService);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Definição do service', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('deve ter PrismaService injetado', () => {
      expect(prismaService).toBeDefined();
    });
  });

  describe('iniciarProcessoDeImportacao', () => {
    it('deve aceitar arquivo e retornar resposta de sucesso', async () => {
      // Act
      const resultado = await service.iniciarProcessoDeImportacao(mockFile);

      // Assert
      expect(resultado).toEqual({
        statusCode: 202,
        message: 'Arquivo recebido. A importação foi iniciada e será processada em segundo plano.',
      });
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        `Recebido arquivo para importação: ${mockFile.originalname}`
      );
    });

    it('deve processar diferentes tipos de arquivo', async () => {
      // Arrange
      const arquivosTest = [
        { originalname: 'dados.xlsx', buffer: Buffer.from('xlsx data') },
        { originalname: 'planilha.xls', buffer: Buffer.from('xls data') },
        { originalname: 'importacao-2024.xlsx', buffer: Buffer.from('data') },
      ];

      for (const arquivo of arquivosTest) {
        // Act
        const resultado = await service.iniciarProcessoDeImportacao(arquivo);

        // Assert
        expect(resultado.statusCode).toBe(202);
        expect(Logger.prototype.log).toHaveBeenCalledWith(
          `Recebido arquivo para importação: ${arquivo.originalname}`
        );

        // Reset para próxima iteração
        jest.clearAllMocks();
      }
    });

    it('deve aceitar arquivo com buffer vazio', async () => {
      // Arrange
      const arquivoVazio = {
        originalname: 'vazio.xlsx',
        buffer: Buffer.alloc(0),
      };

      // Act
      const resultado = await service.iniciarProcessoDeImportacao(arquivoVazio);

      // Assert
      expect(resultado.statusCode).toBe(202);
    });

    it('deve lidar com nomes de arquivo especiais', async () => {
      // Arrange
      const arquivosEspeciais = [
        { originalname: 'arquivo com espaços.xlsx', buffer: mockFileBuffer },
        { originalname: 'arquivo-com-hífen.xlsx', buffer: mockFileBuffer },
        { originalname: 'arquivo_com_underscore.xlsx', buffer: mockFileBuffer },
        { originalname: 'arquivo123.xlsx', buffer: mockFileBuffer },
      ];

      for (const arquivo of arquivosEspeciais) {
        // Act
        const resultado = await service.iniciarProcessoDeImportacao(arquivo);

        // Assert
        expect(resultado.statusCode).toBe(202);
        expect(Logger.prototype.log).toHaveBeenCalledWith(
          `Recebido arquivo para importação: ${arquivo.originalname}`
        );

        jest.clearAllMocks();
      }
    });
  });

  // ✅ CORREÇÃO: Separar extrairDadosDaAba em seu próprio describe block
  describe('extrairDadosDaAba', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (mockedXlsx.utils.sheet_to_json as jest.Mock).mockReturnValue(mockPerfilData);
    });
    
    it('deve extrair dados de aba existente', () => {
      // Act
      const resultado = service.extrairDadosDaAba(mockWorkbook, 'Perfil');

      // Assert
      expect(resultado).toEqual(mockPerfilData);
      expect(xlsx.utils.sheet_to_json).toHaveBeenCalledWith(mockWorkbook.Sheets['Perfil']);
    });

    it('deve retornar array vazio para aba inexistente', () => {
      // Arrange - ✅ CORREÇÃO: Usar helper function
      const workbookSemAba = createMockWorkbook(); // Workbook vazio mas válido

      // Act
      const resultado = service.extrairDadosDaAba(workbookSemAba, 'AbaInexistente');

      // Assert
      expect(resultado).toEqual([]);
      expect(xlsx.utils.sheet_to_json).not.toHaveBeenCalled();
    });

    it('deve extrair dados de diferentes abas', () => {
      // Arrange
      const abasTest = ['Perfil', 'Autoavaliação', 'Avaliação 360', 'Pesquisa de Referências'];
      const dadosTest = [
        mockPerfilData,
        mockAutoavaliacaoData,
        mockAvaliacao360Data,
        mockReferenciasData,
      ];

      abasTest.forEach((aba, index) => {
        (mockedXlsx.utils.sheet_to_json as jest.Mock).mockReturnValueOnce(dadosTest[index]);

        // Act
        const resultado = service.extrairDadosDaAba(mockWorkbook, aba);

        // Assert
        expect(resultado).toEqual(dadosTest[index]);
      });
    });

    it('deve lidar com aba vazia', () => {
      // Arrange
      (mockedXlsx.utils.sheet_to_json as jest.Mock).mockReturnValue([]);

      // Act
      const resultado = service.extrairDadosDaAba(mockWorkbook, 'AbaVazia');

      // Assert
      expect(resultado).toEqual([]);
    });

    it('deve lidar com nomes de aba com caracteres especiais', () => {
      // Arrange - ✅ CORREÇÃO: Usar helper function
      const workbookEspecial = createMockWorkbook({
        'Aba com Espaços': {},
        'Aba-com-Hífen': {},
        'Aba_com_Underscore': {},
        'Aba123': {},
      });

      const abasEspeciais = Object.keys(workbookEspecial.Sheets);

      abasEspeciais.forEach((aba) => {
        (mockedXlsx.utils.sheet_to_json as jest.Mock).mockReturnValue([{ teste: 'dados' }]);

        // Act
        const resultado = service.extrairDadosDaAba(workbookEspecial, aba);

        // Assert
        expect(resultado).toEqual([{ teste: 'dados' }]);
      });
    });
  });

  describe('upsertColaborador', () => {
    it('deve atualizar colaborador existente', async () => {
      // Arrange
      const perfilUpdate = {
        Email: 'joao.silva@empresa.com',
        'Nome ( nome.sobrenome )': 'João Silva Atualizado',
        'Unidade': 'TI - Backend',
      };

      mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
      mockPrismaService.colaborador.update.mockResolvedValue({
        ...mockColaborador,
        nomeCompleto: perfilUpdate['Nome ( nome.sobrenome )'],
        unidade: perfilUpdate['Unidade'],
      });

      // Act
      const resultado = await service['upsertColaborador'](perfilUpdate);

      // Assert
      expect(mockPrismaService.colaborador.findUnique).toHaveBeenCalledWith({
        where: { email: perfilUpdate.Email },
      });
      expect(mockPrismaService.colaborador.update).toHaveBeenCalledWith({
        where: { email: perfilUpdate.Email },
        data: {
          nomeCompleto: perfilUpdate['Nome ( nome.sobrenome )'],
          unidade: perfilUpdate['Unidade'],
        },
      });
      expect(resultado.nomeCompleto).toBe('João Silva Atualizado');
    });

    it('deve criar novo colaborador quando não existe', async () => {
      // Arrange
      const novoColaborador = {
        Email: 'novo@empresa.com',
        'Nome ( nome.sobrenome )': 'Novo Colaborador',
        'Unidade': 'RH',
      };

      mockPrismaService.colaborador.findUnique.mockResolvedValue(null);
      mockPrismaService.colaborador.create.mockResolvedValue({
        idColaborador: 'novo-id-123',
        email: novoColaborador.Email,
        nomeCompleto: novoColaborador['Nome ( nome.sobrenome )'],
        unidade: novoColaborador['Unidade'],
        senha: 'senha123',
      });

      // Act
      const resultado = await service['upsertColaborador'](novoColaborador);

      // Assert
      expect(mockPrismaService.colaborador.findUnique).toHaveBeenCalledWith({
        where: { email: novoColaborador.Email },
      });
      expect(mockPrismaService.colaborador.create).toHaveBeenCalledWith({
        data: {
          nomeCompleto: novoColaborador['Nome ( nome.sobrenome )'],
          email: novoColaborador.Email,
          unidade: novoColaborador['Unidade'],
          senha: 'senha123',
        },
      });
      expect(resultado.email).toBe('novo@empresa.com');
    });

    it('deve lidar com diferentes formatos de email', async () => {
      // Arrange
      const emailsTest = [
        'test@empresa.com',
        'TEST@EMPRESA.COM',
        'user.name@company.co.uk',
        'admin+test@empresa.com.br',
      ];

      for (const email of emailsTest) {
        const perfil = {
          Email: email,
          'Nome ( nome.sobrenome )': 'Nome Teste',
          'Unidade': 'TI',
        };

        mockPrismaService.colaborador.findUnique.mockResolvedValue(null);
        mockPrismaService.colaborador.create.mockResolvedValue({
          idColaborador: 'id-123',
          email: email,
          nomeCompleto: 'Nome Teste',
          unidade: 'TI',
          senha: 'senha123',
        });

        // Act
        await service['upsertColaborador'](perfil);

        // Assert
        expect(mockPrismaService.colaborador.findUnique).toHaveBeenCalledWith({
          where: { email: email },
        });

        jest.clearAllMocks();
      }
    });

    it('deve propagar erro do Prisma', async () => {
      // Arrange
      const perfil = {
        Email: 'erro@empresa.com',
        'Nome ( nome.sobrenome )': 'Nome Teste',
        'Unidade': 'TI',
      };

      const prismaError = new Error('Database connection failed');
      mockPrismaService.colaborador.findUnique.mockRejectedValue(prismaError);

      // Act & Assert
      await expect(service['upsertColaborador'](perfil)).rejects.toThrow(prismaError);
    });
  });

  describe('upsertCiclo', () => {
    it('deve retornar ciclo existente', async () => {
      // Arrange
      const nomeCiclo = '2024.1';
      mockPrismaService.cicloAvaliacao.findFirst.mockResolvedValue(mockCiclo);

      // Act
      const resultado = await service['upsertCiclo'](nomeCiclo);

      // Assert
      expect(mockPrismaService.cicloAvaliacao.findFirst).toHaveBeenCalledWith({
        where: { nomeCiclo: nomeCiclo },
      });
      expect(resultado).toEqual(mockCiclo);
      expect(mockPrismaService.cicloAvaliacao.create).not.toHaveBeenCalled();
    });

    it('deve criar novo ciclo quando não existe', async () => {
      // Arrange
      const nomeCiclo = '2025.2';
      const novoCiclo = {
        idCiclo: 'novo-ciclo-123',
        nomeCiclo: '2025.2',
        dataInicio: new Date('2025-01-01'),
        dataFim: new Date('2025-03-31'),
        status: 'FECHADO',
      };

      mockPrismaService.cicloAvaliacao.findFirst.mockResolvedValue(null);
      mockPrismaService.cicloAvaliacao.create.mockResolvedValue(novoCiclo);

      // Act
      const resultado = await service['upsertCiclo'](nomeCiclo);

      // Assert
      expect(mockPrismaService.cicloAvaliacao.findFirst).toHaveBeenCalledWith({
        where: { nomeCiclo: nomeCiclo },
      });
      expect(mockPrismaService.cicloAvaliacao.create).toHaveBeenCalledWith({
        data: {
          nomeCiclo: '2025.2',
          dataInicio: new Date('2025-01-01'),
          dataFim: new Date('2025-03-31'),
          status: 'FECHADO',
          duracaoEmAndamentoDias: 30,
          duracaoEmRevisaoDias: 30,
          duracaoEmEqualizacaoDias: 30,
        },
      });
      expect(resultado).toEqual(novoCiclo);
    });

    it('deve extrair ano do nome do ciclo corretamente', async () => {
      // Arrange
      const testCases = [
        { input: '2023.1', expectedYear: '2023' },
        { input: '2024.2', expectedYear: '2024' },
        { input: '2025.1', expectedYear: '2025' },
        { input: 'Ciclo 2026', expectedYear: '2026' },
        { input: 'SemAno', expectedYear: '2024' }, // Default
      ];

      for (const testCase of testCases) {
        mockPrismaService.cicloAvaliacao.findFirst.mockResolvedValue(null);
        mockPrismaService.cicloAvaliacao.create.mockResolvedValue({
          idCiclo: 'id-123',
          nomeCiclo: testCase.input,
        });

        // Act
        await service['upsertCiclo'](testCase.input);

        // Assert
        expect(mockPrismaService.cicloAvaliacao.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            dataInicio: new Date(`${testCase.expectedYear}-01-01`),
            dataFim: new Date(`${testCase.expectedYear}-03-31`),
          }),
        });

        jest.clearAllMocks();
      }
    });

    it('deve definir propriedades padrão para novo ciclo', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findFirst.mockResolvedValue(null);
      mockPrismaService.cicloAvaliacao.create.mockResolvedValue(mockCiclo);

      // Act
      await service['upsertCiclo']('2024.1');

      // Assert
      expect(mockPrismaService.cicloAvaliacao.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'FECHADO',
          duracaoEmAndamentoDias: 30,
          duracaoEmRevisaoDias: 30,
          duracaoEmEqualizacaoDias: 30,
        }),
      });
    });
  });

  describe('criarAutoAvaliacaoComCards', () => {
    beforeEach(() => {
      mockPrismaService.avaliacao.create.mockResolvedValue(mockAvaliacao);
      mockPrismaService.autoAvaliacao.create.mockResolvedValue({
        idAvaliacao: mockAvaliacao.idAvaliacao,
      });
      mockPrismaService.criterioAvaliativo.findUnique.mockResolvedValue(mockCriterio);
      mockPrismaService.cardAutoAvaliacao.create.mockResolvedValue({
        idCardAvaliacao: 'card-123',
        idAvaliacao: mockAvaliacao.idAvaliacao,
        nomeCriterio: mockCriterio.nomeCriterio,
        nota: 4,
        justificativa: 'Teste',
      });
    });

    it('deve criar autoavaliação com cards completa', async () => {
      // Act
      await service['criarAutoAvaliacaoComCards'](
        mockCiclo.idCiclo,
        mockColaborador.idColaborador,
        mockAutoavaliacaoData
      );

      // Assert
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.avaliacao.create).toHaveBeenCalledWith({
        data: {
          idCiclo: mockCiclo.idCiclo,
          idAvaliado: mockColaborador.idColaborador,
          idAvaliador: mockColaborador.idColaborador,
          tipoAvaliacao: 'AUTOAVALIACAO',
          status: 'CONCLUIDA',
        },
      });
      expect(mockPrismaService.autoAvaliacao.create).toHaveBeenCalledWith({
        data: { idAvaliacao: mockAvaliacao.idAvaliacao },
      });
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Autoavaliação importada com')
      );
    });

    it('deve mapear critérios antigos para novos corretamente', async () => {
      // Arrange
      const dadosComMapeamento = [
        {
          'CRITÉRIO': 'Organização',
          'AUTO-AVALIAÇÃO': '4',
          'DADOS E FATOS DA AUTO-AVALIAÇÃO': 'Justificativa teste',
        },
      ];

      mockPrismaService.criterioAvaliativo.findUnique.mockResolvedValue({
        idCriterio: 'criterio-organizacao-123',
        nomeCriterio: 'Organização no Trabalho',
      });

      // Act
      await service['criarAutoAvaliacaoComCards'](
        mockCiclo.idCiclo,
        mockColaborador.idColaborador,
        dadosComMapeamento
      );

      // Assert
      expect(mockPrismaService.criterioAvaliativo.findUnique).toHaveBeenCalledWith({
        where: { nomeCriterio: 'Organização no Trabalho' },
      });
      expect(mockPrismaService.cardAutoAvaliacao.create).toHaveBeenCalledWith({
        data: {
          idAvaliacao: mockAvaliacao.idAvaliacao,
          nomeCriterio: 'Organização no Trabalho',
          nota: 4,
          justificativa: 'Justificativa teste',
        },
      });
    });

    it('deve ignorar critérios sem mapeamento', async () => {
      // Arrange
      const dadosSemMapeamento = [
        {
          'CRITÉRIO': 'CriterioInexistente',
          'AUTO-AVALIAÇÃO': '3',
          'DADOS E FATOS DA AUTO-AVALIAÇÃO': 'Justificativa',
        },
      ];

      // Act
      await service['criarAutoAvaliacaoComCards'](
        mockCiclo.idCiclo,
        mockColaborador.idColaborador,
        dadosSemMapeamento
      );

      // Assert
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Critério antigo "CriterioInexistente" não possui mapeamento. Card não criado.'
      );
      expect(mockPrismaService.criterioAvaliativo.findUnique).not.toHaveBeenCalled();
      expect(mockPrismaService.cardAutoAvaliacao.create).not.toHaveBeenCalled();
    });

    it('deve ignorar linhas com nota inválida', async () => {
      // Arrange
      const dadosNotaInvalida = [
        {
          'CRITÉRIO': 'Organização',
          'AUTO-AVALIAÇÃO': 'NotaInvalida',
          'DADOS E FATOS DA AUTO-AVALIAÇÃO': 'Justificativa',
        },
      ];

      // Act
      await service['criarAutoAvaliacaoComCards'](
        mockCiclo.idCiclo,
        mockColaborador.idColaborador,
        dadosNotaInvalida
      );

      // Assert
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Nota inválida ("NotaInvalida") para o critério "Organização". Card não criado.'
      );
    });

    it('deve ignorar critério mapeado não encontrado no banco', async () => {
      // Arrange
      const dadosCriterioNaoEncontrado = [
        {
          'CRITÉRIO': 'Organização',
          'AUTO-AVALIAÇÃO': '4',
          'DADOS E FATOS DA AUTO-AVALIAÇÃO': 'Justificativa',
        },
      ];

      mockPrismaService.criterioAvaliativo.findUnique.mockResolvedValue(null);

      // Act
      await service['criarAutoAvaliacaoComCards'](
        mockCiclo.idCiclo,
        mockColaborador.idColaborador,
        dadosCriterioNaoEncontrado
      );

      // Assert
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Critério novo "Organização no Trabalho" (mapeado de "Organização") não encontrado no banco. Card não criado.'
      );
    });

    it('deve usar justificativa padrão quando não fornecida', async () => {
      // Arrange
      const dadosSemJustificativa = [
        {
          'CRITÉRIO': 'Organização',
          'AUTO-AVALIAÇÃO': '4',
          // Sem justificativa
        },
      ];

      // Act
      await service['criarAutoAvaliacaoComCards'](
        mockCiclo.idCiclo,
        mockColaborador.idColaborador,
        dadosSemJustificativa
      );

      // Assert
      expect(mockPrismaService.cardAutoAvaliacao.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          justificativa: 'xx',
        }),
      });
    });

    it('deve lidar com erro na transação', async () => {
      // Arrange
      const transactionError = new Error('Transaction failed');
      mockPrismaService.$transaction.mockRejectedValue(transactionError);

      // Act
      await service['criarAutoAvaliacaoComCards'](
        mockCiclo.idCiclo,
        mockColaborador.idColaborador,
        mockAutoavaliacaoData
      );

      // Assert
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Falha ao criar Autoavaliação completa.',
        transactionError
      );
    });
  });

  describe('criarAvaliacaoDePares', () => {
    beforeEach(() => {
      mockPrismaService.avaliacao.create.mockResolvedValue({
        idAvaliacao: 'avaliacao-pares-123',
        tipoAvaliacao: 'AVALIACAO_PARES',
      });
      mockPrismaService.avaliacaoPares.create.mockResolvedValue({
        idAvaliacao: 'avaliacao-pares-123',
      });
    });

    it('deve criar avaliação de pares com dados agregados', async () => {
      // Arrange
      const respostasMultiplas = [
        {
          'DÊ UMA NOTA GERAL PARA O COLABORADOR': '4.5',
          'PONTOS QUE FAZ BEM E DEVE EXPLORAR': 'Boa comunicação',
          'PONTOS QUE DEVE MELHORAR': 'Gestão de tempo',
          'VOCÊ FICARIA MOTIVADO EM TRABALHAR NOVAMENTE COM ESTE COLABORADOR': 'Sim',
        },
        {
          'DÊ UMA NOTA GERAL PARA O COLABORADOR': '4.0',
          'PONTOS QUE FAZ BEM E DEVE EXPLORAR': 'Conhecimento técnico',
          'PONTOS QUE DEVE MELHORAR': 'Proatividade',
          'VOCÊ FICARIA MOTIVADO EM TRABALHAR NOVAMENTE COM ESTE COLABORADOR': 'Definitivamente',
        },
      ];

      // Act
      await service['criarAvaliacaoDePares'](
        mockCiclo.idCiclo,
        'avaliado-123',
        'avaliador-456',
        respostasMultiplas
      );

      // Assert
      expect(mockPrismaService.avaliacao.create).toHaveBeenCalledWith({
        data: {
          idCiclo: mockCiclo.idCiclo,
          idAvaliado: 'avaliado-123',
          idAvaliador: 'avaliador-456',
          tipoAvaliacao: 'AVALIACAO_PARES',
          status: 'CONCLUIDA',
        },
      });

      expect(mockPrismaService.avaliacaoPares.create).toHaveBeenCalledWith({
        data: {
          idAvaliacao: 'avaliacao-pares-123',
          nota: 4.25, // Média de 4.5 e 4.0
          motivadoTrabalharNovamente: 'Sim\nDefinitivamente',
          pontosFortes: 'Boa comunicação\nConhecimento técnico',
          pontosFracos: 'Gestão de tempo\nProatividade',
        },
      });
    });

    it('deve lidar com uma única resposta', async () => {
      // Arrange
      const respostaUnica = [
        {
          'DÊ UMA NOTA GERAL PARA O COLABORADOR': '5.0',
          'PONTOS QUE FAZ BEM E DEVE EXPLORAR': 'Excelente liderança',
          'PONTOS QUE DEVE MELHORAR': 'Nada a melhorar',
          'VOCÊ FICARIA MOTIVADO EM TRABALHAR NOVAMENTE COM ESTE COLABORADOR': 'Certamente',
        },
      ];

      // Act
      await service['criarAvaliacaoDePares'](
        mockCiclo.idCiclo,
        'avaliado-123',
        'avaliador-456',
        respostaUnica
      );

      // Assert
      expect(mockPrismaService.avaliacaoPares.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nota: 5.0,
          motivadoTrabalharNovamente: 'Certamente',
          pontosFortes: 'Excelente liderança',
          pontosFracos: 'Nada a melhorar',
        }),
      });
    });

    it('deve lidar com notas inválidas', async () => {
      // Arrange
      const respostasComNotasInvalidas = [
        {
          'DÊ UMA NOTA GERAL PARA O COLABORADOR': 'NotaInvalida',
          'PONTOS QUE FAZ BEM E DEVE EXPLORAR': 'Pontos fortes',
          'PONTOS QUE DEVE MELHORAR': 'Pontos fracos',
          'VOCÊ FICARIA MOTIVADO EM TRABALHAR NOVAMENTE COM ESTE COLABORADOR': 'Sim',
        },
      ];

      // Act
      await service['criarAvaliacaoDePares'](
        mockCiclo.idCiclo,
        'avaliado-123',
        'avaliador-456',
        respostasComNotasInvalidas
      );

      // Assert
      expect(mockPrismaService.avaliacaoPares.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nota: 0, // Nota padrão quando não há notas válidas
        }),
      });
    });

    it('deve usar textos padrão quando campos estão vazios', async () => {
      // Arrange
      const respostasVazias = [
        {
          'DÊ UMA NOTA GERAL PARA O COLABORADOR': '4.0',
          'PONTOS QUE FAZ BEM E DEVE EXPLORAR': '',
          'PONTOS QUE DEVE MELHORAR': '',
          'VOCÊ FICARIA MOTIVADO EM TRABALHAR NOVAMENTE COM ESTE COLABORADOR': '',
        },
      ];

      // Act
      await service['criarAvaliacaoDePares'](
        mockCiclo.idCiclo,
        'avaliado-123',
        'avaliador-456',
        respostasVazias
      );

      // Assert
      expect(mockPrismaService.avaliacaoPares.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          motivadoTrabalharNovamente: null,
          pontosFortes: 'Nenhum ponto forte destacado.',
          pontosFracos: 'Nenhum ponto a melhorar destacado.',
        }),
      });
    });

    it('deve propagar erro da transação', async () => {
      // Arrange
      const transactionError = new Error('Transaction failed');
      mockPrismaService.$transaction.mockRejectedValue(transactionError);

      // Act & Assert
      await expect(
        service['criarAvaliacaoDePares'](
          mockCiclo.idCiclo,
          'avaliado-123',
          'avaliador-456',
          mockAvaliacao360Data
        )
      ).rejects.toThrow(transactionError);
    });
  });

  describe('agruparPorChave', () => {
    it('deve agrupar array por chave corretamente', () => {
      // Arrange
      const dados = [
        { email: 'user1@test.com', nome: 'User 1', valor: 'A' },
        { email: 'user2@test.com', nome: 'User 2', valor: 'B' },
        { email: 'user1@test.com', nome: 'User 1', valor: 'C' },
      ];

      // Act
      const resultado = service['agruparPorChave'](dados, 'email');

      // Assert
      expect(resultado).toEqual({
        'user1@test.com': [
          { email: 'user1@test.com', nome: 'User 1', valor: 'A' },
          { email: 'user1@test.com', nome: 'User 1', valor: 'C' },
        ],
        'user2@test.com': [
          { email: 'user2@test.com', nome: 'User 2', valor: 'B' },
        ],
      });
    });

    it('deve lidar com array vazio', () => {
      // Act
      const resultado = service['agruparPorChave']([], 'qualquerChave');

      // Assert
      expect(resultado).toEqual({});
    });

    it('deve lidar com chaves undefined/null', () => {
      // Arrange
      const dados = [
        { email: 'user1@test.com', nome: 'User 1' },
        { email: undefined, nome: 'User Undefined' },
        { email: null, nome: 'User Null' },
      ];

      // Act
      const resultado = service['agruparPorChave'](dados, 'email');

      // Assert
      expect(resultado).toEqual({
        'user1@test.com': [{ email: 'user1@test.com', nome: 'User 1' }],
        'undefined': [{ email: undefined, nome: 'User Undefined' }],
        'null': [{ email: null, nome: 'User Null' }],
      });
    });

    it('deve agrupar por diferentes tipos de chave', () => {
      // Arrange
      const dados = [
        { id: 1, tipo: 'A' },
        { id: 2, tipo: 'B' },
        { id: 1, tipo: 'C' },
      ];

      // Act
      const resultado = service['agruparPorChave'](dados, 'id');

      // Assert
      expect(resultado).toEqual({
        '1': [
          { id: 1, tipo: 'A' },
          { id: 1, tipo: 'C' },
        ],
        '2': [{ id: 2, tipo: 'B' }],
      });
    });
  });

  describe('Integração - processarArquivoEmBackground', () => {
    beforeEach(() => {
      // Setup mocks para integração completa
      mockPrismaService.colaborador.findUnique.mockResolvedValue(null);
      mockPrismaService.colaborador.create.mockResolvedValue(mockColaborador);
      mockPrismaService.colaborador.upsert.mockResolvedValue(mockColaborador);
      mockPrismaService.cicloAvaliacao.findFirst.mockResolvedValue(null);
      mockPrismaService.cicloAvaliacao.create.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.create.mockResolvedValue(mockAvaliacao);
      mockPrismaService.autoAvaliacao.create.mockResolvedValue({});
      mockPrismaService.criterioAvaliativo.findUnique.mockResolvedValue(mockCriterio);
      mockPrismaService.cardAutoAvaliacao.create.mockResolvedValue({});
      mockPrismaService.avaliacaoPares.create.mockResolvedValue({});
      mockPrismaService.indicacaoReferencia.create.mockResolvedValue({});
    });

    it('deve processar arquivo completo com sucesso', async () => {

      mockedXlsx.read.mockReturnValue(mockWorkbook);
      (mockedXlsx.utils.sheet_to_json as jest.Mock)
        .mockReturnValueOnce(mockPerfilData) // Perfil
        .mockReturnValueOnce(mockAutoavaliacaoData) // Autoavaliação
        .mockReturnValueOnce(mockAvaliacao360Data) // Avaliação 360
        .mockReturnValueOnce(mockReferenciasData); // Pesquisa de Referências

      // Act
      const resultado = await service.iniciarProcessoDeImportacao(mockFile);

      // Assert
      expect(resultado.statusCode).toBe(202);
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Iniciando processamento do arquivo em background...'
      );
    });

    it('deve abortar quando dados do perfil estão ausentes', async () => {
      // Arrange
      mockedXlsx.read.mockReturnValue(mockWorkbook);
      (mockedXlsx.utils.sheet_to_json as jest.Mock)
        .mockReturnValueOnce([]) // Perfil vazio
        .mockReturnValue([]);

      // Act
      await service['processarArquivoEmBackground'](mockFile.buffer);

      // Assert
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Dados obrigatórios do perfil ausentes. Importação abortada.'
      );
    });

  it('deve abortar quando perfil tem campos obrigatórios vazios', async () => {
    // Test missing Email field
    mockedXlsx.read.mockReturnValue(mockWorkbook);
    (mockedXlsx.utils.sheet_to_json as jest.Mock)
      .mockReturnValueOnce([{
        // Missing Email field
        'Nome ( nome.sobrenome )': 'João Silva',
        'Unidade': 'TI'
      }])
      .mockReturnValue([]);

    // Act
    await service['processarArquivoEmBackground'](mockFile.buffer);

    // Assert
    expect(Logger.prototype.warn).toHaveBeenCalledWith(
      'Dados obrigatórios do perfil ausentes. Importação abortada.'
    );
  });

  it('deve abortar quando perfil tem email vazio', async () => {
    // ✅ Test empty Email field
    mockedXlsx.read.mockReturnValue(mockWorkbook);
    (mockedXlsx.utils.sheet_to_json as jest.Mock)
      .mockReturnValueOnce([{
        'Email': '', // Empty email
        'Nome ( nome.sobrenome )': 'João Silva',
        'Unidade': 'TI'
      }])
      .mockReturnValue([]);

    // Act
    await service['processarArquivoEmBackground'](mockFile.buffer);

    // Assert
    expect(Logger.prototype.warn).toHaveBeenCalledWith(
      'Dados obrigatórios do perfil ausentes. Importação abortada.'
    );
  });

    it('deve lidar com erro crítico durante processamento', async () => {
      // Arrange
      const criticalError = new Error('Critical processing error');
      mockedXlsx.read.mockImplementation(() => {
        throw criticalError;
      });

      // Act
      await service.iniciarProcessoDeImportacao(mockFile);

      // Assert
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Falha crítica durante o processamento do arquivo.',
        expect.any(String)
      );
    });
  });

  describe('Casos edge e validações', () => {
    it('deve lidar com arquivo corrupto', async () => {
      // Arrange
      const arquivoCorrupto = {
        originalname: 'corrupto.xlsx',
        buffer: Buffer.from('dados corrompidos'),
      };

      mockedXlsx.read.mockImplementation(() => {
        throw new Error('Invalid file format');
      });

      // Act
      await service.iniciarProcessoDeImportacao(arquivoCorrupto);

      // Assert
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Falha crítica durante o processamento do arquivo.',
        expect.any(String)
      );
    });

    it('deve lidar com workbook sem sheets necessárias', async () => {
      // Arrange
      const workbookVazio = createMockWorkbook();
      mockedXlsx.read.mockReturnValue(workbookVazio);
      (mockedXlsx.utils.sheet_to_json as jest.Mock).mockReturnValue([]);

      // Act
      const resultado = await service.iniciarProcessoDeImportacao(mockFile);

      // Assert
      expect(resultado.statusCode).toBe(202);
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Dados obrigatórios do perfil ausentes. Importação abortada.'
      );
    });

    it('deve processar apenas abas disponíveis', async () => {
      // Arrange
      const workbookParcial = {
        Sheets: {
          'Perfil': {},
          // Apenas Perfil disponível
        },
        SheetNames: ['Perfil'],
      };

      mockedXlsx.read.mockReturnValue(workbookParcial);
      (mockedXlsx.utils.sheet_to_json as jest.Mock)
        .mockReturnValueOnce(mockPerfilData) // Perfil
        .mockReturnValue([]); // Outras abas vazias

      mockPrismaService.colaborador.create.mockResolvedValue(mockColaborador);
      mockPrismaService.cicloAvaliacao.create.mockResolvedValue(mockCiclo);

      // Act
      await service['processarArquivoEmBackground'](mockFile.buffer);

      // Assert
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Processamento em background concluído com sucesso!'
      );
    });
  });

  describe('Mapeamento de Critérios', () => {
    it('deve conter todos os mapeamentos necessários', () => {
      // Arrange
      const mapaEsperado = {
        'Organização': 'Organização no Trabalho',
        'Imagem': 'Atender aos prazos',
        'Iniciativa': 'Sentimento de Dono',
        'Comprometimento': 'Resiliência nas adversidades',
        'Flexibilidade': 'Resiliência nas adversidades',
        'Aprendizagem Contínua': 'Capacidade de aprender',
        'Trabalho em Equipe': 'Ser "team player"',
        'Relacionamento Inter-Pessoal': 'Ser "team player"',
        'Produtividade': 'Fazer mais com menos',
        'Qualidade': 'Entregar com qualidade',
        'Foco no Cliente': 'Entregar com qualidade',
        'Criatividade e Inovação': 'Pensar fora da caixa',
        'Gestão de Pessoas*': 'Gente',
        'Gestão de Projetos*': 'Resultados',
        'Gestão Organizacional*': 'Evolução da Rocket Corp',
        'Novos Clientes**': 'Evolução da Rocket Corp',
        'Novos Projetos**': 'Evolução da Rocket Corp',
        'Novos Produtos ou Serviços**': 'Evolução da Rocket Corp',
      };

      // Act
      const mapaAtual = service['MAPA_CRITERIOS_ANTIGOS_PARA_NOVOS'];

      // Assert
      expect(mapaAtual).toEqual(mapaEsperado);
      expect(Object.keys(mapaAtual)).toHaveLength(18);
    });

    it('deve mapear critérios duplicados para mesmo destino', () => {
      // Arrange
      const mapa = service['MAPA_CRITERIOS_ANTIGOS_PARA_NOVOS'];

      // Assert
      expect(mapa['Comprometimento']).toBe(mapa['Flexibilidade']);
      expect(mapa['Trabalho em Equipe']).toBe(mapa['Relacionamento Inter-Pessoal']);
      expect(mapa['Qualidade']).toBe(mapa['Foco no Cliente']);
    });
  });
});