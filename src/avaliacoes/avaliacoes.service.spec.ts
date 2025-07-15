import { Test, TestingModule } from '@nestjs/testing';
import { AvaliacoesService } from './avaliacoes.service';
import { PrismaService } from '../database/prismaService';
import { HashService } from '../common/hash.service';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { avaliacaoTipo, preenchimentoStatus } from '@prisma/client';
import { Motivacao, Status } from './avaliacoes.constants';
import { 
  AvaliacaoParesDto, 
  AvaliacaoColaboradorMentorDto, 
  PreencherAuto_ou_Lider_Dto 
} from './avaliacoes.dto';
import { stat } from 'fs';

describe('AvaliacoesService', () => {
  let service: AvaliacoesService;
  let prismaService: PrismaService;

  // Mock do PrismaService
  const mockPrismaService = {
    $transaction: jest.fn(),
    avaliacao: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    colaboradorCiclo: {
      findMany: jest.fn(),
    },
    pares: {
      findMany: jest.fn(),
    },
    liderColaborador: {
      findMany: jest.fn(),
    },
    mentorColaborador: {
      findMany: jest.fn(),
    },
    avaliacaoPares: {
      create: jest.fn(),
      update: jest.fn(),
    },
    avaliacaoColaboradorMentor: {
      update: jest.fn(),
    },
    autoAvaliacao: {
      update: jest.fn(),
    },
    avaliacaoLiderColaborador: {
      update: jest.fn(),
    },
    cardAutoAvaliacao: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    cardAvaliacaoLiderColaborador: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    criterioAvaliativo: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    associacaoCriterioCiclo: {
      findMany: jest.fn(),
    },
    cicloAvaliacao: {
      findUnique: jest.fn(),
    },
    equalizacao: {
      findMany: jest.fn(),
    },
    projeto: {
      findMany: jest.fn(),
    },
    alocacaoColaboradorProjeto: {
      findMany: jest.fn(),
    },
  };

  // Mock do HashService
  const mockHashService = {
    hash: jest.fn(),
    decrypt: jest.fn(),
  };

  // Dados de teste
  const mockIdCiclo = '123e4567-e89b-12d3-a456-426614174000';
  const mockIdAvaliacao = '789e0123-e89b-12d3-a456-426614174001';
  const mockIdColaborador1 = '456e7890-e89b-12d3-a456-426614174002';
  const mockIdColaborador2 = '987e6543-e89b-12d3-a456-426614174003';
  const mockIdLider = '654e3210-e89b-12d3-a456-426614174004';
  const mockIdMentor = '321e9876-e89b-12d3-a456-426614174005';

  const mockColaborador1 = {
    idColaborador: mockIdColaborador1,
    nomeCompleto: 'João Silva',
    email: 'joao.silva@empresa.com',
    cargo: 'Desenvolvedor',
    trilhaCarreira: 'Backend',
    unidade: 'TI',
    perfis: [{ tipoPerfil: 'COLABORADOR_COMUM' }],
  };

  const mockColaborador2 = {
    idColaborador: mockIdColaborador2,
    nomeCompleto: 'Maria Santos',
    email: 'maria.santos@empresa.com',
    cargo: 'Analista',
    trilhaCarreira: 'Frontend',
    unidade: 'TI',
    perfis: [{ tipoPerfil: 'COLABORADOR_COMUM' }],
  };

  const mockLider = {
    idColaborador: mockIdLider,
    nomeCompleto: 'Carlos Oliveira',
    email: 'carlos.oliveira@empresa.com',
    cargo: 'Gerente',
    trilhaCarreira: 'Gestão',
    unidade: 'TI',
    perfis: [{ tipoPerfil: 'LIDER' }],
  };

  const mockCicloAtivo = {
    idCiclo: mockIdCiclo,
    nomeCiclo: 'Ciclo Teste 2024',
    status: 'ATIVO',
    dataInicio: new Date(),
    dataFim: new Date(),
  };

  const mockParticipantesCiclo = [
    { 
      idColaborador: mockIdColaborador1, 
      idCiclo: mockIdCiclo, 
      colaborador: mockColaborador1 
    },
    { 
      idColaborador: mockIdColaborador2, 
      idCiclo: mockIdCiclo, 
      colaborador: mockColaborador2 
    },
  ];

  const mockPares = [
    {
      idColaborador1: mockIdColaborador1,
      idColaborador2: mockIdColaborador2,
      idCiclo: mockIdCiclo,
    },
  ];

  const mockLideresColaboradores = [
    {
      idLider: mockIdLider,
      idColaborador: mockIdColaborador1,
      idCiclo: mockIdCiclo,
      lider: mockLider,
      colaborador: mockColaborador1,
    },
  ];

  const mockMentoresColaboradores = [
    {
      idMentor: mockIdMentor,
      idColaborador: mockIdColaborador1,
      idCiclo: mockIdCiclo,
      mentor: { ...mockLider, idColaborador: mockIdMentor, nomeCompleto: 'Mentor Silva' },
      colaborador: mockColaborador1,
    },
  ];

  const mockCriterios = [
    {
      idCriterio: 'criterio1',
      nomeCriterio: 'Execução',
      pilar: 'Técnico',
      descricao: 'Capacidade de execução',
      peso: { toNumber: () => 1 },
    },
    {
      idCriterio: 'criterio2',
      nomeCriterio: 'Comunicação',
      pilar: 'Comportamental',
      descricao: 'Habilidades de comunicação',
      peso: { toNumber: () => 1 },
    },
  ];

  const mockAvaliacao = {
    idAvaliacao: mockIdAvaliacao,
    idCiclo: mockIdCiclo,
    idAvaliador: mockIdColaborador1,
    idAvaliado: mockIdColaborador1,
    tipoAvaliacao: 'AUTOAVALIACAO',
    status: 'PENDENTE',
  };

  // DTOs de teste
  const mockAvaliacaoParesDto: AvaliacaoParesDto = {
    idAvaliacao: mockIdAvaliacao,
    status: Status.PENDENTE,
    nota: 4.5,
    motivacao: Motivacao.Concordo_Totalmente,
    pontosFortes: 'Excelente comunicação e proatividade',
    pontosFracos: 'Pode melhorar na gestão de tempo',
  };

  const mockAvaliacaoMentorDto: AvaliacaoColaboradorMentorDto = {
    idAvaliacao: mockIdAvaliacao,
    status: Status.PENDENTE,
    nota: 4.0,
    justificativa: 'Excelente trabalho de mentoria',
  };

  const mockAutoAvaliacaoDto: PreencherAuto_ou_Lider_Dto = {
    idAvaliacao: mockIdAvaliacao,
    criterios: [
      {
        nome: 'Execução',
        nota: 4.5,
        justificativa: 'Bom desempenho em execução',
      },
      {
        nome: 'Comunicação',
        nota: 4.0,
        justificativa: 'Boa comunicação em equipe',
      },
    ],
  };

  const createMockDiscrepanciaCalculada = (desvioPadrao: number = 0.2) => ({
    calculada: true,
    desvioPadrao,
    nivel: desvioPadrao <= 0.5 ? 'BAIXA' : desvioPadrao <= 1.0 ? 'MEDIA' : 'ALTA',
    descricao: `Discrepância ${desvioPadrao <= 0.5 ? 'baixa' : desvioPadrao <= 1.0 ? 'média' : 'alta'} detectada`,
    baseDados: 'autoAvaliacao vs avaliacaoLider'
  });

  const createMockDiscrepanciaNaoCalculada = (motivo: string = 'Dados insuficientes') => ({
    calculada: false,
    motivo
  });

  const createMockAvaliacoesCompletas = () => ({
    autoAvaliacao: { quantidade: 1, media: 4.5 },
    avaliacaoPares: { quantidade: 1, media: 4.0 },
    avaliacaoLider: { quantidade: 1, media: 4.0 },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvaliacoesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: HashService,
          useValue: mockHashService,
        },
      ],
    }).compile();

    service = module.get<AvaliacoesService>(AvaliacoesService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Mock do Logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    // Configurar mocks do HashService
    mockHashService.hash.mockImplementation((value: string) => `encrypted_${value}`);
    mockHashService.decrypt.mockImplementation((encrypted: string) => {
      if (encrypted?.startsWith('encrypted_')) {
        return encrypted.replace('encrypted_', '');
      }
      return encrypted;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Definição do service', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('lancarAvaliacoes', () => {
    beforeEach(() => {
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCicloAtivo);
    });

    it('deve lançar todas as avaliações com sucesso', async () => {
      // Arrange
      const spyAutoAvaliacoes = jest.spyOn(service, 'lancarAutoAvaliacoes').mockResolvedValue({ lancadas: 2, existentes: 0, erros: 0 });
      const spyAvaliacaoPares = jest.spyOn(service, 'lancarAvaliacaoPares').mockResolvedValue({ lancadas: 2, existentes: 0, erros: 0 });
      const spyLiderColaborador = jest.spyOn(service, 'lancarAvaliacaoLiderColaborador').mockResolvedValue({ lancadas: 1, existentes: 0, erros: 0 });
      const spyColaboradorMentor = jest.spyOn(service, 'lancarAvaliacaoColaboradorMentor').mockResolvedValue({ lancadas: 1, existentes: 0, erros: 0 });

      // Act
      const resultado = await service.lancarAvaliacoes(mockIdCiclo);

      // Assert
      expect(resultado).toEqual({
        relatorio: {
          autoavaliacao: { lancadas: 2, existentes: 0, erros: 0 },
          avaliacaopares: { lancadas: 2, existentes: 0, erros: 0 },
          avaliacaoLiderColaborador: { lancadas: 1, existentes: 0, erros: 0 },
          avaliacaoColaboradorMentor: { lancadas: 1, existentes: 0, erros: 0 },
        },
      });

      expect(spyAutoAvaliacoes).toHaveBeenCalledWith(mockIdCiclo);
      expect(spyAvaliacaoPares).toHaveBeenCalledWith(mockIdCiclo);
      expect(spyLiderColaborador).toHaveBeenCalledWith(mockIdCiclo);
      expect(spyColaboradorMentor).toHaveBeenCalledWith(mockIdCiclo);
    });

    it('deve falhar quando ciclo não está ativo', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue({
        ...mockCicloAtivo,
        status: 'FECHADO',
      });

      // Act & Assert
      await expect(service.lancarAvaliacoes(mockIdCiclo)).rejects.toThrow(HttpException);
      await expect(service.lancarAvaliacoes(mockIdCiclo)).rejects.toThrow(
        `Ciclo de avaliação '${mockCicloAtivo.nomeCiclo}' está fechado e não permite operações.`
      );
    });

    it('deve falhar quando ciclo não existe', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.lancarAvaliacoes(mockIdCiclo)).rejects.toThrow(HttpException);
      await expect(service.lancarAvaliacoes(mockIdCiclo)).rejects.toThrow(
        `Ciclo de avaliação com ID ${mockIdCiclo} não encontrado.`
      );
    });
  });

  describe('lancarAutoAvaliacoes', () => {
    beforeEach(() => {
      mockPrismaService.colaboradorCiclo.findMany.mockResolvedValue(mockParticipantesCiclo);
      mockPrismaService.avaliacao.findMany.mockResolvedValue([]);
      mockPrismaService.associacaoCriterioCiclo.findMany.mockResolvedValue([
        { idCriterio: 'criterio1', criterio: mockCriterios[0] },
        { idCriterio: 'criterio2', criterio: mockCriterios[1] },
      ]);
      mockPrismaService.avaliacao.create.mockResolvedValue(mockAvaliacao);
    });

    it('deve lançar autoavaliações com sucesso', async () => {
      // Act
      const resultado = await service.lancarAutoAvaliacoes(mockIdCiclo);

      // Assert
      expect(resultado).toEqual({ lancadas: 2, existentes: 0, erros: 0 });
      expect(mockPrismaService.avaliacao.create).toHaveBeenCalledTimes(2);
    });

    it('deve retornar zero quando não há colaboradores no ciclo', async () => {
      // Arrange
      mockPrismaService.colaboradorCiclo.findMany.mockResolvedValue([]);

      // Act
      const resultado = await service.lancarAutoAvaliacoes(mockIdCiclo);

      // Assert
      expect(resultado).toEqual({ lancadas: 0, existentes: 0, erros: 0 });
      expect(mockPrismaService.avaliacao.create).not.toHaveBeenCalled();
    });

    it('deve contar existentes quando autoavaliação já existe', async () => {
      // Arrange
      mockPrismaService.avaliacao.findMany.mockResolvedValue([
        { idAvaliado: mockIdColaborador1 },
      ]);

      // Act
      const resultado = await service.lancarAutoAvaliacoes(mockIdCiclo);

      // Assert
      expect(resultado.existentes).toBe(1);
      expect(resultado.lancadas).toBe(1); // Apenas o segundo colaborador
    });

    it('deve contar erros quando não há critérios para colaborador', async () => {
      // Arrange
      mockPrismaService.associacaoCriterioCiclo.findMany.mockResolvedValue([]);

      // Act
      const resultado = await service.lancarAutoAvaliacoes(mockIdCiclo);

      // Assert
      expect(resultado.erros).toBe(2);
      expect(resultado.lancadas).toBe(0);
    });

    it('deve filtrar apenas colaboradores com perfil COLABORADOR_COMUM', async () => {
      // Arrange
      const participantesComPerfilDiferente = [
        {
          idColaborador: mockIdColaborador1,
          idCiclo: mockIdCiclo,
          colaborador: {
            ...mockColaborador1,
            perfis: [{ tipoPerfil: 'LIDER' }], // Perfil diferente
          },
        },
        ...mockParticipantesCiclo.slice(1), // Mantém o segundo com perfil correto
      ];
      mockPrismaService.colaboradorCiclo.findMany.mockResolvedValue(participantesComPerfilDiferente);

      // Act
      const resultado = await service.lancarAutoAvaliacoes(mockIdCiclo);

      // Assert
      expect(resultado.lancadas).toBe(1); // Apenas um colaborador com perfil correto
    });
  });

  describe('lancarAvaliacaoPares', () => {
    beforeEach(() => {
      // Mock para gerarParesPorProjetos
      mockPrismaService.projeto.findMany.mockResolvedValue([]);
      mockPrismaService.alocacaoColaboradorProjeto.findMany.mockResolvedValue([]);
      
      mockPrismaService.pares.findMany.mockResolvedValue(mockPares);
      mockPrismaService.avaliacao.findMany.mockResolvedValue([]);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          avaliacao: { 
            createMany: jest.fn().mockResolvedValue({ count: 2 }),
            findMany: jest.fn().mockResolvedValue([
              { idAvaliacao: mockIdAvaliacao + '1' },
              { idAvaliacao: mockIdAvaliacao + '2' }
            ])
          },
          avaliacaoPares: { 
            createMany: jest.fn().mockResolvedValue({ count: 2 })
          },
        };
        return callback(mockTx);
      });
    });

    it('deve lançar avaliações de pares com sucesso', async () => {
      // Act
      const resultado = await service.lancarAvaliacaoPares(mockIdCiclo);

      // Assert
      expect(resultado.lancadas).toBe(2); // A avalia B e B avalia A
      expect(resultado.existentes).toBe(0);
      expect(resultado.erros).toBe(0);
    });

    it('deve retornar zero quando não há pares no ciclo', async () => {
      // Arrange
      mockPrismaService.pares.findMany.mockResolvedValue([]);

      // Act
      const resultado = await service.lancarAvaliacaoPares(mockIdCiclo);

      // Assert
      expect(resultado).toEqual({ lancadas: 0, existentes: 0, erros: 0 });
    });

    it('deve contar existentes quando avaliações já existem', async () => {
      // Arrange
      mockPrismaService.avaliacao.findMany.mockResolvedValue([
        { idAvaliador: mockIdColaborador1, idAvaliado: mockIdColaborador2 },
      ]);

      // Mock para transação com apenas 1 nova avaliação
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          avaliacao: { 
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
            findMany: jest.fn().mockResolvedValue([
              { idAvaliacao: mockIdAvaliacao + '1' }
            ])
          },
          avaliacaoPares: { 
            createMany: jest.fn().mockResolvedValue({ count: 1 })
          },
        };
        return callback(mockTx);
      });

      // Act
      const resultado = await service.lancarAvaliacaoPares(mockIdCiclo);

      // Assert
      expect(resultado.existentes).toBe(1);
      expect(resultado.lancadas).toBe(1); // Apenas B avalia A
    });

    it('deve pular pares com IDs nulos', async () => {
      // Arrange
      mockPrismaService.pares.findMany.mockResolvedValue([
        { idColaborador1: null, idColaborador2: mockIdColaborador2, idCiclo: mockIdCiclo },
        ...mockPares,
      ]);

      // Mock para transação com 2 avaliações (do par válido)
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          avaliacao: { 
            createMany: jest.fn().mockResolvedValue({ count: 2 }),
            findMany: jest.fn().mockResolvedValue([
              { idAvaliacao: mockIdAvaliacao + '1' },
              { idAvaliacao: mockIdAvaliacao + '2' }
            ])
          },
          avaliacaoPares: { 
            createMany: jest.fn().mockResolvedValue({ count: 2 })
          },
        };
        return callback(mockTx);
      });

      // Act
      const resultado = await service.lancarAvaliacaoPares(mockIdCiclo);

      // Assert
      expect(resultado.lancadas).toBe(2); // Apenas o par válido
    });
  });

  describe('lancarAvaliacaoLiderColaborador', () => {
    beforeEach(() => {
      // Mock para gerarLiderColaboradorPorProjetos
      mockPrismaService.projeto.findMany.mockResolvedValue([]);
      mockPrismaService.alocacaoColaboradorProjeto.findMany.mockResolvedValue([]);
      
      mockPrismaService.liderColaborador.findMany.mockResolvedValue(mockLideresColaboradores);
      mockPrismaService.avaliacao.findMany.mockResolvedValue([]);
      mockPrismaService.associacaoCriterioCiclo.findMany.mockResolvedValue([
        { idCriterio: 'criterio1', criterio: mockCriterios[0] },
      ]);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          avaliacao: { create: jest.fn().mockResolvedValue(mockAvaliacao) },
        });
      });
    });

    it('deve lançar avaliações líder-colaborador com sucesso', async () => {
      // Act
      const resultado = await service.lancarAvaliacaoLiderColaborador(mockIdCiclo);

      // Assert
      expect(resultado.lancadas).toBe(1);
      expect(resultado.existentes).toBe(0);
      expect(resultado.erros).toBe(0);
    });

    it('deve retornar zero quando não há relações líder-colaborador', async () => {
      // Arrange
      mockPrismaService.liderColaborador.findMany.mockResolvedValue([]);

      // Act
      const resultado = await service.lancarAvaliacaoLiderColaborador(mockIdCiclo);

      // Assert
      expect(resultado).toEqual({ lancadas: 0, existentes: 0, erros: 0 });
    });

    it('deve contar existentes quando avaliação já existe', async () => {
      // Arrange
      mockPrismaService.avaliacao.findMany.mockResolvedValue([
        { idAvaliador: mockIdLider, idAvaliado: mockIdColaborador1 },
      ]);

      // Act
      const resultado = await service.lancarAvaliacaoLiderColaborador(mockIdCiclo);

      // Assert
      expect(resultado.existentes).toBe(1);
      expect(resultado.lancadas).toBe(0);
    });
  });

  describe('lancarAvaliacaoColaboradorMentor', () => {
    beforeEach(() => {
      mockPrismaService.mentorColaborador.findMany.mockResolvedValue(mockMentoresColaboradores);
      mockPrismaService.avaliacao.findMany.mockResolvedValue([]);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          avaliacao: { create: jest.fn().mockResolvedValue(mockAvaliacao) },
        });
      });
    });

    it('deve lançar avaliações colaborador-mentor com sucesso', async () => {
      // Act
      const resultado = await service.lancarAvaliacaoColaboradorMentor(mockIdCiclo);

      // Assert
      expect(resultado.lancadas).toBe(1);
      expect(resultado.existentes).toBe(0);
      expect(resultado.erros).toBe(0);
    });

    it('deve retornar zero quando não há relações mentor-colaborador', async () => {
      // Arrange
      mockPrismaService.mentorColaborador.findMany.mockResolvedValue([]);

      // Act
      const resultado = await service.lancarAvaliacaoColaboradorMentor(mockIdCiclo);

      // Assert
      expect(resultado).toEqual({ lancadas: 0, existentes: 0, erros: 0 });
    });
  });

  describe('preencherAvaliacaoPares', () => {
    beforeEach(() => {
      mockPrismaService.avaliacao.findUnique.mockResolvedValue({
        ...mockAvaliacao,
        tipoAvaliacao: 'AVALIACAO_PARES',
        avaliacaoPares: {},
      });
      mockPrismaService.avaliacaoPares.update.mockResolvedValue({});
      mockPrismaService.avaliacao.update.mockResolvedValue({});
    });

    it('deve preencher avaliação de pares com sucesso', async () => {
      // Act
      await service.preencherAvaliacaoPares(
        mockIdAvaliacao,
        Status.CONCLUIDA,
        mockAvaliacaoParesDto.nota,
        mockAvaliacaoParesDto.motivacao,
        mockAvaliacaoParesDto.pontosFortes,
        mockAvaliacaoParesDto.pontosFracos
      );

      // Assert
      expect(mockPrismaService.avaliacaoPares.update).toHaveBeenCalledWith({
        where: { idAvaliacao: mockIdAvaliacao },
        data: {
          nota: mockAvaliacaoParesDto.nota,
          motivadoTrabalharNovamente: mockAvaliacaoParesDto.motivacao,
          pontosFortes: `encrypted_${mockAvaliacaoParesDto.pontosFortes}`,
          pontosFracos: `encrypted_${mockAvaliacaoParesDto.pontosFracos}`,
        },
      });

      expect(mockPrismaService.avaliacao.update).toHaveBeenCalledWith({
        where: { idAvaliacao: mockIdAvaliacao },
        data: { status: 'CONCLUIDA' },
      });
    });

    it('deve falhar quando avaliação não existe', async () => {
      // Arrange
      mockPrismaService.avaliacao.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.preencherAvaliacaoPares(
          mockIdAvaliacao,
          Status.PENDENTE,
          4.5,
          Motivacao.Concordo_Totalmente,
          'Pontos fortes',
          'Pontos fracos'
        )
      ).rejects.toThrow(HttpException);
    });

    it('deve falhar quando tipo de avaliação está incorreto', async () => {
      // Arrange
      mockPrismaService.avaliacao.findUnique.mockResolvedValue({
        ...mockAvaliacao,
        tipoAvaliacao: 'AUTOAVALIACAO', // Tipo incorreto
      });

      // Act & Assert
      await expect(
        service.preencherAvaliacaoPares(
          mockIdAvaliacao,
          Status.PENDENTE,
          4.5,
          Motivacao.Concordo_Totalmente,
          'Pontos fortes',
          'Pontos fracos'
        )
      ).rejects.toThrow(HttpException);
    });

    it('deve falhar quando avaliação já está concluída', async () => {
      // Arrange
      mockPrismaService.avaliacao.findUnique.mockResolvedValue({
        ...mockAvaliacao,
        tipoAvaliacao: 'AVALIACAO_PARES',
        status: 'CONCLUIDA',
        avaliacaoPares: {},
      });

      // Act & Assert
      await expect(
        service.preencherAvaliacaoPares(
          mockIdAvaliacao,
          Status.PENDENTE,
          4.5,
          Motivacao.Concordo_Totalmente,
          'Pontos fortes',
          'Pontos fracos'
        )
      ).rejects.toThrow(HttpException);
    });

    it('deve falhar quando nota é inválida', async () => {
      // Act & Assert
      await expect(
        service.preencherAvaliacaoPares(
          mockIdAvaliacao,
          Status.PENDENTE,
          6.0, // Nota inválida > 5
          Motivacao.Concordo_Totalmente,
          'Pontos fortes',
          'Pontos fracos'
        )
      ).rejects.toThrow(HttpException);

      // Act & Assert
      await expect(
        service.preencherAvaliacaoPares(
          mockIdAvaliacao,
          Status.PENDENTE,
          4.3, // Nota não múltipla de 0.5
          Motivacao.Concordo_Totalmente,
          'Pontos fortes',
          'Pontos fracos'
        )
      ).rejects.toThrow(HttpException);
    });
  });

  describe('preencherAvaliacaoColaboradorMentor', () => {
    beforeEach(() => {
      mockPrismaService.avaliacao.findUnique.mockResolvedValue({
        ...mockAvaliacao,
        tipoAvaliacao: 'COLABORADOR_MENTOR',
        avaliacaoColaboradorMentor: {},
      });
      mockPrismaService.avaliacaoColaboradorMentor.update.mockResolvedValue({});
      mockPrismaService.avaliacao.update.mockResolvedValue({});
    });

    it('deve preencher avaliação colaborador-mentor com sucesso', async () => {
      // Act
      await service.preencherAvaliacaoColaboradorMentor(
        mockIdAvaliacao,
        Status.CONCLUIDA,
        mockAvaliacaoMentorDto.nota,
        mockAvaliacaoMentorDto.justificativa
      );

      // Assert
      expect(mockPrismaService.avaliacaoColaboradorMentor.update).toHaveBeenCalledWith({
        where: { idAvaliacao: mockIdAvaliacao },
        data: {
          nota: mockAvaliacaoMentorDto.nota,
          justificativa: `encrypted_${mockAvaliacaoMentorDto.justificativa}`,
        },
      });

      expect(mockPrismaService.avaliacao.update).toHaveBeenCalledWith({
        where: { idAvaliacao: mockIdAvaliacao },
        data: { status: 'CONCLUIDA' },
      });
    });

    it('deve falhar quando tipo de avaliação está incorreto', async () => {
      // Arrange
      mockPrismaService.avaliacao.findUnique.mockResolvedValue({
        ...mockAvaliacao,
        tipoAvaliacao: 'AUTOAVALIACAO',
      });

      // Act & Assert
      await expect(
        service.preencherAvaliacaoColaboradorMentor(mockIdAvaliacao, Status.PENDENTE, 4.5, 'Justificativa')
      ).rejects.toThrow(HttpException);
    });
  });

  describe('preencherAutoAvaliacao', () => {
    beforeEach(() => {
      mockPrismaService.avaliacao.findUnique.mockResolvedValue({
        ...mockAvaliacao,
        tipoAvaliacao: 'AUTOAVALIACAO',
        autoAvaliacao: {},
      });
      mockPrismaService.cardAutoAvaliacao.count.mockResolvedValue(2);
      mockPrismaService.cardAutoAvaliacao.findFirst
        .mockResolvedValueOnce({ idCardAvaliacao: 'card1', nomeCriterio: 'Execução' })
        .mockResolvedValueOnce({ idCardAvaliacao: 'card2', nomeCriterio: 'Comunicação' });
      mockPrismaService.criterioAvaliativo.findFirst
        .mockResolvedValue({ peso: { toNumber: () => 1 } });
      mockPrismaService.cardAutoAvaliacao.update.mockResolvedValue({});
      mockPrismaService.avaliacao.update.mockResolvedValue({});
      mockPrismaService.autoAvaliacao.update.mockResolvedValue({});
    });

    it('deve preencher autoavaliação com sucesso', async () => {
      // Act
      await service.preencherAutoAvaliacao(mockIdAvaliacao, mockAutoAvaliacaoDto.criterios);

      // Assert
      expect(mockPrismaService.cardAutoAvaliacao.update).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.avaliacao.update).toHaveBeenCalledWith({
        where: { idAvaliacao: mockIdAvaliacao },
        data: { status: 'CONCLUIDA' },
      });
      expect(mockPrismaService.autoAvaliacao.update).toHaveBeenCalledWith({
        where: { idAvaliacao: mockIdAvaliacao },
        data: { notaFinal: 4.25 }, // (4.5 + 4.0) / 2
      });
    });

    it('deve falhar quando quantidade de critérios não confere', async () => {
      // Arrange
      mockPrismaService.cardAutoAvaliacao.count.mockResolvedValue(1); // Diferente da quantidade enviada

      // Act & Assert
      await expect(
        service.preencherAutoAvaliacao(mockIdAvaliacao, mockAutoAvaliacaoDto.criterios)
      ).rejects.toThrow(HttpException);
    });

    it('deve falhar quando card não é encontrado para critério', async () => {
      // Arrange
      mockPrismaService.avaliacao.findUnique.mockReset();
      mockPrismaService.cardAutoAvaliacao.count.mockReset();
      mockPrismaService.cardAutoAvaliacao.findFirst.mockReset();

      mockPrismaService.avaliacao.findUnique.mockResolvedValue({
        ...mockAvaliacao,
        tipoAvaliacao: 'AUTOAVALIACAO',
        status: 'PENDENTE',
        autoAvaliacao: {},
      });

      mockPrismaService.cardAutoAvaliacao.count.mockResolvedValue(2);
      mockPrismaService.cardAutoAvaliacao.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.preencherAutoAvaliacao(mockIdAvaliacao, mockAutoAvaliacaoDto.criterios)
      ).rejects.toThrow(HttpException);
      await expect(
        service.preencherAutoAvaliacao(mockIdAvaliacao, mockAutoAvaliacaoDto.criterios)
      ).rejects.toThrow('Card não encontrado para critério: Execução');
    });
  });

  describe('preencherAvaliacaoLiderColaborador', () => {
    beforeEach(() => {
      mockPrismaService.avaliacao.findUnique.mockResolvedValue({
        ...mockAvaliacao,
        tipoAvaliacao: 'LIDER_COLABORADOR',
        avaliacaoLiderColaborador: {},
      });
      mockPrismaService.cardAvaliacaoLiderColaborador.count.mockResolvedValue(2);
      mockPrismaService.cardAvaliacaoLiderColaborador.findFirst
        .mockResolvedValueOnce({ idCardAvaliacao: 'card1', nomeCriterio: 'Execução' })
        .mockResolvedValueOnce({ idCardAvaliacao: 'card2', nomeCriterio: 'Comunicação' });
      mockPrismaService.criterioAvaliativo.findFirst
        .mockResolvedValue({ peso: { toNumber: () => 1 } });
      mockPrismaService.cardAvaliacaoLiderColaborador.update.mockResolvedValue({});
      mockPrismaService.avaliacao.update.mockResolvedValue({});
      mockPrismaService.avaliacaoLiderColaborador.update.mockResolvedValue({});
    });

    it('deve preencher avaliação líder-colaborador com sucesso', async () => {
      // Act
      await service.preencherAvaliacaoLiderColaborador(mockIdAvaliacao, mockAutoAvaliacaoDto.criterios);

      // Assert
      expect(mockPrismaService.cardAvaliacaoLiderColaborador.update).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.avaliacao.update).toHaveBeenCalledWith({
        where: { idAvaliacao: mockIdAvaliacao },
        data: { status: 'CONCLUIDA' },
      });
    });

    it('deve falhar quando tipo de avaliação está incorreto', async () => {
      // Arrange
      mockPrismaService.avaliacao.findUnique.mockResolvedValue({
        ...mockAvaliacao,
        tipoAvaliacao: 'AUTOAVALIACAO',
      });

      // Act & Assert
      await expect(
        service.preencherAvaliacaoLiderColaborador(mockIdAvaliacao, mockAutoAvaliacaoDto.criterios)
      ).rejects.toThrow(HttpException);
    });
  });

  describe('preencherRascunhoAutoAvaliacao', () => {
    beforeEach(() => {
      mockPrismaService.avaliacao.findUnique.mockResolvedValue({
        ...mockAvaliacao,
        tipoAvaliacao: 'AUTOAVALIACAO',
        status: 'PENDENTE',
        autoAvaliacao: {},
      });
      mockPrismaService.cardAutoAvaliacao.findFirst
        .mockResolvedValueOnce({ idCardAvaliacao: 'card1', nomeCriterio: 'Execução' })
        .mockResolvedValueOnce({ idCardAvaliacao: 'card2', nomeCriterio: 'Comunicação' });
      mockPrismaService.cardAutoAvaliacao.update.mockResolvedValue({});
      mockPrismaService.avaliacao.update.mockResolvedValue({});
    });

    it('deve salvar rascunho de autoavaliação com sucesso', async () => {
      // Act
      await service.preencherRascunhoAutoAvaliacao(mockIdAvaliacao, mockAutoAvaliacaoDto.criterios);

      // Assert
      expect(mockPrismaService.cardAutoAvaliacao.update).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.cardAutoAvaliacao.update).toHaveBeenCalledWith({
        where: { idCardAvaliacao: 'card1' },
        data: {
          nota: 4.5,
          justificativa: 'encrypted_Bom desempenho em execução'
        }
      });
      expect(mockPrismaService.cardAutoAvaliacao.update).toHaveBeenCalledWith({
        where: { idCardAvaliacao: 'card2' },
        data: {
          nota: 4.0,
          justificativa: 'encrypted_Boa comunicação em equipe'
        }
      });
      expect(mockPrismaService.avaliacao.update).toHaveBeenCalledWith({
        where: { idAvaliacao: mockIdAvaliacao },
        data: { status: 'EM_RASCUNHO' },
      });
    });

    it('deve permitir rascunho com critérios parciais', async () => {
      // Arrange
      const criteriosParciais = [mockAutoAvaliacaoDto.criterios[0]]; // Apenas um critério
      mockPrismaService.cardAutoAvaliacao.findFirst
        .mockResolvedValueOnce({ idCardAvaliacao: 'card1', nomeCriterio: 'Execução' });

      // Act
      await service.preencherRascunhoAutoAvaliacao(mockIdAvaliacao, criteriosParciais);

      // Assert
      expect(mockPrismaService.cardAutoAvaliacao.update).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.avaliacao.update).toHaveBeenCalledWith({
        where: { idAvaliacao: mockIdAvaliacao },
        data: { status: 'EM_RASCUNHO' },
      });
    });

    it('deve falhar quando avaliação não existe', async () => {
      // Arrange
      mockPrismaService.avaliacao.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.preencherRascunhoAutoAvaliacao(mockIdAvaliacao, mockAutoAvaliacaoDto.criterios)
      ).rejects.toThrow(HttpException);
    });

    it('deve falhar quando avaliação não é do tipo AUTOAVALIACAO', async () => {
      // Arrange
      mockPrismaService.avaliacao.findUnique.mockResolvedValue({
        ...mockAvaliacao,
        tipoAvaliacao: 'AVALIACAO_PARES',
        autoAvaliacao: {},
      });

      // Act & Assert
      await expect(
        service.preencherRascunhoAutoAvaliacao(mockIdAvaliacao, mockAutoAvaliacaoDto.criterios)
      ).rejects.toThrow(HttpException);
      await expect(
        service.preencherRascunhoAutoAvaliacao(mockIdAvaliacao, mockAutoAvaliacaoDto.criterios)
      ).rejects.toThrow('Avaliação não é do tipo AUTOAVALIACAO.');
    });

    it('deve falhar quando avaliação já está concluída', async () => {
      // Arrange
      mockPrismaService.avaliacao.findUnique.mockResolvedValue({
        ...mockAvaliacao,
        tipoAvaliacao: 'AUTOAVALIACAO',
        status: 'CONCLUIDA',
        autoAvaliacao: {},
      });

      // Act & Assert
      await expect(
        service.preencherRascunhoAutoAvaliacao(mockIdAvaliacao, mockAutoAvaliacaoDto.criterios)
      ).rejects.toThrow(HttpException);
      await expect(
        service.preencherRascunhoAutoAvaliacao(mockIdAvaliacao, mockAutoAvaliacaoDto.criterios)
      ).rejects.toThrow('Avaliação já foi concluída.');
    });

    it('deve falhar quando card não é encontrado para critério', async () => {
      // Arrange
      mockPrismaService.cardAutoAvaliacao.findFirst.mockReset();
      mockPrismaService.cardAutoAvaliacao.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.preencherRascunhoAutoAvaliacao(mockIdAvaliacao, mockAutoAvaliacaoDto.criterios)
      ).rejects.toThrow(HttpException);
      
      // Reset para segunda chamada
      mockPrismaService.cardAutoAvaliacao.findFirst.mockReset();
      mockPrismaService.cardAutoAvaliacao.findFirst.mockResolvedValue(null);
      
      await expect(
        service.preencherRascunhoAutoAvaliacao(mockIdAvaliacao, mockAutoAvaliacaoDto.criterios)
      ).rejects.toThrow('Card não encontrado para critério: Execução');
    });

    it('deve validar notas antes de salvar rascunho', async () => {
      // Arrange
      const criteriosComNotaInvalida = [
        {
          nome: 'Execução',
          nota: 6.0, // Nota inválida (> 5.0)
          justificativa: 'Teste'
        }
      ];

      // Act & Assert
      await expect(
        service.preencherRascunhoAutoAvaliacao(mockIdAvaliacao, criteriosComNotaInvalida)
      ).rejects.toThrow(HttpException);
    });

    it('deve permitir sobrescrever rascunho existente', async () => {
      // Arrange
      mockPrismaService.avaliacao.findUnique.mockResolvedValue({
        ...mockAvaliacao,
        tipoAvaliacao: 'AUTOAVALIACAO',
        status: 'EM_RASCUNHO', // Já em rascunho
        autoAvaliacao: {},
      });

      // Act
      await service.preencherRascunhoAutoAvaliacao(mockIdAvaliacao, mockAutoAvaliacaoDto.criterios);

      // Assert
      expect(mockPrismaService.cardAutoAvaliacao.update).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.avaliacao.update).toHaveBeenCalledWith({
        where: { idAvaliacao: mockIdAvaliacao },
        data: { status: 'EM_RASCUNHO' },
      });
    });
  });

  describe('preencherRascunhoLiderColaborador', () => {
    beforeEach(() => {
      mockPrismaService.avaliacao.findUnique.mockResolvedValue({
        ...mockAvaliacao,
        tipoAvaliacao: 'LIDER_COLABORADOR',
        status: 'PENDENTE',
        autoAvaliacao: {}, // Note: o service usa autoAvaliacao mas deveria usar avaliacaoLiderColaborador
      });
      mockPrismaService.cardAvaliacaoLiderColaborador.findFirst
        .mockResolvedValueOnce({ idCardAvaliacao: 'card1', nomeCriterio: 'Execução' })
        .mockResolvedValueOnce({ idCardAvaliacao: 'card2', nomeCriterio: 'Comunicação' });
      mockPrismaService.cardAvaliacaoLiderColaborador.update.mockResolvedValue({});
      mockPrismaService.avaliacao.update.mockResolvedValue({});
    });

    it('deve salvar rascunho de avaliação líder-colaborador com sucesso', async () => {
      // Act
      await service.preencherRascunhoLiderColaborador(mockIdAvaliacao, mockAutoAvaliacaoDto.criterios);

      // Assert
      expect(mockPrismaService.cardAvaliacaoLiderColaborador.update).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.cardAvaliacaoLiderColaborador.update).toHaveBeenCalledWith({
        where: { idCardAvaliacao: 'card1' },
        data: {
          nota: 4.5,
          justificativa: 'encrypted_Bom desempenho em execução'
        }
      });
      expect(mockPrismaService.cardAvaliacaoLiderColaborador.update).toHaveBeenCalledWith({
        where: { idCardAvaliacao: 'card2' },
        data: {
          nota: 4.0,
          justificativa: 'encrypted_Boa comunicação em equipe'
        }
      });
      expect(mockPrismaService.avaliacao.update).toHaveBeenCalledWith({
        where: { idAvaliacao: mockIdAvaliacao },
        data: { status: 'EM_RASCUNHO' },
      });
    });

    it('deve permitir rascunho com critérios parciais', async () => {
      // Arrange
      const criteriosParciais = [mockAutoAvaliacaoDto.criterios[0]];
      mockPrismaService.cardAvaliacaoLiderColaborador.findFirst
        .mockResolvedValueOnce({ idCardAvaliacao: 'card1', nomeCriterio: 'Execução' });

      // Act
      await service.preencherRascunhoLiderColaborador(mockIdAvaliacao, criteriosParciais);

      // Assert
      expect(mockPrismaService.cardAvaliacaoLiderColaborador.update).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.avaliacao.update).toHaveBeenCalledWith({
        where: { idAvaliacao: mockIdAvaliacao },
        data: { status: 'EM_RASCUNHO' },
      });
    });

    it('deve falhar quando avaliação não existe', async () => {
      // Arrange
      mockPrismaService.avaliacao.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.preencherRascunhoLiderColaborador(mockIdAvaliacao, mockAutoAvaliacaoDto.criterios)
      ).rejects.toThrow(HttpException);
    });

    it('deve falhar quando avaliação não é do tipo LIDER_COLABORADOR', async () => {
      // Arrange
      mockPrismaService.avaliacao.findUnique.mockResolvedValue({
        ...mockAvaliacao,
        tipoAvaliacao: 'AUTOAVALIACAO',
        autoAvaliacao: {},
      });

      // Act & Assert
      await expect(
        service.preencherRascunhoLiderColaborador(mockIdAvaliacao, mockAutoAvaliacaoDto.criterios)
      ).rejects.toThrow(HttpException);
      await expect(
        service.preencherRascunhoLiderColaborador(mockIdAvaliacao, mockAutoAvaliacaoDto.criterios)
      ).rejects.toThrow('Avaliação não é do tipo LIDER_COLABORADOR.');
    });

    it('deve falhar quando avaliação já está concluída', async () => {
      // Arrange
      mockPrismaService.avaliacao.findUnique.mockResolvedValue({
        ...mockAvaliacao,
        tipoAvaliacao: 'LIDER_COLABORADOR',
        status: 'CONCLUIDA',
        autoAvaliacao: {},
      });

      // Act & Assert
      await expect(
        service.preencherRascunhoLiderColaborador(mockIdAvaliacao, mockAutoAvaliacaoDto.criterios)
      ).rejects.toThrow(HttpException);
      await expect(
        service.preencherRascunhoLiderColaborador(mockIdAvaliacao, mockAutoAvaliacaoDto.criterios)
      ).rejects.toThrow('Avaliação já foi concluída.');
    });

    it('deve falhar quando card não é encontrado para critério', async () => {
      // Arrange
      mockPrismaService.cardAvaliacaoLiderColaborador.findFirst.mockReset();
      mockPrismaService.cardAvaliacaoLiderColaborador.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.preencherRascunhoLiderColaborador(mockIdAvaliacao, mockAutoAvaliacaoDto.criterios)
      ).rejects.toThrow(HttpException);
      
      // Reset para segunda chamada
      mockPrismaService.cardAvaliacaoLiderColaborador.findFirst.mockReset();
      mockPrismaService.cardAvaliacaoLiderColaborador.findFirst.mockResolvedValue(null);
      
      await expect(
        service.preencherRascunhoLiderColaborador(mockIdAvaliacao, mockAutoAvaliacaoDto.criterios)
      ).rejects.toThrow('Card não encontrado para critério: Execução');
    });

    it('deve validar notas antes de salvar rascunho', async () => {
      // Arrange
      const criteriosComNotaInvalida = [
        {
          nome: 'Execução',
          nota: -1.0, // Nota inválida (< 0.0)
          justificativa: 'Teste'
        }
      ];

      // Act & Assert
      await expect(
        service.preencherRascunhoLiderColaborador(mockIdAvaliacao, criteriosComNotaInvalida)
      ).rejects.toThrow(HttpException);
    });

    it('deve permitir sobrescrever rascunho existente', async () => {
      // Arrange
      mockPrismaService.avaliacao.findUnique.mockResolvedValue({
        ...mockAvaliacao,
        tipoAvaliacao: 'LIDER_COLABORADOR',
        status: 'EM_RASCUNHO', // Já em rascunho
        autoAvaliacao: {},
      });

      // Act
      await service.preencherRascunhoLiderColaborador(mockIdAvaliacao, mockAutoAvaliacaoDto.criterios);

      // Assert
      expect(mockPrismaService.cardAvaliacaoLiderColaborador.update).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.avaliacao.update).toHaveBeenCalledWith({
        where: { idAvaliacao: mockIdAvaliacao },
        data: { status: 'EM_RASCUNHO' },
      });
    });

    it('deve criptografar justificativas no rascunho', async () => {
      // Arrange
      const criteriosComJustificativas = [
        {
          nome: 'Execução',
          nota: 4.5,
          justificativa: 'Justificativa detalhada para teste de criptografia'
        }
      ];
      mockPrismaService.cardAvaliacaoLiderColaborador.findFirst
        .mockResolvedValueOnce({ idCardAvaliacao: 'card1', nomeCriterio: 'Execução' });

      // Act
      await service.preencherRascunhoLiderColaborador(mockIdAvaliacao, criteriosComJustificativas);

      // Assert
      expect(mockHashService.hash).toHaveBeenCalledWith('Justificativa detalhada para teste de criptografia');
      expect(mockPrismaService.cardAvaliacaoLiderColaborador.update).toHaveBeenCalledWith({
        where: { idCardAvaliacao: 'card1' },
        data: {
          nota: 4.5,
          justificativa: 'encrypted_Justificativa detalhada para teste de criptografia'
        }
      });
    });
  });

  describe('Validações para funcionalidades de rascunho', () => {
    describe('verificarAvaliacaoStatus para rascunhos', () => {
      it('deve permitir avaliação em rascunho para métodos de rascunho', async () => {
        // Arrange - Status EM_RASCUNHO deve ser válido para funções de rascunho
        const avaliacaoEmRascunho = { 
          ...mockAvaliacao,
          status: 'EM_RASCUNHO',
          tipoAvaliacao: 'AUTOAVALIACAO',
          autoAvaliacao: {}
        };
        
        mockPrismaService.avaliacao.findUnique.mockResolvedValue(avaliacaoEmRascunho);
        mockPrismaService.cardAutoAvaliacao.findFirst
          .mockResolvedValueOnce({ idCardAvaliacao: 'card1', nomeCriterio: 'Execução' });

        // Act & Assert - deve permitir atualizar rascunho
        await expect(
          service.preencherRascunhoAutoAvaliacao(mockIdAvaliacao, [mockAutoAvaliacaoDto.criterios[0]])
        ).resolves.not.toThrow();
      });

      it('deve permitir finalizar avaliação que está em rascunho', async () => {
        // Arrange
        const avaliacaoEmRascunho = { 
          ...mockAvaliacao,
          status: 'EM_RASCUNHO',
          tipoAvaliacao: 'AUTOAVALIACAO',
          autoAvaliacao: {}
        };
        
        mockPrismaService.avaliacao.findUnique.mockResolvedValue(avaliacaoEmRascunho);
        mockPrismaService.cardAutoAvaliacao.count.mockResolvedValue(2);
        mockPrismaService.cardAutoAvaliacao.findFirst
          .mockResolvedValueOnce({ idCardAvaliacao: 'card1', nomeCriterio: 'Execução' })
          .mockResolvedValueOnce({ idCardAvaliacao: 'card2', nomeCriterio: 'Comunicação' });
        mockPrismaService.criterioAvaliativo.findFirst
          .mockResolvedValue({ peso: { toNumber: () => 1 } });
        mockPrismaService.cardAutoAvaliacao.update.mockResolvedValue({});
        mockPrismaService.avaliacao.update.mockResolvedValue({});
        mockPrismaService.autoAvaliacao.update.mockResolvedValue({});

        // Act & Assert - deve permitir finalizar avaliação que estava em rascunho
        await expect(
          service.preencherAutoAvaliacao(mockIdAvaliacao, mockAutoAvaliacaoDto.criterios)
        ).resolves.not.toThrow();

        expect(mockPrismaService.avaliacao.update).toHaveBeenCalledWith({
          where: { idAvaliacao: mockIdAvaliacao },
          data: { status: 'CONCLUIDA' },
        });
      });
    });

    describe('Fluxo completo: rascunho para conclusão', () => {
      it('deve permitir salvar rascunho e depois finalizar', async () => {
        // Arrange - primeiro estado PENDENTE
        mockPrismaService.avaliacao.findUnique
          .mockResolvedValueOnce({
            ...mockAvaliacao,
            tipoAvaliacao: 'AUTOAVALIACAO',
            status: 'PENDENTE',
            autoAvaliacao: {},
          })
          .mockResolvedValueOnce({
            ...mockAvaliacao,
            tipoAvaliacao: 'AUTOAVALIACAO',
            status: 'EM_RASCUNHO',
            autoAvaliacao: {},
          });

        mockPrismaService.cardAutoAvaliacao.findFirst
          .mockResolvedValue({ idCardAvaliacao: 'card1', nomeCriterio: 'Execução' });
        mockPrismaService.cardAutoAvaliacao.count.mockResolvedValue(1);
        mockPrismaService.criterioAvaliativo.findFirst
          .mockResolvedValue({ peso: { toNumber: () => 1 } });

        // Act 1 - Salvar rascunho
        await service.preencherRascunhoAutoAvaliacao(mockIdAvaliacao, [mockAutoAvaliacaoDto.criterios[0]]);

        // Assert 1
        expect(mockPrismaService.avaliacao.update).toHaveBeenCalledWith({
          where: { idAvaliacao: mockIdAvaliacao },
          data: { status: 'EM_RASCUNHO' },
        });

        // Reset mocks for second call
        jest.clearAllMocks();
        mockPrismaService.avaliacao.findUnique.mockResolvedValue({
          ...mockAvaliacao,
          tipoAvaliacao: 'AUTOAVALIACAO',
          status: 'PENDENTE', // Simular que mudou para PENDENTE para finalizar
          autoAvaliacao: {},
        });
        mockPrismaService.cardAutoAvaliacao.findFirst
          .mockResolvedValue({ idCardAvaliacao: 'card1', nomeCriterio: 'Execução' });
        mockPrismaService.cardAutoAvaliacao.count.mockResolvedValue(1);
        mockPrismaService.criterioAvaliativo.findFirst
          .mockResolvedValue({ peso: { toNumber: () => 1 } });

        // Act 2 - Finalizar avaliação
        await service.preencherAutoAvaliacao(mockIdAvaliacao, [mockAutoAvaliacaoDto.criterios[0]]);

        // Assert 2
        expect(mockPrismaService.avaliacao.update).toHaveBeenCalledWith({
          where: { idAvaliacao: mockIdAvaliacao },
          data: { status: 'CONCLUIDA' },
        });
      });
    });

    describe('Tratamento de erros em rascunhos', () => {
      it('deve tratar erro de transação no banco para rascunho', async () => {
        // Arrange
        mockPrismaService.avaliacao.findUnique.mockResolvedValue({
          ...mockAvaliacao,
          tipoAvaliacao: 'AUTOAVALIACAO',
          status: 'PENDENTE',
          autoAvaliacao: {},
        });
        mockPrismaService.cardAutoAvaliacao.findFirst
          .mockResolvedValue({ idCardAvaliacao: 'card1', nomeCriterio: 'Execução' });
        
        // Reset e configurar o mock para rejeitar
        mockPrismaService.cardAutoAvaliacao.update.mockReset();
        mockPrismaService.cardAutoAvaliacao.update.mockRejectedValue(new Error('Erro de banco'));

        // Act & Assert
        await expect(
          service.preencherRascunhoAutoAvaliacao(mockIdAvaliacao, [mockAutoAvaliacaoDto.criterios[0]])
        ).rejects.toThrow('Erro de banco');
      });

      it('deve validar se HashService está funcionando para rascunhos', async () => {
        // Arrange
        mockPrismaService.avaliacao.findUnique.mockResolvedValue({
          ...mockAvaliacao,
          tipoAvaliacao: 'AUTOAVALIACAO',
          status: 'PENDENTE',
          autoAvaliacao: {},
        });
        mockPrismaService.cardAutoAvaliacao.findFirst
          .mockResolvedValue({ idCardAvaliacao: 'card1', nomeCriterio: 'Execução' });
        mockPrismaService.cardAutoAvaliacao.update.mockResolvedValue({});
        mockPrismaService.avaliacao.update.mockResolvedValue({});
        mockHashService.hash.mockReturnValue('hash_criptografado');

        // Act
        await service.preencherRascunhoAutoAvaliacao(mockIdAvaliacao, [mockAutoAvaliacaoDto.criterios[0]]);

        // Assert
        expect(mockHashService.hash).toHaveBeenCalledWith('Bom desempenho em execução');
        expect(mockPrismaService.cardAutoAvaliacao.update).toHaveBeenCalledWith({
          where: { idCardAvaliacao: 'card1' },
          data: {
            nota: 4.5,
            justificativa: 'hash_criptografado'
          }
        });
      });
    });
  });
});
