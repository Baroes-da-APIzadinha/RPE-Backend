import { Test, TestingModule } from '@nestjs/testing';
import { AvaliacoesService } from './avaliacoes.service';
import { PrismaService } from '../database/prismaService';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { avaliacaoTipo, preenchimentoStatus } from '@prisma/client';
import { Motivacao } from './avaliacoes.contants';
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
    nota: 4.5,
    motivacao: Motivacao.Concordo_Totalmente,
    pontosFortes: 'Excelente comunicação e proatividade',
    pontosFracos: 'Pode melhorar na gestão de tempo',
  };

  const mockAvaliacaoMentorDto: AvaliacaoColaboradorMentorDto = {
    idAvaliacao: mockIdAvaliacao,
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
      ],
    }).compile();

    service = module.get<AvaliacoesService>(AvaliacoesService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Mock do Logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
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
      const spyAvaliacaoPares = jest.spyOn(service, 'lancarAvaliaçãoPares').mockResolvedValue({ lancadas: 2, existentes: 0, erros: 0 });
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

  describe('lancarAvaliaçãoPares', () => {
    beforeEach(() => {
      mockPrismaService.pares.findMany.mockResolvedValue(mockPares);
      mockPrismaService.avaliacao.findMany.mockResolvedValue([]);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          avaliacao: { create: jest.fn().mockResolvedValue({ idAvaliacao: mockIdAvaliacao }) },
          avaliacaoPares: { create: jest.fn().mockResolvedValue({}) },
        });
      });
    });

    it('deve lançar avaliações de pares com sucesso', async () => {
      // Act
      const resultado = await service.lancarAvaliaçãoPares(mockIdCiclo);

      // Assert
      expect(resultado.lancadas).toBe(2); // A avalia B e B avalia A
      expect(resultado.existentes).toBe(0);
      expect(resultado.erros).toBe(0);
    });

    it('deve retornar zero quando não há pares no ciclo', async () => {
      // Arrange
      mockPrismaService.pares.findMany.mockResolvedValue([]);

      // Act
      const resultado = await service.lancarAvaliaçãoPares(mockIdCiclo);

      // Assert
      expect(resultado).toEqual({ lancadas: 0, existentes: 0, erros: 0 });
    });

    it('deve contar existentes quando avaliações já existem', async () => {
      // Arrange
      mockPrismaService.avaliacao.findMany.mockResolvedValue([
        { idAvaliador: mockIdColaborador1, idAvaliado: mockIdColaborador2 },
      ]);

      // Act
      const resultado = await service.lancarAvaliaçãoPares(mockIdCiclo);

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

      // Act
      const resultado = await service.lancarAvaliaçãoPares(mockIdCiclo);

      // Assert
      expect(resultado.lancadas).toBe(2); // Apenas o par válido
    });
  });

  describe('lancarAvaliacaoLiderColaborador', () => {
    beforeEach(() => {
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
          pontosFortes: mockAvaliacaoParesDto.pontosFortes,
          pontosFracos: mockAvaliacaoParesDto.pontosFracos,
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
          6.0, // Nota inválida > 5
          Motivacao.Concordo_Totalmente,
          'Pontos fortes',
          'Pontos fracos'
        )
      ).rejects.toThrow(HttpException);

      await expect(
        service.preencherAvaliacaoPares(
          mockIdAvaliacao,
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
        mockAvaliacaoMentorDto.nota,
        mockAvaliacaoMentorDto.justificativa
      );

      // Assert
      expect(mockPrismaService.avaliacaoColaboradorMentor.update).toHaveBeenCalledWith({
        where: { idAvaliacao: mockIdAvaliacao },
        data: {
          nota: mockAvaliacaoMentorDto.nota,
          justificativa: mockAvaliacaoMentorDto.justificativa,
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
        service.preencherAvaliacaoColaboradorMentor(mockIdAvaliacao, 4.5, 'Justificativa')
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
      expect(mockPrismaService.avaliacaoLiderColaborador.update).toHaveBeenCalledWith({
        where: { idAvaliacao: mockIdAvaliacao },
        data: { notaFinal: 4.25 },
      });
    });
  });

  describe('getAvaliacoesPorUsuarioTipo', () => {
    it('deve buscar avaliações por usuário e tipo', async () => {
      // Arrange
      const mockAvaliacoes = [
        {
          ...mockAvaliacao,
          autoAvaliacao: { cardAutoAvaliacoes: [] },
          avaliador: { nomeCompleto: 'João Silva' },
          avaliado: { nomeCompleto: 'João Silva' },
          ciclo: mockCicloAtivo,
        },
      ];
      mockPrismaService.avaliacao.findMany.mockResolvedValue(mockAvaliacoes);

      // Act
      const resultado = await service.getAvaliacoesPorUsuarioTipo(
        mockIdColaborador1,
        mockIdCiclo,
        avaliacaoTipo.AUTOAVALIACAO
      );

      // Assert
      expect(resultado).toEqual(mockAvaliacoes);
      expect(mockPrismaService.avaliacao.findMany).toHaveBeenCalledWith({
        where: {
          idCiclo: mockIdCiclo,
          idAvaliador: mockIdColaborador1,
          tipoAvaliacao: avaliacaoTipo.AUTOAVALIACAO,
        },
        include: expect.any(Object),
        orderBy: { tipoAvaliacao: 'asc' },
      });
    });

    it('deve buscar todas as avaliações quando tipo não é fornecido', async () => {
      // Arrange
      mockPrismaService.avaliacao.findMany.mockResolvedValue([]);

      // Act
      await service.getAvaliacoesPorUsuarioTipo(mockIdColaborador1, mockIdCiclo);

      // Assert
      expect(mockPrismaService.avaliacao.findMany).toHaveBeenCalledWith({
        where: {
          idCiclo: mockIdCiclo,
          idAvaliador: mockIdColaborador1,
        },
        include: expect.any(Object),
        orderBy: { tipoAvaliacao: 'asc' },
      });
    });
  });

  describe('getAvaliacoesPorCicloStatus', () => {
    it('deve buscar avaliações por ciclo e status', async () => {
      // Arrange
      mockPrismaService.avaliacao.findMany.mockResolvedValue([]);

      // Act
      await service.getAvaliacoesPorCicloStatus(mockIdCiclo, preenchimentoStatus.PENDENTE);

      // Assert
      expect(mockPrismaService.avaliacao.findMany).toHaveBeenCalledWith({
        where: {
          idCiclo: mockIdCiclo,
          status: preenchimentoStatus.PENDENTE,
        },
        include: expect.any(Object),
        orderBy: [{ status: 'asc' }, { tipoAvaliacao: 'asc' }],
      });
    });
  });

  describe('discrepanciaColaborador', () => {
    beforeEach(() => {
      mockPrismaService.avaliacao.findMany
        .mockResolvedValueOnce([
          { autoAvaliacao: { notaFinal: { toString: () => '4.5' } } },
        ]) // autoAvaliacoes
        .mockResolvedValueOnce([
          { avaliacaoPares: { nota: { toString: () => '4.0' } } },
        ]) // avaliacoesPares
        .mockResolvedValueOnce([
          { avaliacaoLiderColaborador: { notaFinal: { toString: () => '4.0' } } },
        ]); // avaliacoesLider
    });

    it('deve calcular discrepância com sucesso', async () => {
      // Act
      const resultado = await service.discrepanciaColaborador(mockIdColaborador1, mockIdCiclo);

      // Assert
      expect(resultado.discrepancia).toBeDefined();
      expect(resultado.discrepancia?.calculada).toBe(true);
      expect(resultado.discrepancia?.nivel).toBe('BAIXA');
      expect(resultado.avaliacoes).toBeDefined();
      if (resultado.avaliacoes) {
        expect(resultado.avaliacoes.autoAvaliacao.media).toBe(4.5);
        expect(resultado.avaliacoes.avaliacaoPares.media).toBe(4.0);
        expect(resultado.avaliacoes.avaliacaoLider.media).toBe(4.0);
      }
    });

    it('deve retornar erro para UUID inválido', async () => {
      // Act
      const resultado = await service.discrepanciaColaborador('uuid-invalido');

      // Assert
      expect(resultado.status).toBe(400);
      expect(resultado.message).toBe('ID do colaborador inválido');
    });

    it('deve indicar dados insuficientes quando há menos de 2 tipos de avaliação', async () => {
      // Arrange
      mockPrismaService.avaliacao.findMany.mockReset();

      mockPrismaService.avaliacao.findMany
        .mockResolvedValueOnce([
          { autoAvaliacao: { notaFinal: { toString: () => '4.5' } } },
        ])
        .mockResolvedValueOnce([]) // Sem avaliações de pares
        .mockResolvedValueOnce([]); // Sem avaliações de líder

      // Act
      const resultado = await service.discrepanciaColaborador(mockIdColaborador1, mockIdCiclo);

      // Assert
      expect(resultado.discrepancia?.calculada).toBe(false);
      expect(resultado.discrepancia?.motivo).toContain('Dados insuficientes');

       expect(resultado).toMatchObject({
        colaborador: mockIdColaborador1,
        ciclo: mockIdCiclo,
        avaliacoes: {
          autoAvaliacao: {
            quantidade: 1,
            media: 4.5
          },
          avaliacaoPares: {
            quantidade: 0,
            media: null
          },
          avaliacaoLider: {
            quantidade: 0,
            media: null
          }
        },
        discrepancia: {
          calculada: false,
          motivo: expect.stringContaining('Dados insuficientes')
        }
      });
    });
  });

  describe('discrepanciaAllcolaboradores', () => {
    it('deve gerar relatório de discrepância para todos os colaboradores', async () => {
      // Arrange
      mockPrismaService.colaboradorCiclo.findMany.mockResolvedValue([
        {
          idColaborador: mockIdColaborador1,
          colaborador: {
            idColaborador: mockIdColaborador1,
            nomeCompleto: 'João Silva',
            cargo: 'Desenvolvedor',
            trilhaCarreira: 'Backend',
            unidade: 'TI',
          },
        },
      ]);

      const spyDiscrepanciaColaborador = jest.spyOn(service, 'discrepanciaColaborador')
        .mockResolvedValue({
          colaborador: mockIdColaborador1,
          ciclo: mockIdCiclo,
          avaliacoes: createMockAvaliacoesCompletas(),
          discrepancia: createMockDiscrepanciaCalculada(0.2),
        });

      // Act
      const resultado = await service.discrepanciaAllcolaboradores(mockIdCiclo);

      // Assert
      expect(resultado).toHaveLength(1);
      expect(resultado[0]).toMatchObject({
        idColaborador: mockIdColaborador1,
        nomeColaborador: 'João Silva',
        cargoColaborador: 'Desenvolvedor',
        notas: {
          notaAuto: 4.5,
          nota360media: 4.0,
          notaGestor: 4.0,
          discrepancia: 0.2,
        },
      });

      expect(spyDiscrepanciaColaborador).toHaveBeenCalledWith(mockIdColaborador1, mockIdCiclo);
    });
  });

  describe('listarAvaliacoesComite', () => {
    it('deve listar avaliações do comitê agrupadas por colaborador', async () => {
      // Arrange
      const mockEqualizacoes = [
        {
          idEqualizacao: 'eq1',
          idAvaliado: mockIdColaborador1,
          notaAjustada: 4.5,
          justificativa: 'Ajuste necessário',
          status: 'APROVADA',
          dataEqualizacao: new Date(),
          alvo: { idColaborador: mockIdColaborador1, nomeCompleto: 'João Silva' },
          membroComite: { idColaborador: 'comite1', nomeCompleto: 'Membro Comitê' },
        },
      ];
      mockPrismaService.equalizacao.findMany.mockResolvedValue(mockEqualizacoes);

      // Act
      const resultado = await service.listarAvaliacoesComite();

      // Assert
      expect(resultado).toHaveLength(1);
      expect(resultado[0]).toMatchObject({
        colaborador: { idColaborador: mockIdColaborador1, nomeCompleto: 'João Silva' },
        equalizacoes: expect.arrayContaining([
          expect.objectContaining({
            idEqualizacao: 'eq1',
            notaAjustada: 4.5,
          }),
        ]),
      });
    });
  });

  describe('historicoComoLider', () => {
    it('deve buscar histórico de avaliações como líder', async () => {
      // Arrange
      mockPrismaService.liderColaborador.findMany.mockResolvedValue([
        { idColaborador: mockIdColaborador1, idCiclo: mockIdCiclo },
      ]);

      const mockAvaliacoes = [
        {
          ...mockAvaliacao,
          tipoAvaliacao: 'LIDER_COLABORADOR',
          avaliado: { idColaborador: mockIdColaborador1, nomeCompleto: 'João Silva' },
          ciclo: { idCiclo: mockIdCiclo, nomeCiclo: 'Ciclo 2024' },
          avaliacaoLiderColaborador: {},
        },
      ];
      mockPrismaService.avaliacao.findMany.mockResolvedValue(mockAvaliacoes);

      // Act
      const resultado = await service.historicoComoLider(mockIdLider);

      // Assert
      expect(resultado).toEqual(mockAvaliacoes);
      expect(mockPrismaService.avaliacao.findMany).toHaveBeenCalledWith({
        where: {
          tipoAvaliacao: avaliacaoTipo.LIDER_COLABORADOR,
          OR: [{ idAvaliado: mockIdColaborador1, idCiclo: mockIdCiclo }],
        },
        include: expect.any(Object),
        orderBy: { idCiclo: 'desc' },
      });
    });

    it('deve retornar array vazio quando usuário não é líder', async () => {
      // Arrange
      mockPrismaService.liderColaborador.findMany.mockResolvedValue([]);

      // Act
      const resultado = await service.historicoComoLider(mockIdColaborador1);

      // Assert
      expect(resultado).toEqual([]);
    });
  });

  describe('getFormsAvaliacao', () => {
    it('deve buscar formulários de autoavaliação agrupados por pilar', async () => {
      // Arrange
      const mockCards = [
        { nomeCriterio: 'Execução' },
        { nomeCriterio: 'Comunicação' },
      ];
      mockPrismaService.cardAutoAvaliacao.findMany.mockResolvedValue(mockCards);
      mockPrismaService.criterioAvaliativo.findMany.mockResolvedValue([
        { nomeCriterio: 'Execução', pilar: 'Técnico', descricao: 'Capacidade de execução' },
        { nomeCriterio: 'Comunicação', pilar: 'Comportamental', descricao: 'Habilidades de comunicação' },
      ]);

      // Act
      const resultado = await service.getFormsAvaliacao(mockIdAvaliacao);

      // Assert
      expect(resultado).toEqual({
        Técnico: [{ nomeCriterio: 'Execução', descricao: 'Capacidade de execução' }],
        Comportamental: [{ nomeCriterio: 'Comunicação', descricao: 'Habilidades de comunicação' }],
      });
    });
  });

  describe('getFormsLiderColaborador', () => {
    it('deve buscar formulários de avaliação líder-colaborador agrupados por pilar', async () => {
      // Arrange
      const mockCards = [
        { nomeCriterio: 'Liderança' },
      ];
      mockPrismaService.cardAvaliacaoLiderColaborador.findMany.mockResolvedValue(mockCards);
      mockPrismaService.criterioAvaliativo.findMany.mockResolvedValue([
        { nomeCriterio: 'Liderança', pilar: 'Gestão', descricao: 'Habilidades de liderança' },
      ]);

      // Act
      const resultado = await service.getFormsLiderColaborador(mockIdAvaliacao);

      // Assert
      expect(resultado).toEqual({
        Gestão: [{ nomeCriterio: 'Liderança', descricao: 'Habilidades de liderança' }],
      });
    });
  });

  describe('Métodos privados - verificações', () => {
    describe('verificarAvaliacaoExiste', () => {
      it('deve retornar avaliação quando existe', async () => {
        // Arrange
        mockPrismaService.avaliacao.findUnique.mockResolvedValue(mockAvaliacao);

        // Act
        const resultado = await (service as any).verificarAvaliacaoExiste(mockIdAvaliacao);

        // Assert
        expect(resultado).toEqual(mockAvaliacao);
      });

      it('deve lançar exceção quando avaliação não existe', async () => {
        // Arrange
        mockPrismaService.avaliacao.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect((service as any).verificarAvaliacaoExiste(mockIdAvaliacao))
          .rejects.toThrow(HttpException);
        await expect((service as any).verificarAvaliacaoExiste(mockIdAvaliacao))
          .rejects.toThrow('Avaliação não encontrada.');
      });
    });

    describe('verificarAvaliacaoStatus', () => {
      it('deve passar quando avaliação está pendente', async () => {
        // Arrange
        const avaliacaoPendente = { status: 'PENDENTE' };

        // Act & Assert
        expect(() => (service as any).verificarAvaliacaoStatus(avaliacaoPendente))
          .not.toThrow();
      });

      it('deve falhar quando avaliação está concluída', async () => {
        // Arrange
        const avaliacaoConcluida = { status: 'CONCLUIDA' };

        // Act & Assert
        expect(() => (service as any).verificarAvaliacaoStatus(avaliacaoConcluida))
          .toThrow(HttpException);
        expect(() => (service as any).verificarAvaliacaoStatus(avaliacaoConcluida))
          .toThrow('Avaliação já foi concluída.');
      });
    });

    describe('verificarAvaliacaoTipo', () => {
      it('deve passar quando tipo está correto', async () => {
        // Arrange
        const avaliacao = { tipoAvaliacao: 'AUTOAVALIACAO' };

        // Act & Assert
        expect(() => (service as any).verificarAvaliacaoTipo(avaliacao, 'AUTOAVALIACAO'))
          .not.toThrow();
      });

      it('deve falhar quando tipo está incorreto', async () => {
        // Arrange
        const avaliacao = { tipoAvaliacao: 'AVALIACAO_PARES' };

        // Act & Assert
        expect(() => (service as any).verificarAvaliacaoTipo(avaliacao, 'AUTOAVALIACAO'))
          .toThrow(HttpException);
        expect(() => (service as any).verificarAvaliacaoTipo(avaliacao, 'AUTOAVALIACAO'))
          .toThrow('Avaliação não é do tipo AUTOAVALIACAO.');
      });
    });

    describe('verificarNota', () => {
      it('deve aceitar notas válidas', async () => {
        const notasValidas = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];

        for (const nota of notasValidas) {
          expect(() => (service as any).verificarNota(nota)).not.toThrow();
        }
      });

      it('deve rejeitar notas fora do intervalo 0-5', async () => {
        const notasInvalidas = [-0.5, 5.5, 6.0, -1];

        for (const nota of notasInvalidas) {
          expect(() => (service as any).verificarNota(nota)).toThrow(HttpException);
          expect(() => (service as any).verificarNota(nota)).toThrow('Nota inválida. Deve estar entre 0 e 5.');
        }
      });

      it('deve rejeitar notas que não são múltiplos de 0.5', async () => {
        const notasInvalidas = [0.1, 0.3, 1.7, 2.9, 4.3];

        for (const nota of notasInvalidas) {
          expect(() => (service as any).verificarNota(nota)).toThrow(HttpException);
          expect(() => (service as any).verificarNota(nota)).toThrow('Nota inválida. Só são permitidos valores como 0.0, 0.5, 1.0, ..., 5.0');
        }
      });
    });

    describe('isValidUUID', () => {
      it('deve validar UUIDs corretos', async () => {
        const uuidsValidos = [
          '123e4567-e89b-12d3-a456-426614174000',
          'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        ];

        for (const uuid of uuidsValidos) {
          expect((service as any).isValidUUID(uuid)).toBe(true);
        }
      });

      it('deve rejeitar UUIDs inválidos', async () => {
        const uuidsInvalidos = [
          'uuid-invalido',
          '123',
          '',
          'g47ac10b-58cc-4372-a567-0e02b2c3d479', // 'g' não é hexadecimal
          '123e4567-e89b-12d3-a456-426614174000-extra', // muito longo
        ];

        for (const uuid of uuidsInvalidos) {
          expect((service as any).isValidUUID(uuid)).toBe(false);
        }
      });
    });
  });

  describe('Cálculos de média e discrepância', () => {
    describe('calcularMediaAutoAvaliacao', () => {
      it('deve calcular média corretamente', async () => {
        // Arrange
        const avaliacoes = [
          { autoAvaliacao: { notaFinal: { toString: () => '4.5' } } },
          { autoAvaliacao: { notaFinal: { toString: () => '3.5' } } },
        ];

        // Act
        const resultado = (service as any).calcularMediaAutoAvaliacao(avaliacoes);

        // Assert
        expect(resultado).toBe(4.0);
      });

      it('deve retornar null para array vazio', async () => {
        // Act
        const resultado = (service as any).calcularMediaAutoAvaliacao([]);

        // Assert
        expect(resultado).toBeNull();
      });

      it('deve filtrar notas nulas', async () => {
        // Arrange
        const avaliacoes = [
          { autoAvaliacao: { notaFinal: { toString: () => '4.5' } } },
          { autoAvaliacao: { notaFinal: null } },
          { autoAvaliacao: { notaFinal: { toString: () => '3.5' } } },
        ];

        // Act
        const resultado = (service as any).calcularMediaAutoAvaliacao(avaliacoes);

        // Assert
        expect(resultado).toBe(4.0); // (4.5 + 3.5) / 2
      });
    });

    describe('desvioPadrao', () => {
      it('deve calcular desvio padrão corretamente', async () => {
        // Act
        const resultado = (service as any).desvioPadrao(4.0, 4.0, 4.0);

        // Assert
        expect(resultado).toBe(0); // Sem variação
      });

      it('deve calcular desvio padrão com variação', async () => {
        // Act
        const resultado = (service as any).desvioPadrao(3.0, 4.0, 5.0);

        // Assert
        expect(resultado).toBeCloseTo(0.816, 2); // Aproximadamente
      });
    });
  });

  describe('Integração e casos extremos', () => {
    it('deve lidar com transações falhando', async () => {
      // Arrange
      const error = new Error('Falha na transação');
      mockPrismaService.$transaction.mockRejectedValue(error);

      // Act & Assert
      await expect(service.lancarAvaliaçãoPares(mockIdCiclo))
        .rejects.toThrow('Falha na transação');
    });

    it('deve processar grande quantidade de pares', async () => {
      // Arrange
      const muitosPares = Array.from({ length: 100 }, (_, i) => ({
        idColaborador1: `colaborador-${i}`,
        idColaborador2: `colaborador-${i + 100}`,
        idCiclo: mockIdCiclo,
      }));

      mockPrismaService.pares.findMany.mockResolvedValue(muitosPares);
      mockPrismaService.avaliacao.findMany.mockResolvedValue([]);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          avaliacao: { create: jest.fn().mockResolvedValue({ idAvaliacao: mockIdAvaliacao }) },
          avaliacaoPares: { create: jest.fn().mockResolvedValue({}) },
        });
      });

      const inicio = Date.now();

      // Act
      const resultado = await service.lancarAvaliaçãoPares(mockIdCiclo);

      const fim = Date.now();
      const tempoExecucao = fim - inicio;

      // Assert
      expect(resultado.lancadas).toBe(200); // 100 pares * 2 direções
      expect(tempoExecucao).toBeLessThan(5000); // Deve ser razoavelmente rápido
    });

    it('deve manter logs informativos durante operações', async () => {
      // Arrange
      const spyLogger = jest.spyOn(Logger.prototype, 'log');
      mockPrismaService.pares.findMany.mockResolvedValue(mockPares);
      mockPrismaService.avaliacao.findMany.mockResolvedValue([]);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          avaliacao: { create: jest.fn().mockResolvedValue({ idAvaliacao: mockIdAvaliacao }) },
          avaliacaoPares: { create: jest.fn().mockResolvedValue({}) },
        });
      });

      // Act
      await service.lancarAvaliaçãoPares(mockIdCiclo);

      // Assert
      expect(spyLogger).toHaveBeenCalledWith(`Iniciando lançamento de avaliações de pares para ciclo ${mockIdCiclo}`);
      expect(spyLogger).toHaveBeenCalledWith(`Total de pares encontrados para o ciclo ${mockIdCiclo}: 1`);
      expect(spyLogger).toHaveBeenCalledWith(expect.stringContaining('Resumo do lançamento'));
    });
  });
});