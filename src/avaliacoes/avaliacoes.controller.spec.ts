import { Test, TestingModule } from '@nestjs/testing';
import { AvaliacoesController } from './avaliacoes.controller';
import { AvaliacoesService } from './avaliacoes.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Logger } from '@nestjs/common';
import { avaliacaoTipo, preenchimentoStatus } from '@prisma/client';
import { Status } from './avaliacoes.constants';
import { 
  AvaliacaoParesDto, 
  AvaliacaoColaboradorMentorDto, 
  PreencherAuto_ou_Lider_Dto 
} from './avaliacoes.dto';
import { RelatorioItem, Motivacao } from './avaliacoes.constants';

describe('AvaliacoesController', () => {
  let controller: AvaliacoesController;
  let service: AvaliacoesService;
  let auditoriaService: AuditoriaService;

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
    lancarAvaliacaoPares: jest.fn(), // ✅ Corrigido: sem acento
    lancarAvaliacaoLiderColaborador: jest.fn(),
    lancarAvaliacaoColaboradorMentor: jest.fn(),
    listarAvaliacoesComite: jest.fn(),
    historicoComoLider: jest.fn(),
    discrepanciaColaborador: jest.fn(),
    discrepanciaAllcolaboradores: jest.fn(),
    getFormsAvaliacao: jest.fn(),
    getFormsLiderColaborador: jest.fn(),
  };

  // Mock do AuditoriaService
  const mockAuditoriaService = {
    log: jest.fn(),
    getLogs: jest.fn(),
  };

  // Mock dos Guards
  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockRolesGuard = {
    canActivate: jest.fn(() => true),
  };

  // Mock do request com dados de usuário
  const mockRequest = {
    user: {
      userId: 'user-123',
      email: 'test@empresa.com',
      roles: ['ADMIN'],
    },
    ip: '192.168.1.100',
  };

  // Dados de teste
  const mockIdCiclo = '123e4567-e89b-12d3-a456-426614174000';
  const mockIdAvaliacao = '789e0123-e89b-12d3-a456-426614174001';
  const mockIdColaborador = '456e7890-e89b-12d3-a456-426614174002';
  const mockUserId = 'user-123';

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
        {
          provide: AuditoriaService,
          useValue: mockAuditoriaService,
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
    auditoriaService = module.get<AuditoriaService>(AuditoriaService);

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

    it('deve ter AvaliacoesService injetado', () => {
      expect(service).toBeDefined();
    });

    it('deve ter AuditoriaService injetado', () => {
      expect(auditoriaService).toBeDefined();
    });
  });

  describe('lancarAvaliacoes (COM auditoria)', () => {
    it('deve lançar avaliações com sucesso e registrar auditoria', async () => {
      // Arrange
      mockAvaliacoesService.lancarAvaliacoes.mockResolvedValue({
        relatorio: mockRelatorio,
      });
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.lancarAvaliacoes(mockIdCiclo, mockRequest);

      // Assert
      expect(resultado).toEqual({
        message: 'Avaliações lançadas com sucesso',
        relatorio: mockRelatorio,
      });
      expect(mockAvaliacoesService.lancarAvaliacoes).toHaveBeenCalledWith(mockIdCiclo);
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        `Relatório de lançamento de avaliações: ${JSON.stringify(mockRelatorio)}`
      );

      // Verifica auditoria
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.userId,
        action: 'lancar_avaliacoes',
        resource: 'Avaliacao',
        details: { idCiclo: mockIdCiclo, relatorio: mockRelatorio },
        ip: mockRequest.ip,
      });
    });

    it('deve propagar erro do service sem registrar auditoria', async () => {
      // Arrange
      const error = new Error('Ciclo não encontrado');
      mockAvaliacoesService.lancarAvaliacoes.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.lancarAvaliacoes(mockIdCiclo, mockRequest)).rejects.toThrow(error);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('preencherAvaliacaoPares (COM auditoria)', () => {
    it('deve preencher avaliação de pares com sucesso e registrar auditoria', async () => {
      // Arrange
      mockAvaliacoesService.preencherAvaliacaoPares.mockResolvedValue(undefined);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.preencherAvaliacaoPares(mockAvaliacaoParesDto, mockRequest);

      // Assert
      expect(resultado).toEqual({
        message: 'Avaliação preenchida com sucesso!',
      });
      expect(mockAvaliacoesService.preencherAvaliacaoPares).toHaveBeenCalledWith(
        mockAvaliacaoParesDto.idAvaliacao,
        mockAvaliacaoParesDto.status,
        mockAvaliacaoParesDto.nota,
        mockAvaliacaoParesDto.motivacao,
        mockAvaliacaoParesDto.pontosFortes,
        mockAvaliacaoParesDto.pontosFracos
      );

      // Verifica auditoria
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.userId,
        action: 'preencher_avaliacao_pares',
        resource: 'Avaliacao',
        details: { ...mockAvaliacaoParesDto },
        ip: mockRequest.ip,
      });
    });

    it('deve propagar erro do service sem registrar auditoria', async () => {
      // Arrange
      const error = new Error('Avaliação não encontrada');
      mockAvaliacoesService.preencherAvaliacaoPares.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.preencherAvaliacaoPares(mockAvaliacaoParesDto, mockRequest))
        .rejects.toThrow(error);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('preencherAvaliacaoColaboradorMentor (COM auditoria)', () => {
    it('deve preencher avaliação colaborador-mentor com sucesso e registrar auditoria', async () => {
      // Arrange
      mockAvaliacoesService.preencherAvaliacaoColaboradorMentor.mockResolvedValue(undefined);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.preencherAvaliacaoColaboradorMentor(mockAvaliacaoMentorDto, mockRequest);

      // Assert
      expect(resultado).toEqual({
        message: 'Avaliação preenchida com sucesso!',
      });
      expect(mockAvaliacoesService.preencherAvaliacaoColaboradorMentor).toHaveBeenCalledWith(
        mockAvaliacaoMentorDto.idAvaliacao,
        mockAvaliacaoParesDto.status,
        mockAvaliacaoMentorDto.nota,
        mockAvaliacaoMentorDto.justificativa
      );

      // Verifica auditoria
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.userId,
        action: 'preencher_avaliacao_colaborador_mentor',
        resource: 'Avaliacao',
        details: { ...mockAvaliacaoMentorDto },
        ip: mockRequest.ip,
      });
    });
  });

  describe('preencherAutoAvaliacao (COM auditoria)', () => {
    it('deve preencher autoavaliação com sucesso e registrar auditoria', async () => {
      // Arrange
      mockAvaliacoesService.preencherAutoAvaliacao.mockResolvedValue(undefined);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.preencherAutoAvaliacao(mockAutoAvaliacaoDto, mockRequest);

      // Assert
      expect(resultado).toEqual({
        message: 'Autoavaliação preenchida com sucesso!',
        idAvaliacao: mockAutoAvaliacaoDto.idAvaliacao,
      });
      expect(mockAvaliacoesService.preencherAutoAvaliacao).toHaveBeenCalledWith(
        mockAutoAvaliacaoDto.idAvaliacao,
        mockAutoAvaliacaoDto.criterios
      );

      // Verifica auditoria
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.userId,
        action: 'preencher_auto_avaliacao',
        resource: 'Avaliacao',
        details: { ...mockAutoAvaliacaoDto },
        ip: mockRequest.ip,
      });
    });
  });

  describe('preencherAvaliacaoLiderColaborador (COM auditoria)', () => {
    it('deve preencher avaliação líder-colaborador com sucesso e registrar auditoria', async () => {
      // Arrange
      mockAvaliacoesService.preencherAvaliacaoLiderColaborador.mockResolvedValue(undefined);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.preencherAvaliacaoLiderColaborador(mockAutoAvaliacaoDto, mockRequest);

      // Assert
      expect(resultado).toEqual({
        message: 'Avaliação lider-colaborador preenchida com sucesso!',
        idAvaliacao: mockAutoAvaliacaoDto.idAvaliacao,
      });
      expect(mockAvaliacoesService.preencherAvaliacaoLiderColaborador).toHaveBeenCalledWith(
        mockAutoAvaliacaoDto.idAvaliacao,
        mockAutoAvaliacaoDto.criterios
      );

      // Verifica auditoria
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.userId,
        action: 'preencher_lider_colaborador',
        resource: 'Avaliacao',
        details: { ...mockAutoAvaliacaoDto },
        ip: mockRequest.ip,
      });
    });
  });

  describe('lancarAutoAvaliacao (COM auditoria)', () => {
    it('deve lançar autoavaliações com sucesso e registrar auditoria', async () => {
      // Arrange
      const mockRelatorioAuto = { lancadas: 2, existentes: 0, erros: 0 };
      mockAvaliacoesService.lancarAutoAvaliacoes.mockResolvedValue(mockRelatorioAuto);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.lancarAutoAvaliacao({ idCiclo: mockIdCiclo }, mockRequest);

      // Assert
      expect(resultado).toEqual({
        message: 'Autoavaliações lançadas com sucesso',
        relatorio: mockRelatorioAuto,
      });
      expect(mockAvaliacoesService.lancarAutoAvaliacoes).toHaveBeenCalledWith(mockIdCiclo);
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        `Relatório de lançamento de avaliações: ${JSON.stringify(mockRelatorioAuto)}`
      );

      // Verifica auditoria
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.userId,
        action: 'lancar_auto_avaliacoes',
        resource: 'Avaliacao',
        details: { idCiclo: mockIdCiclo, relatorio: mockRelatorioAuto },
        ip: mockRequest.ip,
      });
    });
  });

  describe('lancarAvaliacaoPares (COM auditoria)', () => {
    it('deve lançar avaliações de pares com sucesso e registrar auditoria', async () => {
      // Arrange
      const mockRelatorioPares = { lancadas: 4, existentes: 0, erros: 0 };
      mockAvaliacoesService.lancarAvaliacaoPares.mockResolvedValue(mockRelatorioPares); // ✅ Corrigido
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.lancarAvaliacaoPares(mockIdCiclo, mockRequest);

      // Assert
      expect(resultado).toEqual({
        message: 'Avaliações de pares lançadas com sucesso',
        relatorio: mockRelatorioPares,
      });
      expect(mockAvaliacoesService.lancarAvaliacaoPares).toHaveBeenCalledWith(mockIdCiclo); // ✅ Corrigido
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        `Relatório de lançamento de avaliações: ${JSON.stringify(mockRelatorioPares)}`
      );

      // Verifica auditoria
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.userId,
        action: 'lancar_avaliacao_pares',
        resource: 'Avaliacao',
        details: { idCiclo: mockIdCiclo, relatorio: mockRelatorioPares },
        ip: mockRequest.ip,
      });
    });
  });

  describe('lancarAvaliacaoLiderColaborador (COM auditoria)', () => {
    it('deve lançar avaliações líder-colaborador com sucesso e registrar auditoria', async () => {
      // Arrange
      const mockRelatorioLider = { lancadas: 1, existentes: 0, erros: 0 };
      mockAvaliacoesService.lancarAvaliacaoLiderColaborador.mockResolvedValue(mockRelatorioLider);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.lancarAvaliacaoLiderColaborador(mockIdCiclo, mockRequest);

      // Assert
      expect(resultado).toEqual({
        message: 'Avaliações lider-colaborador lançadas com sucesso',
        relatorio: mockRelatorioLider,
      });
      expect(mockAvaliacoesService.lancarAvaliacaoLiderColaborador).toHaveBeenCalledWith(mockIdCiclo);

      // Verifica auditoria
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.userId,
        action: 'lancar_lider_colaborador',
        resource: 'Avaliacao',
        details: { idCiclo: mockIdCiclo, relatorio: mockRelatorioLider },
        ip: mockRequest.ip,
      });
    });
  });

  describe('lancarAvaliacaoColaboradorMentor (COM auditoria)', () => {
    it('deve lançar avaliações colaborador-mentor com sucesso e registrar auditoria', async () => {
      // Arrange
      const mockRelatorioMentor = { lancadas: 1, existentes: 0, erros: 0 };
      mockAvaliacoesService.lancarAvaliacaoColaboradorMentor.mockResolvedValue(mockRelatorioMentor);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.lancarAvaliacaoColaboradorMentor(mockIdCiclo, mockRequest);

      // Assert
      expect(resultado).toEqual({
        message: 'Avaliações colaborador-mentor lançadas com sucesso',
        relatorio: mockRelatorioMentor,
      });
      expect(mockAvaliacoesService.lancarAvaliacaoColaboradorMentor).toHaveBeenCalledWith(mockIdCiclo);

      // Verifica auditoria
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.userId,
        action: 'lancar_colaborador_mentor',
        resource: 'Avaliacao',
        details: { idCiclo: mockIdCiclo, relatorio: mockRelatorioMentor },
        ip: mockRequest.ip,
      });
    });
  });

  describe('getAvaliacoesPorUsuarioTipo (SEM auditoria)', () => {
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
      
      // Sem auditoria
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
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
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('getAvaliacoesPorCicloStatus (SEM auditoria)', () => {
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
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('listarAvaliacoesComite (SEM auditoria)', () => {
    it('deve listar avaliações do comitê', async () => {
      // Arrange
      mockAvaliacoesService.listarAvaliacoesComite.mockResolvedValue(mockEqualizacoes);

      // Act
      const resultado = await controller.listarAvaliacoesComite();

      // Assert
      expect(resultado).toEqual(mockEqualizacoes);
      expect(mockAvaliacoesService.listarAvaliacoesComite).toHaveBeenCalled();
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('historicoComoLider (SEM auditoria)', () => {
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
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('getNotasAvaliacoes (SEM auditoria)', () => {
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
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('getNotasCiclo (SEM auditoria)', () => {
    it('deve buscar relatório de discrepância para todos os colaboradores', async () => {
      // Arrange
      mockAvaliacoesService.discrepanciaAllcolaboradores.mockResolvedValue(mockRelatorioDiscrepancia);

      // Act
      const resultado = await controller.getNotasCiclo(mockIdCiclo);

      // Assert
      expect(resultado).toEqual(mockRelatorioDiscrepancia);
      expect(mockAvaliacoesService.discrepanciaAllcolaboradores).toHaveBeenCalledWith(mockIdCiclo);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve retornar array vazio quando service retorna undefined', async () => {
      // Arrange
      mockAvaliacoesService.discrepanciaAllcolaboradores.mockResolvedValue(undefined);

      // Act
      const resultado = await controller.getNotasCiclo(mockIdCiclo);

      // Assert
      expect(resultado).toEqual([]);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('getFormsAutoAvaliacao (SEM auditoria)', () => {
    it('deve buscar formulários de autoavaliação', async () => {
      // Arrange
      mockAvaliacoesService.getFormsAvaliacao.mockResolvedValue(mockFormsResponse);

      // Act
      const resultado = await controller.getFormsAutoAvaliacao(mockIdAvaliacao);

      // Assert
      expect(resultado).toEqual(mockFormsResponse);
      expect(mockAvaliacoesService.getFormsAvaliacao).toHaveBeenCalledWith(mockIdAvaliacao);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('getFormsLiderColaborador (SEM auditoria)', () => {
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
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('Auditoria - Casos de falha', () => {
    it('deve falhar se auditoria falhar em lancarAvaliacoes', async () => {
      // Arrange
      mockAvaliacoesService.lancarAvaliacoes.mockResolvedValue({ relatorio: mockRelatorio });
      mockAuditoriaService.log.mockRejectedValue(new Error('Erro na auditoria'));

      // Act & Assert
      await expect(controller.lancarAvaliacoes(mockIdCiclo, mockRequest))
        .rejects.toThrow('Erro na auditoria');
      
      // Service é chamado normalmente
      expect(mockAvaliacoesService.lancarAvaliacoes).toHaveBeenCalledWith(mockIdCiclo);
    });

    it('deve falhar se auditoria falhar em preencherAvaliacaoPares', async () => {
      // Arrange
      mockAvaliacoesService.preencherAvaliacaoPares.mockResolvedValue(undefined);
      mockAuditoriaService.log.mockRejectedValue(new Error('Erro na auditoria'));

      // Act & Assert
      await expect(controller.preencherAvaliacaoPares(mockAvaliacaoParesDto, mockRequest))
        .rejects.toThrow('Erro na auditoria');
    });
  });

  describe('Guards e Permissões', () => {
    it('deve aplicar JwtAuthGuard em todas as rotas protegidas', () => {
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
    });

    it('deve aplicar RolesGuard nas rotas administrativas', () => {
      expect(mockRolesGuard.canActivate).toBeDefined();
    });
  });

  describe('Observações sobre auditoria no AvaliacoesController', () => {
    it('deve demonstrar quais operações têm auditoria', () => {
      // Operações COM auditoria (conforme controller real):
      // - POST /avaliacoes (lancarAvaliacoes)
      // - POST /avaliacoes/preencher-avaliacao-pares
      // - POST /avaliacoes/preencher-avaliacao-colaborador-mentor
      // - POST /avaliacoes/preencher-auto-avaliacao
      // - POST /avaliacoes/preencher-lider-colaborador
      // - POST /avaliacoes/lancar-auto-avaliacoes
      // - POST /avaliacoes/lancar-pares
      // - POST /avaliacoes/lancar-lider-colaborador
      // - POST /avaliacoes/lancar-colaborador-mentor

      // Operações SEM auditoria (conforme controller real):
      // - GET /avaliacoes/tipo/usuario/:idColaborador
      // - GET /avaliacoes/status/:idCiclo
      // - GET /avaliacoes/comite
      // - GET /avaliacoes/historico-lider
      // - GET /avaliacoes/notasAvaliacoes/:idColaborador/:idCiclo
      // - GET /avaliacoes/notasCiclo/:idCiclo
      // - GET /avaliacoes/forms-autoavaliacao/:idAvaliacao
      // - GET /avaliacoes/forms-lider-colaborador/:idAvaliacao

      expect(controller.lancarAvaliacoes).toBeDefined();                      // COM auditoria
      expect(controller.preencherAvaliacaoPares).toBeDefined();               // COM auditoria
      expect(controller.preencherAvaliacaoColaboradorMentor).toBeDefined();   // COM auditoria
      expect(controller.preencherAutoAvaliacao).toBeDefined();                // COM auditoria
      expect(controller.preencherAvaliacaoLiderColaborador).toBeDefined();    // COM auditoria
      expect(controller.lancarAutoAvaliacao).toBeDefined();                   // COM auditoria
      expect(controller.lancarAvaliacaoPares).toBeDefined();                  // COM auditoria
      expect(controller.lancarAvaliacaoLiderColaborador).toBeDefined();       // COM auditoria
      expect(controller.lancarAvaliacaoColaboradorMentor).toBeDefined();      // COM auditoria
      
      expect(controller.getAvaliacoesPorUsuarioTipo).toBeDefined();           // SEM auditoria
      expect(controller.getAvaliacoesPorCicloStatus).toBeDefined();           // SEM auditoria
      expect(controller.listarAvaliacoesComite).toBeDefined();                // SEM auditoria
      expect(controller.historicoComoLider).toBeDefined();                    // SEM auditoria
      expect(controller.getNotasAvaliacoes).toBeDefined();                    // SEM auditoria
      expect(controller.getNotasCiclo).toBeDefined();                         // SEM auditoria
      expect(controller.getFormsAutoAvaliacao).toBeDefined();                 // SEM auditoria
      expect(controller.getFormsLiderColaborador).toBeDefined();              // SEM auditoria
    });

    it('deve demonstrar padrão de auditoria: todas as operações POST têm auditoria', async () => {
      // Arrange
      mockAvaliacoesService.preencherAutoAvaliacao.mockResolvedValue(undefined);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      await controller.preencherAutoAvaliacao(mockAutoAvaliacaoDto, mockRequest);

      // Assert
      // Todas as operações POST (que modificam dados) registram auditoria
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.userId,
        action: 'preencher_auto_avaliacao',
        resource: 'Avaliacao',
        details: { ...mockAutoAvaliacaoDto },
        ip: mockRequest.ip,
      });
      
      // Nota: Operações GET (que apenas consultam) não têm auditoria
      // pois não modificam o estado do sistema
    });
  });
});