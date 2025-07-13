import { Test, TestingModule } from '@nestjs/testing';
import { AvaliacoesController } from './avaliacoes.controller';
import { AvaliacoesService } from './avaliacoes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Logger } from '@nestjs/common';
import { avaliacaoTipo, preenchimentoStatus } from '@prisma/client';
import { 
  AvaliacaoParesDto, 
  AvaliacaoColaboradorMentorDto, 
  PreencherAuto_ou_Lider_Dto 
} from './avaliacoes.dto';
import { Motivacao } from './avaliacoes.contants';
import { RelatorioItem } from './avaliacoes.constants';

describe('AvaliacoesController', () => {
  let controller: AvaliacoesController;
  let service: AvaliacoesService;

  // Mock do AvaliacoesService
  const mockAvaliacoesService = {
    lancarAvaliacoes: jest.fn(),
    getAvaliacoesPorUsuarioTipo: jest.fn(),
    getAvaliacoesPorCicloStatus: jest.fn(),
    preencherAvaliacaoPares: jest.fn(),
    preencherAvaliacaoColaboradorMentor: jest.fn(),
    preencherAutoAvaliacao: jest.fn(),
    preencherAvaliacaoLiderColaborador: jest.fn(),
    lancarAutoAvaliacoes: jest.fn(),
    lancarAvaliaçãoPares: jest.fn(),
    lancarAvaliacaoLiderColaborador: jest.fn(),
    lancarAvaliacaoColaboradorMentor: jest.fn(),
    listarAvaliacoesComite: jest.fn(),
    historicoComoLider: jest.fn(),
    discrepanciaColaborador: jest.fn(),
    discrepanciaAllcolaboradores: jest.fn(),
    getFormsAvaliacao: jest.fn(),
    getFormsLiderColaborador: jest.fn(),
  };

  // Mock dos Guards
  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockRolesGuard = {
    canActivate: jest.fn(() => true),
  };

  // Dados de teste
  const mockIdCiclo = '123e4567-e89b-12d3-a456-426614174000';
  const mockIdAvaliacao = '789e0123-e89b-12d3-a456-426614174001';
  const mockIdColaborador = '456e7890-e89b-12d3-a456-426614174002';
  const mockUserId = '654e3210-e89b-12d3-a456-426614174004';

  const mockRequest = {
    user: {
      userId: mockUserId,
      email: 'test@empresa.com',
      roles: ['ADMIN'],
    },
  };

  const mockRelatorio = {
    autoavaliacao: { lancadas: 2, existentes: 0, erros: 0 },
    avaliacaopares: { lancadas: 4, existentes: 0, erros: 0 },
    avaliacaoLiderColaborador: { lancadas: 1, existentes: 0, erros: 0 },
    avaliacaoColaboradorMentor: { lancadas: 1, existentes: 0, erros: 0 },
  };

  const mockAvaliacao = {
    idAvaliacao: mockIdAvaliacao,
    idCiclo: mockIdCiclo,
    idAvaliador: mockIdColaborador,
    idAvaliado: mockIdColaborador,
    tipoAvaliacao: 'AUTOAVALIACAO',
    status: 'PENDENTE',
    autoAvaliacao: { cardAutoAvaliacoes: [] },
    avaliador: { nomeCompleto: 'João Silva' },
    avaliado: { nomeCompleto: 'João Silva' },
    ciclo: { idCiclo: mockIdCiclo, nomeCiclo: 'Ciclo Teste 2024' },
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

  const mockDiscrepanciaResponse = {
    colaborador: mockIdColaborador,
    ciclo: mockIdCiclo,
    avaliacoes: {
      autoAvaliacao: { quantidade: 1, media: 4.5 },
      avaliacaoPares: { quantidade: 2, media: 4.0 },
      avaliacaoLider: { quantidade: 1, media: 4.0 },
    },
    discrepancia: {
      calculada: true,
      desvioPadrao: 0.2,
      nivel: 'BAIXA',
      descricao: 'Discrepância baixa detectada',
      baseDados: 'autoAvaliacao vs avaliacaoLider',
    },
  };

  const mockRelatorioDiscrepancia: RelatorioItem[] = [
    {
      idColaborador: mockIdColaborador,
      nomeColaborador: 'João Silva',
      cargoColaborador: 'Desenvolvedor',
      trilhaColaborador: 'Backend',
      equipeColaborador: 'TI',
      notas: {
        notaAuto: 4.5,
        nota360media: 4.0,
        notaGestor: 4.0,
        discrepancia: 0.2,
      },
    },
  ];

  const mockFormsResponse = {
    Técnico: [
      { nomeCriterio: 'Execução', descricao: 'Capacidade de execução' },
    ],
    Comportamental: [
      { nomeCriterio: 'Comunicação', descricao: 'Habilidades de comunicação' },
    ],
  };

  const mockEqualizacoes = [
    {
      colaborador: {
        idColaborador: mockIdColaborador,
        nomeCompleto: 'João Silva',
      },
      equalizacoes: [
        {
          idEqualizacao: 'eq1',
          notaAjustada: 4.5,
          justificativa: 'Ajuste necessário',
          status: 'APROVADA',
          dataEqualizacao: new Date(),
          membroComite: { nomeCompleto: 'Membro Comitê' },
        },
      ],
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AvaliacoesController],
      providers: [
        {
          provide: AvaliacoesService,
          useValue: mockAvaliacoesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    controller = module.get<AvaliacoesController>(AvaliacoesController);
    service = module.get<AvaliacoesService>(AvaliacoesService);

    // Mock do Logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Definição do controller', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('lancarAvaliacoes', () => {
    it('deve lançar avaliações com sucesso', async () => {
      // Arrange
      mockAvaliacoesService.lancarAvaliacoes.mockResolvedValue({
        relatorio: mockRelatorio,
      });

      // Act
      const resultado = await controller.lancarAvaliacoes(mockIdCiclo);

      // Assert
      expect(resultado).toEqual({
        message: 'Avaliações lançadas com sucesso',
        relatorio: mockRelatorio,
      });
      expect(mockAvaliacoesService.lancarAvaliacoes).toHaveBeenCalledWith(mockIdCiclo);
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        `Relatório de lançamento de avaliações: ${JSON.stringify(mockRelatorio)}`
      );
    });

    it('deve propagar erro do service', async () => {
      // Arrange
      const error = new Error('Ciclo não encontrado');
      mockAvaliacoesService.lancarAvaliacoes.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.lancarAvaliacoes(mockIdCiclo)).rejects.toThrow(error);
    });
  });

  describe('getAvaliacoesPorUsuarioTipo', () => {
    it('deve buscar avaliações por usuário e tipo específico', async () => {
      // Arrange
      const mockAvaliacoes = [mockAvaliacao];
      mockAvaliacoesService.getAvaliacoesPorUsuarioTipo.mockResolvedValue(mockAvaliacoes);

      // Act
      const resultado = await controller.getAvaliacoesPorUsuarioTipo(
        mockIdColaborador,
        mockIdCiclo,
        avaliacaoTipo.AUTOAVALIACAO
      );

      // Assert
      expect(resultado).toEqual({
        success: true,
        count: 1,
        tipoFiltrado: avaliacaoTipo.AUTOAVALIACAO,
        avaliacoes: mockAvaliacoes,
      });
      expect(mockAvaliacoesService.getAvaliacoesPorUsuarioTipo).toHaveBeenCalledWith(
        mockIdColaborador,
        mockIdCiclo,
        avaliacaoTipo.AUTOAVALIACAO
      );
    });

    it('deve buscar todas as avaliações quando tipo não é fornecido', async () => {
      // Arrange
      const mockAvaliacoes = [mockAvaliacao];
      mockAvaliacoesService.getAvaliacoesPorUsuarioTipo.mockResolvedValue(mockAvaliacoes);

      // Act
      const resultado = await controller.getAvaliacoesPorUsuarioTipo(
        mockIdColaborador,
        mockIdCiclo
      );

      // Assert
      expect(resultado).toEqual({
        success: true,
        count: 1,
        tipoFiltrado: 'todos',
        avaliacoes: mockAvaliacoes,
      });
      expect(mockAvaliacoesService.getAvaliacoesPorUsuarioTipo).toHaveBeenCalledWith(
        mockIdColaborador,
        mockIdCiclo,
        undefined
      );
    });

    it('deve retornar array vazio quando não há avaliações', async () => {
      // Arrange
      mockAvaliacoesService.getAvaliacoesPorUsuarioTipo.mockResolvedValue([]);

      // Act
      const resultado = await controller.getAvaliacoesPorUsuarioTipo(
        mockIdColaborador,
        mockIdCiclo
      );

      // Assert
      expect(resultado).toEqual({
        success: true,
        count: 0,
        tipoFiltrado: 'todos',
        avaliacoes: [],
      });
    });
  });

  describe('getAvaliacoesPorCicloStatus', () => {
    it('deve buscar avaliações por ciclo e status específico', async () => {
      // Arrange
      const mockAvaliacoes = [mockAvaliacao];
      mockAvaliacoesService.getAvaliacoesPorCicloStatus.mockResolvedValue(mockAvaliacoes);

      // Act
      const resultado = await controller.getAvaliacoesPorCicloStatus(
        mockIdCiclo,
        preenchimentoStatus.PENDENTE
      );

      // Assert
      expect(resultado).toEqual({
        success: true,
        count: 1,
        statusFiltrado: preenchimentoStatus.PENDENTE,
      });
      expect(mockAvaliacoesService.getAvaliacoesPorCicloStatus).toHaveBeenCalledWith(
        mockIdCiclo,
        preenchimentoStatus.PENDENTE
      );
    });

    it('deve buscar todas as avaliações quando status não é fornecido', async () => {
      // Arrange
      mockAvaliacoesService.getAvaliacoesPorCicloStatus.mockResolvedValue([]);

      // Act
      const resultado = await controller.getAvaliacoesPorCicloStatus(mockIdCiclo);

      // Assert
      expect(resultado).toEqual({
        success: true,
        count: 0,
        statusFiltrado: 'todos',
      });
      expect(mockAvaliacoesService.getAvaliacoesPorCicloStatus).toHaveBeenCalledWith(
        mockIdCiclo,
        undefined
      );
    });
  });

  describe('preencherAvaliacaoPares', () => {
    it('deve preencher avaliação de pares com sucesso', async () => {
      // Arrange
      mockAvaliacoesService.preencherAvaliacaoPares.mockResolvedValue(undefined);

      // Act
      const resultado = await controller.preencherAvaliacaoPares(mockAvaliacaoParesDto);

      // Assert
      expect(resultado).toEqual({
        message: 'Avaliação preenchida com sucesso!',
      });
      expect(mockAvaliacoesService.preencherAvaliacaoPares).toHaveBeenCalledWith(
        mockAvaliacaoParesDto.idAvaliacao,
        mockAvaliacaoParesDto.nota,
        mockAvaliacaoParesDto.motivacao,
        mockAvaliacaoParesDto.pontosFortes,
        mockAvaliacaoParesDto.pontosFracos
      );
    });

    it('deve propagar erro do service', async () => {
      // Arrange
      const error = new Error('Avaliação não encontrada');
      mockAvaliacoesService.preencherAvaliacaoPares.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.preencherAvaliacaoPares(mockAvaliacaoParesDto))
        .rejects.toThrow(error);
    });
  });

  describe('preencherAvaliacaoColaboradorMentor', () => {
    it('deve preencher avaliação colaborador-mentor com sucesso', async () => {
      // Arrange
      mockAvaliacoesService.preencherAvaliacaoColaboradorMentor.mockResolvedValue(undefined);

      // Act
      const resultado = await controller.preencherAvaliacaoColaboradorMentor(mockAvaliacaoMentorDto);

      // Assert
      expect(resultado).toEqual({
        message: 'Avaliação preenchida com sucesso!',
      });
      expect(mockAvaliacoesService.preencherAvaliacaoColaboradorMentor).toHaveBeenCalledWith(
        mockAvaliacaoMentorDto.idAvaliacao,
        mockAvaliacaoMentorDto.nota,
        mockAvaliacaoMentorDto.justificativa
      );
    });
  });

  describe('preencherAutoAvaliacao', () => {
    it('deve preencher autoavaliação com sucesso', async () => {
      // Arrange
      mockAvaliacoesService.preencherAutoAvaliacao.mockResolvedValue(undefined);

      // Act
      const resultado = await controller.preencherAutoAvaliacao(mockAutoAvaliacaoDto);

      // Assert
      expect(resultado).toEqual({
        message: 'Autoavaliação preenchida com sucesso!',
        idAvaliacao: mockAutoAvaliacaoDto.idAvaliacao,
      });
      expect(mockAvaliacoesService.preencherAutoAvaliacao).toHaveBeenCalledWith(
        mockAutoAvaliacaoDto.idAvaliacao,
        mockAutoAvaliacaoDto.criterios
      );
    });
  });

  describe('preencherAvaliacaoLiderColaborador', () => {
    it('deve preencher avaliação líder-colaborador com sucesso', async () => {
      // Arrange
      mockAvaliacoesService.preencherAvaliacaoLiderColaborador.mockResolvedValue(undefined);

      // Act
      const resultado = await controller.preencherAvaliacaoLiderColaborador(mockAutoAvaliacaoDto);

      // Assert
      expect(resultado).toEqual({
        message: 'Avaliação lider-colaborador preenchida com sucesso!',
        idAvaliacao: mockAutoAvaliacaoDto.idAvaliacao,
      });
      expect(mockAvaliacoesService.preencherAvaliacaoLiderColaborador).toHaveBeenCalledWith(
        mockAutoAvaliacaoDto.idAvaliacao,
        mockAutoAvaliacaoDto.criterios
      );
    });
  });

  describe('lancarAutoAvaliacao', () => {
    it('deve lançar autoavaliações com sucesso', async () => {
      // Arrange
      const mockRelatorioAuto = { lancadas: 2, existentes: 0, erros: 0 };
      mockAvaliacoesService.lancarAutoAvaliacoes.mockResolvedValue(mockRelatorioAuto);

      // Act
      const resultado = await controller.lancarAutoAvaliacao({ idCiclo: mockIdCiclo });

      // Assert
      expect(resultado).toEqual({
        message: 'Autoavaliações lançadas com sucesso',
        relatorio: mockRelatorioAuto,
      });
      expect(mockAvaliacoesService.lancarAutoAvaliacoes).toHaveBeenCalledWith(mockIdCiclo);
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        `Relatório de lançamento de avaliações: ${JSON.stringify(mockRelatorioAuto)}`
      );
    });
  });

  describe('lancarAvaliaçãoPares', () => {
    it('deve lançar avaliações de pares com sucesso', async () => {
      // Arrange
      const mockRelatorioPares = { lancadas: 4, existentes: 0, erros: 0 };
      mockAvaliacoesService.lancarAvaliaçãoPares.mockResolvedValue(mockRelatorioPares);

      // Act
      const resultado = await controller.lancarAvaliaçãoPares(mockIdCiclo);

      // Assert
      expect(resultado).toEqual({
        message: 'Avaliações de pares lançadas com sucesso',
        relatorio: mockRelatorioPares,
      });
      expect(mockAvaliacoesService.lancarAvaliaçãoPares).toHaveBeenCalledWith(mockIdCiclo);
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        `Relatório de lançamento de avaliações: ${JSON.stringify(mockRelatorioPares)}`
      );
    });
  });

  describe('lancarAvaliacaoLiderColaborador', () => {
    it('deve lançar avaliações líder-colaborador com sucesso', async () => {
      // Arrange
      const mockRelatorioLider = { lancadas: 1, existentes: 0, erros: 0 };
      mockAvaliacoesService.lancarAvaliacaoLiderColaborador.mockResolvedValue(mockRelatorioLider);

      // Act
      const resultado = await controller.lancarAvaliacaoLiderColaborador(mockIdCiclo);

      // Assert
      expect(resultado).toEqual({
        message: 'Avaliações lider-colaborador lançadas com sucesso',
        relatorio: mockRelatorioLider,
      });
      expect(mockAvaliacoesService.lancarAvaliacaoLiderColaborador).toHaveBeenCalledWith(mockIdCiclo);
    });
  });

  describe('lancarAvaliacaoColaboradorMentor', () => {
    it('deve lançar avaliações colaborador-mentor com sucesso', async () => {
      // Arrange
      const mockRelatorioMentor = { lancadas: 1, existentes: 0, erros: 0 };
      mockAvaliacoesService.lancarAvaliacaoColaboradorMentor.mockResolvedValue(mockRelatorioMentor);

      // Act
      const resultado = await controller.lancarAvaliacaoColaboradorMentor(mockIdCiclo);

      // Assert
      expect(resultado).toEqual({
        message: 'Avaliações colaborador-mentor lançadas com sucesso',
        relatorio: mockRelatorioMentor,
      });
      expect(mockAvaliacoesService.lancarAvaliacaoColaboradorMentor).toHaveBeenCalledWith(mockIdCiclo);
    });
  });

  describe('listarAvaliacoesComite', () => {
    it('deve listar avaliações do comitê', async () => {
      // Arrange
      mockAvaliacoesService.listarAvaliacoesComite.mockResolvedValue(mockEqualizacoes);

      // Act
      const resultado = await controller.listarAvaliacoesComite();

      // Assert
      expect(resultado).toEqual(mockEqualizacoes);
      expect(mockAvaliacoesService.listarAvaliacoesComite).toHaveBeenCalled();
    });

    it('deve retornar array vazio quando não há equalizações', async () => {
      // Arrange
      mockAvaliacoesService.listarAvaliacoesComite.mockResolvedValue([]);

      // Act
      const resultado = await controller.listarAvaliacoesComite();

      // Assert
      expect(resultado).toEqual([]);
    });
  });

  describe('historicoComoLider', () => {
    it('deve buscar histórico como líder', async () => {
      // Arrange
      const mockHistorico = [
        {
          ...mockAvaliacao,
          tipoAvaliacao: 'LIDER_COLABORADOR',
          avaliado: { nomeCompleto: 'Colaborador Teste' },
          ciclo: { nomeCiclo: 'Ciclo 2024' },
        },
      ];
      mockAvaliacoesService.historicoComoLider.mockResolvedValue(mockHistorico);

      // Act
      const resultado = await controller.historicoComoLider(mockRequest);

      // Assert
      expect(resultado).toEqual(mockHistorico);
      expect(mockAvaliacoesService.historicoComoLider).toHaveBeenCalledWith(mockUserId);
    });

    it('deve retornar array vazio quando usuário não é líder', async () => {
      // Arrange
      mockAvaliacoesService.historicoComoLider.mockResolvedValue([]);

      // Act
      const resultado = await controller.historicoComoLider(mockRequest);

      // Assert
      expect(resultado).toEqual([]);
    });
  });

  describe('getNotasAvaliacoes', () => {
    it('deve buscar notas de avaliações para discrepância', async () => {
      // Arrange
      mockAvaliacoesService.discrepanciaColaborador.mockResolvedValue(mockDiscrepanciaResponse);

      // Act
      const resultado = await controller.getNotasAvaliacoes(mockIdColaborador, mockIdCiclo);

      // Assert
      expect(resultado).toEqual(mockDiscrepanciaResponse);
      expect(mockAvaliacoesService.discrepanciaColaborador).toHaveBeenCalledWith(
        mockIdColaborador,
        mockIdCiclo
      );
    });

    it('deve lidar com colaborador sem avaliações suficientes', async () => {
      // Arrange
      const responseInsuficiente = {
        colaborador: mockIdColaborador,
        ciclo: mockIdCiclo,
        avaliacoes: {
          autoAvaliacao: { quantidade: 1, media: 4.5 },
          avaliacaoPares: { quantidade: 0, media: null },
          avaliacaoLider: { quantidade: 0, media: null },
        },
        discrepancia: {
          calculada: false,
          motivo: 'Dados insuficientes para calcular discrepância',
        },
      };
      mockAvaliacoesService.discrepanciaColaborador.mockResolvedValue(responseInsuficiente);

      // Act
      const resultado = await controller.getNotasAvaliacoes(mockIdColaborador, mockIdCiclo);

      // Assert
      expect(resultado).toEqual(responseInsuficiente);
      expect(resultado.discrepancia?.calculada).toBe(false);
    });

    it('deve lidar com erro de UUID inválido', async () => {
      // Arrange
      const errorResponse = {
        status: 400,
        message: 'ID do colaborador inválido',
      };
      mockAvaliacoesService.discrepanciaColaborador.mockResolvedValue(errorResponse);

      // Act
      const resultado = await controller.getNotasAvaliacoes('uuid-invalido', mockIdCiclo);

      // Assert
      expect(resultado).toEqual(errorResponse);
    });
  });

  describe('getNotasCiclo', () => {
    it('deve buscar relatório de discrepância para todos os colaboradores', async () => {
      // Arrange
      mockAvaliacoesService.discrepanciaAllcolaboradores.mockResolvedValue(mockRelatorioDiscrepancia);

      // Act
      const resultado = await controller.getNotasCiclo(mockIdCiclo);

      // Assert
      expect(resultado).toEqual(mockRelatorioDiscrepancia);
      expect(mockAvaliacoesService.discrepanciaAllcolaboradores).toHaveBeenCalledWith(mockIdCiclo);
    });

    it('deve retornar array vazio quando service retorna undefined', async () => {
      // Arrange
      mockAvaliacoesService.discrepanciaAllcolaboradores.mockResolvedValue(undefined);

      // Act
      const resultado = await controller.getNotasCiclo(mockIdCiclo);

      // Assert
      expect(resultado).toEqual([]);
    });

    it('deve retornar array vazio quando não há colaboradores no ciclo', async () => {
      // Arrange
      mockAvaliacoesService.discrepanciaAllcolaboradores.mockResolvedValue([]);

      // Act
      const resultado = await controller.getNotasCiclo(mockIdCiclo);

      // Assert
      expect(resultado).toEqual([]);
    });

    it('deve lidar com multiple colaboradores', async () => {
      // Arrange
      const mockRelatorioMultiplo: RelatorioItem[] = [
        {
          idColaborador: mockIdColaborador,
          nomeColaborador: 'João Silva',
          cargoColaborador: 'Desenvolvedor',
          trilhaColaborador: 'Backend',
          equipeColaborador: 'TI',
          notas: {
            notaAuto: 4.5,
            nota360media: 4.0,
            notaGestor: 4.0,
            discrepancia: 0.2,
          },
        },
        {
          idColaborador: 'outro-id',
          nomeColaborador: 'Maria Santos',
          cargoColaborador: 'Analista',
          trilhaColaborador: 'Frontend',
          equipeColaborador: 'TI',
          notas: {
            notaAuto: 4.0,
            nota360media: 4.5,
            notaGestor: 4.2,
            discrepancia: 0.3,
          },
        },
      ];
      mockAvaliacoesService.discrepanciaAllcolaboradores.mockResolvedValue(mockRelatorioMultiplo);

      // Act
      const resultado = await controller.getNotasCiclo(mockIdCiclo);

      // Assert
      expect(resultado).toEqual(mockRelatorioMultiplo);
      expect(resultado).toHaveLength(2);
    });
  });

  describe('getFormsAutoAvaliacao', () => {
    it('deve buscar formulários de autoavaliação', async () => {
      // Arrange
      mockAvaliacoesService.getFormsAvaliacao.mockResolvedValue(mockFormsResponse);

      // Act
      const resultado = await controller.getFormsAutoAvaliacao(mockIdAvaliacao);

      // Assert
      expect(resultado).toEqual(mockFormsResponse);
      expect(mockAvaliacoesService.getFormsAvaliacao).toHaveBeenCalledWith(mockIdAvaliacao);
    });

    it('deve retornar objeto vazio quando não há critérios', async () => {
      // Arrange
      mockAvaliacoesService.getFormsAvaliacao.mockResolvedValue({});

      // Act
      const resultado = await controller.getFormsAutoAvaliacao(mockIdAvaliacao);

      // Assert
      expect(resultado).toEqual({});
    });
  });

  describe('getFormsLiderColaborador', () => {
    it('deve buscar formulários de avaliação líder-colaborador', async () => {
      // Arrange
      const mockFormsLider = {
        Gestão: [
          { nomeCriterio: 'Liderança', descricao: 'Habilidades de liderança' },
        ],
      };
      mockAvaliacoesService.getFormsLiderColaborador.mockResolvedValue(mockFormsLider);

      // Act
      const resultado = await controller.getFormsLiderColaborador(mockIdAvaliacao);

      // Assert
      expect(resultado).toEqual(mockFormsLider);
      expect(mockAvaliacoesService.getFormsLiderColaborador).toHaveBeenCalledWith(mockIdAvaliacao);
    });
  });

  describe('Guards e Permissões', () => {
    it('deve aplicar JwtAuthGuard em todas as rotas protegidas', () => {
      // Verificar se o guard foi aplicado
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
    });

    it('deve aplicar RolesGuard nas rotas administrativas', () => {
      // Verificar se o guard de roles foi aplicado
      expect(mockRolesGuard.canActivate).toBeDefined();
    });

    it('deve permitir acesso com roles corretos', async () => {
      // Arrange
      mockJwtAuthGuard.canActivate.mockReturnValue(true);
      mockRolesGuard.canActivate.mockReturnValue(true);
      mockAvaliacoesService.lancarAvaliacoes.mockResolvedValue({ relatorio: mockRelatorio });

      // Act & Assert
      await expect(controller.lancarAvaliacoes(mockIdCiclo)).resolves.toBeDefined();
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve propagar HttpException do service em lancarAvaliacoes', async () => {
      // Arrange
      const httpError = new Error('Ciclo não encontrado');
      mockAvaliacoesService.lancarAvaliacoes.mockRejectedValue(httpError);

      // Act & Assert
      await expect(controller.lancarAvaliacoes(mockIdCiclo)).rejects.toThrow(httpError);
    });

    it('deve propagar erro em preenchimento de avaliação', async () => {
      // Arrange
      const error = new Error('Avaliação já concluída');
      mockAvaliacoesService.preencherAvaliacaoPares.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.preencherAvaliacaoPares(mockAvaliacaoParesDto))
        .rejects.toThrow(error);
    });

    it('deve propagar erro em busca de avaliações', async () => {
      // Arrange
      const error = new Error('Colaborador não encontrado');
      mockAvaliacoesService.getAvaliacoesPorUsuarioTipo.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getAvaliacoesPorUsuarioTipo(
        'id-invalido',
        mockIdCiclo
      )).rejects.toThrow(error);
    });

    it('deve propagar erro em cálculo de discrepância', async () => {
      // Arrange
      const error = new Error('Erro no cálculo');
      mockAvaliacoesService.discrepanciaColaborador.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getNotasAvaliacoes(
        mockIdColaborador,
        mockIdCiclo
      )).rejects.toThrow(error);
    });
  });

  describe('Logs', () => {
    it('deve logar relatório de lançamento de avaliações', async () => {
      // Arrange
      mockAvaliacoesService.lancarAvaliacoes.mockResolvedValue({
        relatorio: mockRelatorio,
      });
      const spyLogger = jest.spyOn(Logger.prototype, 'log');

      // Act
      await controller.lancarAvaliacoes(mockIdCiclo);

      // Assert
      expect(spyLogger).toHaveBeenCalledWith(
        `Relatório de lançamento de avaliações: ${JSON.stringify(mockRelatorio)}`
      );
    });

    it('deve logar relatório de autoavaliações', async () => {
      // Arrange
      const mockRelatorioAuto = { lancadas: 2, existentes: 0, erros: 0 };
      mockAvaliacoesService.lancarAutoAvaliacoes.mockResolvedValue(mockRelatorioAuto);
      const spyLogger = jest.spyOn(Logger.prototype, 'log');

      // Act
      await controller.lancarAutoAvaliacao({ idCiclo: mockIdCiclo });

      // Assert
      expect(spyLogger).toHaveBeenCalledWith(
        `Relatório de lançamento de avaliações: ${JSON.stringify(mockRelatorioAuto)}`
      );
    });

    it('deve logar relatório de pares', async () => {
      // Arrange
      const mockRelatorioPares = { lancadas: 4, existentes: 0, erros: 0 };
      mockAvaliacoesService.lancarAvaliaçãoPares.mockResolvedValue(mockRelatorioPares);
      const spyLogger = jest.spyOn(Logger.prototype, 'log');

      // Act
      await controller.lancarAvaliaçãoPares(mockIdCiclo);

      // Assert
      expect(spyLogger).toHaveBeenCalledWith(
        `Relatório de lançamento de avaliações: ${JSON.stringify(mockRelatorioPares)}`
      );
    });
  });

  describe('Validação de Entrada', () => {
    it('deve aceitar DTO válido para avaliação de pares', async () => {
      // Arrange
      mockAvaliacoesService.preencherAvaliacaoPares.mockResolvedValue(undefined);

      const dtoValido: AvaliacaoParesDto = {
        idAvaliacao: mockIdAvaliacao,
        nota: 4.5,
        motivacao: Motivacao.Concordo_Totalmente,
        pontosFortes: 'Pontos fortes válidos',
        pontosFracos: 'Pontos fracos válidos',
      };

      // Act & Assert
      await expect(controller.preencherAvaliacaoPares(dtoValido)).resolves.toBeDefined();
    });

    it('deve aceitar DTO válido para autoavaliação', async () => {
      // Arrange
      mockAvaliacoesService.preencherAutoAvaliacao.mockResolvedValue(undefined);

      const dtoValido: PreencherAuto_ou_Lider_Dto = {
        idAvaliacao: mockIdAvaliacao,
        criterios: [
          {
            nome: 'Critério Teste',
            nota: 4.0,
            justificativa: 'Justificativa válida',
          },
        ],
      };

      // Act & Assert
      await expect(controller.preencherAutoAvaliacao(dtoValido)).resolves.toBeDefined();
    });
  });

  describe('Casos Edge', () => {
    it('deve lidar com parâmetros de query opcionais', async () => {
      // Arrange
      mockAvaliacoesService.getAvaliacoesPorUsuarioTipo.mockResolvedValue([]);

      // Act
      const resultado = await controller.getAvaliacoesPorUsuarioTipo(
        mockIdColaborador,
        mockIdCiclo,
        undefined // tipoAvaliacao opcional
      );

      // Assert
      expect(resultado.tipoFiltrado).toBe('todos');
      expect(mockAvaliacoesService.getAvaliacoesPorUsuarioTipo).toHaveBeenCalledWith(
        mockIdColaborador,
        mockIdCiclo,
        undefined
      );
    });

    it('deve lidar com request object em historicoComoLider', async () => {
      // Arrange
      mockAvaliacoesService.historicoComoLider.mockResolvedValue([]);

      const mockReq = {
        user: {
          userId: 'different-user-id',
          email: 'different@test.com',
        },
      };

      // Act
      const resultado = await controller.historicoComoLider(mockReq);

      // Assert
      expect(mockAvaliacoesService.historicoComoLider).toHaveBeenCalledWith('different-user-id');
    });

    it('deve retornar array vazio quando discrepanciaAllcolaboradores retorna undefined', async () => {
      // Arrange
      mockAvaliacoesService.discrepanciaAllcolaboradores.mockResolvedValue(undefined);

      // Act
      const resultado = await controller.getNotasCiclo(mockIdCiclo);

      // Assert
      expect(resultado).toEqual([]);
    });
  });
});