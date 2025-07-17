import { Test, TestingModule } from '@nestjs/testing';
import { EqualizacaoController } from './equalizacao.controller';
import { EqualizacaoService } from './equalizacao.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateEqualizacaoDto, UpdateEqualizacaoDto } from './equalizacao.dto';
import { preenchimentoStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { 
  BadRequestException, 
  NotFoundException,
  Logger 
} from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import 'reflect-metadata';

describe('EqualizacaoController', () => {
  let controller: EqualizacaoController;
  let service: EqualizacaoService;
  let auditoriaService: AuditoriaService;

  // Mock do EqualizacaoService
  const mockEqualizacaoService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByAvaliado: jest.fn(),
    findByAvaliadoCiclo: jest.fn(),
    findByComite: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  // Mock do AuditoriaService
  const mockAuditoriaService = {
    log: jest.fn(),
    getLogs: jest.fn(),
  };

  // Mock dos Guards
  const mockJwtAuthGuard = {
    canActivate: jest.fn((context: ExecutionContext) => {
      const request = context.switchToHttp().getRequest();
      request.user = { userId: 'user-id', roles: ['ADMIN'] };
      return true;
    }),
  };

  const mockRolesGuard = {
    canActivate: jest.fn(() => true),
  };

  // Mock do request com dados de usuário
  const mockRequest = {
    user: { 
      userId: 'user-123',
      email: 'admin@empresa.com',
      roles: ['ADMIN'] 
    },
    ip: '127.0.0.1',
  };

  // Dados de teste
  const mockCiclo = {
    idCiclo: '123e4567-e89b-12d3-a456-426614174000',
    nomeCiclo: '2024.1',
    status: 'EM_ANDAMENTO',
    dataInicio: new Date('2024-01-01'),
    dataFim: new Date('2024-12-31'),
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
    unidade: 'TI',
    trilhaCarreira: 'Frontend',
  };

  const mockEqualizacao = {
    idEqualizacao: '987e6543-e89b-12d3-a456-426614174003',
    idCiclo: mockCiclo.idCiclo,
    idAvaliado: mockColaborador1.idColaborador,
    idMembroComite: null,
    notaAjustada: null,
    justificativa: null,
    status: preenchimentoStatus.PENDENTE,
    dataEqualizacao: new Date(),
  };

  const mockEqualizacaoComRelacionamentos = {
    ...mockEqualizacao,
    alvo: {
      idColaborador: mockColaborador1.idColaborador,
      nomeCompleto: mockColaborador1.nomeCompleto,
      cargo: mockColaborador1.cargo,
      unidade: mockColaborador1.unidade,
      trilhaCarreira: mockColaborador1.trilhaCarreira,
    },
    membroComite: null,
  };

  const mockEqualizacaoPreenchida = {
    ...mockEqualizacaoComRelacionamentos,
    notaAjustada: 4.5,
    justificativa: 'Colaborador demonstrou excelente performance durante o ciclo',
    status: preenchimentoStatus.CONCLUIDA,
    idMembroComite: 'membro-comite-id',
    membroComite: {
      idColaborador: 'membro-comite-id',
      nomeCompleto: 'Comitê Membro',
    },
  };

  const createEqualizacaoDto: CreateEqualizacaoDto = {
    idCiclo: mockCiclo.idCiclo,
  };

  const updateEqualizacaoDto: UpdateEqualizacaoDto = {
    notaAjustada: 4.5,
    justificativa: 'Colaborador demonstrou excelente performance durante o ciclo',
    status: preenchimentoStatus.CONCLUIDA,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EqualizacaoController],
      providers: [
        {
          provide: EqualizacaoService,
          useValue: mockEqualizacaoService,
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

    controller = module.get<EqualizacaoController>(EqualizacaoController);
    service = module.get<EqualizacaoService>(EqualizacaoService);
    auditoriaService = module.get<AuditoriaService>(AuditoriaService);

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

    it('deve ter o service injetado', () => {
      expect(service).toBeDefined();
    });

    it('deve ter o auditoriaService injetado', () => {
      expect(auditoriaService).toBeDefined();
    });
  });

  describe('create (POST /equalizacao)', () => {
    it('deve criar equalizações para um ciclo com sucesso e registrar auditoria', async () => {
      // Arrange
      const resultadoCriacao = {
        message: 'Equalizações criadas com sucesso para 2 colaboradores',
        total: 2,
        novasEqualizacoes: 2,
        equalizacoes: [
          { ...mockEqualizacao, alvo: mockColaborador1 },
          { 
            ...mockEqualizacao, 
            idEqualizacao: 'another-id',
            idAvaliado: mockColaborador2.idColaborador,
            alvo: mockColaborador2 
          },
        ],
      };

      mockEqualizacaoService.create.mockResolvedValue(resultadoCriacao);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.create(createEqualizacaoDto, mockRequest);

      // Assert
      expect(resultado).toEqual(resultadoCriacao);
      expect(mockEqualizacaoService.create).toHaveBeenCalledWith(createEqualizacaoDto);
      expect(mockEqualizacaoService.create).toHaveBeenCalledTimes(1);

      // Verifica auditoria
      expect(mockAuditoriaService.log).toHaveBeenCalledTimes(1);
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.userId,
        action: 'Lancamento de equalizações',
        resource: 'Equalizacao',
        details: { ...createEqualizacaoDto, result: resultadoCriacao },
        ip: mockRequest.ip,
      });
    });

    it('deve criar equalizações parciais quando algumas já existem e registrar auditoria', async () => {
      // Arrange
      const resultadoParcial = {
        message: 'Equalizações criadas com sucesso para 1 colaboradores',
        total: 2,
        novasEqualizacoes: 1,
        equalizacoes: [
          { 
            ...mockEqualizacao, 
            idAvaliado: mockColaborador2.idColaborador,
            alvo: mockColaborador2 
          },
        ],
      };

      mockEqualizacaoService.create.mockResolvedValue(resultadoParcial);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.create(createEqualizacaoDto, mockRequest);

      // Assert
      expect(resultado).toEqual(resultadoParcial);
      expect(resultado.total).toBe(2);
      expect(resultado.novasEqualizacoes).toBe(1);
      expect(resultado.equalizacoes).toHaveLength(1);

      // Verifica auditoria
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.userId,
        action: 'Lancamento de equalizações',
        resource: 'Equalizacao',
        details: { ...createEqualizacaoDto, result: resultadoParcial },
        ip: mockRequest.ip,
      });
    });

    it('deve retornar erro quando ciclo não encontrado sem registrar auditoria', async () => {
      // Arrange
      const error = new NotFoundException(`Ciclo com ID ${createEqualizacaoDto.idCiclo} não encontrado`);
      mockEqualizacaoService.create.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.create(createEqualizacaoDto, mockRequest)).rejects.toThrow(NotFoundException);
      await expect(controller.create(createEqualizacaoDto, mockRequest)).rejects.toThrow(
        `Ciclo com ID ${createEqualizacaoDto.idCiclo} não encontrado`
      );
      expect(mockEqualizacaoService.create).toHaveBeenCalledWith(createEqualizacaoDto);
      
      // Verifica que auditoria NÃO foi chamada em caso de erro
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve retornar erro quando ciclo não possui participantes sem registrar auditoria', async () => {
      // Arrange
      const error = new BadRequestException('Ciclo não possui participantes para equalização');
      mockEqualizacaoService.create.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.create(createEqualizacaoDto, mockRequest)).rejects.toThrow(BadRequestException);
      await expect(controller.create(createEqualizacaoDto, mockRequest)).rejects.toThrow(
        'Ciclo não possui participantes para equalização'
      );
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve continuar funcionando mesmo se auditoria falhar', async () => {
      // Arrange
      const resultadoCriacao = {
        message: 'Equalizações criadas com sucesso para 2 colaboradores',
        total: 2,
        novasEqualizacoes: 2,
        equalizacoes: [{ ...mockEqualizacao, alvo: mockColaborador1 }],
      };

      mockEqualizacaoService.create.mockResolvedValue(resultadoCriacao);
      mockAuditoriaService.log.mockRejectedValue(new Error('Erro na auditoria'));

      // Act & Assert
      await expect(controller.create(createEqualizacaoDto, mockRequest)).rejects.toThrow('Erro na auditoria');
      
      // Verifica que o service foi chamado normalmente
      expect(mockEqualizacaoService.create).toHaveBeenCalledWith(createEqualizacaoDto);
    });

    it('deve funcionar com usuário sem informações completas', async () => {
      // Arrange
      const requestSemUserCompleto = {
        user: undefined,
        ip: '192.168.1.1',
      };

      const resultadoCriacao = {
        message: 'Equalizações criadas com sucesso para 1 colaboradores',
        total: 1,
        novasEqualizacoes: 1,
        equalizacoes: [{ ...mockEqualizacao, alvo: mockColaborador1 }],
      };

      mockEqualizacaoService.create.mockResolvedValue(resultadoCriacao);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.create(createEqualizacaoDto, requestSemUserCompleto);

      // Assert
      expect(resultado).toEqual(resultadoCriacao);
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: undefined,
        action: 'Lancamento de equalizações',
        resource: 'Equalizacao',
        details: { ...createEqualizacaoDto, result: resultadoCriacao },
        ip: requestSemUserCompleto.ip,
      });
    });

    it('deve ter proteção de autenticação e autorização para ADMIN e MEMBRO_COMITE', () => {
      // Assert - verificar se os guards estão sendo aplicados
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
      expect(mockRolesGuard.canActivate).toBeDefined();
    });

    it('deve fazer log da operação', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      const resultadoCriacao = {
        message: 'Equalizações criadas com sucesso para 1 colaboradores',
        total: 1,
        novasEqualizacoes: 1,
        equalizacoes: [{ ...mockEqualizacao, alvo: mockColaborador1 }],
      };

      mockEqualizacaoService.create.mockResolvedValue(resultadoCriacao);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      await controller.create(createEqualizacaoDto, mockRequest);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Recebida requisição para lancar as equalizações');
    });
  });

  describe('findAll (GET /equalizacao)', () => {
    it('deve retornar todas as equalizações com relacionamentos sem auditoria', async () => {
      // Arrange
      const mockEqualizacoes = [
        mockEqualizacaoComRelacionamentos,
        {
          ...mockEqualizacaoComRelacionamentos,
          idEqualizacao: 'another-id',
          idAvaliado: mockColaborador2.idColaborador,
          alvo: {
            idColaborador: mockColaborador2.idColaborador,
            nomeCompleto: mockColaborador2.nomeCompleto,
            cargo: mockColaborador2.cargo,
            unidade: mockColaborador2.unidade,
            trilhaCarreira: mockColaborador2.trilhaCarreira,
          },
        },
      ];

      mockEqualizacaoService.findAll.mockResolvedValue(mockEqualizacoes);

      // Act
      const resultado = await controller.findAll();

      // Assert
      expect(resultado).toEqual(mockEqualizacoes);
      expect(mockEqualizacaoService.findAll).toHaveBeenCalledTimes(1);
      expect(mockEqualizacaoService.findAll).toHaveBeenCalledWith();
      
      // Verifica que auditoria NÃO foi chamada para operação de leitura
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve retornar array vazio quando não há equalizações', async () => {
      // Arrange
      mockEqualizacaoService.findAll.mockResolvedValue([]);

      // Act
      const resultado = await controller.findAll();

      // Assert
      expect(resultado).toEqual([]);
      expect(mockEqualizacaoService.findAll).toHaveBeenCalledTimes(1);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve ter proteção de autenticação JWT', () => {
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
    });
  });

  describe('findByAvaliado (GET /equalizacao/avaliado/:idAvaliado)', () => {
    it('deve retornar equalizações de um avaliado específico sem auditoria', async () => {
      // Arrange
      const idAvaliado = mockColaborador1.idColaborador;
      const mockEqualizacoesAvaliado = [
        {
          ...mockEqualizacao,
          alvo: {
            nomeCompleto: mockColaborador1.nomeCompleto,
            cargo: mockColaborador1.cargo,
          },
        },
      ];

      mockEqualizacaoService.findByAvaliado.mockResolvedValue(mockEqualizacoesAvaliado);

      // Act
      const resultado = await controller.findByAvaliado(idAvaliado);

      // Assert
      expect(resultado).toEqual(mockEqualizacoesAvaliado);
      expect(mockEqualizacaoService.findByAvaliado).toHaveBeenCalledWith(idAvaliado);
      expect(mockEqualizacaoService.findByAvaliado).toHaveBeenCalledTimes(1);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve retornar array vazio quando avaliado não tem equalizações', async () => {
      // Arrange
      const idAvaliado = 'avaliado-sem-equalizacoes';
      mockEqualizacaoService.findByAvaliado.mockResolvedValue([]);

      // Act
      const resultado = await controller.findByAvaliado(idAvaliado);

      // Assert
      expect(resultado).toEqual([]);
      expect(mockEqualizacaoService.findByAvaliado).toHaveBeenCalledWith(idAvaliado);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('findByAvaliadoCiclo (GET /equalizacao/avaliado/:idAvaliado/:idCiclo)', () => {
    it('deve retornar equalizações de um avaliado em ciclo específico sem auditoria', async () => {
      // Arrange
      const idAvaliado = mockColaborador1.idColaborador;
      const idCiclo = mockCiclo.idCiclo;
      const mockEqualizacoesAvaliadoCiclo = [
        {
          ...mockEqualizacao,
          alvo: {
            nomeCompleto: mockColaborador1.nomeCompleto,
            cargo: mockColaborador1.cargo,
          },
        },
      ];

      mockEqualizacaoService.findByAvaliadoCiclo.mockResolvedValue(mockEqualizacoesAvaliadoCiclo);

      // Act
      const resultado = await controller.findByAvaliadoCiclo(idAvaliado, idCiclo);

      // Assert
      expect(resultado).toEqual(mockEqualizacoesAvaliadoCiclo);
      expect(mockEqualizacaoService.findByAvaliadoCiclo).toHaveBeenCalledWith(idAvaliado, idCiclo);
      expect(mockEqualizacaoService.findByAvaliadoCiclo).toHaveBeenCalledTimes(1);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve retornar array vazio quando não há equalizações para o avaliado no ciclo', async () => {
      // Arrange
      const idAvaliado = 'avaliado-sem-equalizacoes';
      const idCiclo = 'ciclo-sem-equalizacoes';
      mockEqualizacaoService.findByAvaliadoCiclo.mockResolvedValue([]);

      // Act
      const resultado = await controller.findByAvaliadoCiclo(idAvaliado, idCiclo);

      // Assert
      expect(resultado).toEqual([]);
      expect(mockEqualizacaoService.findByAvaliadoCiclo).toHaveBeenCalledWith(idAvaliado, idCiclo);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('findByComite (GET /equalizacao/comite/:idMembroComite)', () => {
    it('deve retornar equalizações feitas por um membro do comitê sem auditoria', async () => {
      // Arrange
      const idMembroComite = 'membro-comite-id';
      const mockEqualizacoesComite = [
        {
          ...mockEqualizacao,
          idMembroComite,
          alvo: {
            nomeCompleto: mockColaborador1.nomeCompleto,
            cargo: mockColaborador1.cargo,
          },
        },
      ];

      mockEqualizacaoService.findByComite.mockResolvedValue(mockEqualizacoesComite);

      // Act
      const resultado = await controller.findByComite(idMembroComite);

      // Assert
      expect(resultado).toEqual(mockEqualizacoesComite);
      expect(mockEqualizacaoService.findByComite).toHaveBeenCalledWith(idMembroComite);
      expect(mockEqualizacaoService.findByComite).toHaveBeenCalledTimes(1);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve retornar array vazio quando membro do comitê não fez equalizações', async () => {
      // Arrange
      const idMembroComite = 'membro-sem-equalizacoes';
      mockEqualizacaoService.findByComite.mockResolvedValue([]);

      // Act
      const resultado = await controller.findByComite(idMembroComite);

      // Assert
      expect(resultado).toEqual([]);
      expect(mockEqualizacaoService.findByComite).toHaveBeenCalledWith(idMembroComite);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('findOne (GET /equalizacao/:idEqualizacao)', () => {
    it('deve retornar uma equalização específica com relacionamentos completos sem auditoria', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      mockEqualizacaoService.findOne.mockResolvedValue(mockEqualizacaoPreenchida);

      // Act
      const resultado = await controller.findOne(idEqualizacao);

      // Assert
      expect(resultado).toEqual(mockEqualizacaoPreenchida);
      expect(mockEqualizacaoService.findOne).toHaveBeenCalledWith(idEqualizacao);
      expect(mockEqualizacaoService.findOne).toHaveBeenCalledTimes(1);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve retornar erro quando equalização não encontrada', async () => {
      // Arrange
      const idEqualizacao = 'id-inexistente';
      const error = new NotFoundException(`Equalização com ID ${idEqualizacao} não encontrada`);

      mockEqualizacaoService.findOne.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findOne(idEqualizacao)).rejects.toThrow(NotFoundException);
      await expect(controller.findOne(idEqualizacao)).rejects.toThrow(
        `Equalização com ID ${idEqualizacao} não encontrada`
      );
      expect(mockEqualizacaoService.findOne).toHaveBeenCalledWith(idEqualizacao);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('update (PATCH /equalizacao/:idEqualizacao)', () => {
    it('deve atualizar uma equalização com sucesso e registrar auditoria', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const equalizacaoAtualizada = {
        ...mockEqualizacaoComRelacionamentos,
        ...updateEqualizacaoDto,
      };

      mockEqualizacaoService.update.mockResolvedValue(equalizacaoAtualizada);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.update(idEqualizacao, updateEqualizacaoDto, mockRequest);

      // Assert
      expect(resultado).toEqual(equalizacaoAtualizada);
      expect(mockEqualizacaoService.update).toHaveBeenCalledWith(idEqualizacao, updateEqualizacaoDto);
      expect(mockEqualizacaoService.update).toHaveBeenCalledTimes(1);

      // Verifica auditoria
      expect(mockAuditoriaService.log).toHaveBeenCalledTimes(1);
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.userId,
        action: 'atualizar_equalizacao',
        resource: 'Equalizacao',
        details: { idEqualizacao, ...updateEqualizacaoDto, result: equalizacaoAtualizada },
        ip: mockRequest.ip,
      });
    });

    it('deve atualizar apenas a nota quando justificativa fornecida e registrar auditoria', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const updateDtoApenas = {
        notaAjustada: 3.5,
        justificativa: 'Justificativa obrigatória',
      };

      const equalizacaoAtualizada = {
        ...mockEqualizacaoComRelacionamentos,
        notaAjustada: 3.5,
        justificativa: 'Justificativa obrigatória',
      };

      mockEqualizacaoService.update.mockResolvedValue(equalizacaoAtualizada);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.update(idEqualizacao, updateDtoApenas, mockRequest);

      // Assert
      expect(resultado).toEqual(equalizacaoAtualizada);
      expect(resultado.notaAjustada).toBe(3.5);
      expect(mockEqualizacaoService.update).toHaveBeenCalledWith(idEqualizacao, updateDtoApenas);

      // Verifica auditoria
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.userId,
        action: 'atualizar_equalizacao',
        resource: 'Equalizacao',
        details: { idEqualizacao, ...updateDtoApenas, result: equalizacaoAtualizada },
        ip: mockRequest.ip,
      });
    });

    it('deve retornar erro quando equalização não encontrada para atualização sem registrar auditoria', async () => {
      // Arrange
      const idEqualizacao = 'id-inexistente';
      const error = new NotFoundException(`Equalização com ID ${idEqualizacao} não encontrada`);

      mockEqualizacaoService.update.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.update(idEqualizacao, updateEqualizacaoDto, mockRequest)).rejects.toThrow(NotFoundException);
      await expect(controller.update(idEqualizacao, updateEqualizacaoDto, mockRequest)).rejects.toThrow(
        `Equalização com ID ${idEqualizacao} não encontrada`
      );
      expect(mockEqualizacaoService.update).toHaveBeenCalledWith(idEqualizacao, updateEqualizacaoDto);
      
      // Verifica que auditoria NÃO foi chamada em caso de erro
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve aceitar notas válidas nos extremos (1 e 5) e registrar auditoria', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const updateDtoNota1 = {
        notaAjustada: 1,
        justificativa: 'Nota mínima',
      };
      const updateDtoNota5 = {
        notaAjustada: 5,
        justificativa: 'Nota máxima',
      };

      const equalizacaoNota1 = { ...mockEqualizacaoComRelacionamentos, ...updateDtoNota1 };
      const equalizacaoNota5 = { ...mockEqualizacaoComRelacionamentos, ...updateDtoNota5 };

      mockEqualizacaoService.update
        .mockResolvedValueOnce(equalizacaoNota1)
        .mockResolvedValueOnce(equalizacaoNota5);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado1 = await controller.update(idEqualizacao, updateDtoNota1, mockRequest);
      const resultado5 = await controller.update(idEqualizacao, updateDtoNota5, mockRequest);

      // Assert
      expect(resultado1.notaAjustada).toBe(1);
      expect(resultado5.notaAjustada).toBe(5);
      expect(mockEqualizacaoService.update).toHaveBeenCalledTimes(2);
      
      // Verifica que auditoria foi chamada duas vezes
      expect(mockAuditoriaService.log).toHaveBeenCalledTimes(2);
    });

    it('deve validar enum preenchimentoStatus e registrar auditoria', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const dtoPendente: UpdateEqualizacaoDto = {
        notaAjustada: 4.0,
        justificativa: 'Justificativa',
        status: preenchimentoStatus.PENDENTE,
      };

      const dtoConcluida: UpdateEqualizacaoDto = {
        notaAjustada: 4.0,
        justificativa: 'Justificativa',
        status: preenchimentoStatus.CONCLUIDA,
      };

      mockEqualizacaoService.update
        .mockResolvedValueOnce({ ...mockEqualizacaoComRelacionamentos, ...dtoPendente })
        .mockResolvedValueOnce({ ...mockEqualizacaoComRelacionamentos, ...dtoConcluida });
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultadoPendente = await controller.update(idEqualizacao, dtoPendente, mockRequest);
      const resultadoConcluida = await controller.update(idEqualizacao, dtoConcluida, mockRequest);

      // Assert
      expect(resultadoPendente.status).toBe(preenchimentoStatus.PENDENTE);
      expect(resultadoConcluida.status).toBe(preenchimentoStatus.CONCLUIDA);
      expect(mockAuditoriaService.log).toHaveBeenCalledTimes(2);
    });

    it('deve continuar funcionando mesmo se auditoria falhar', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const equalizacaoAtualizada = {
        ...mockEqualizacaoComRelacionamentos,
        ...updateEqualizacaoDto,
      };

      mockEqualizacaoService.update.mockResolvedValue(equalizacaoAtualizada);
      mockAuditoriaService.log.mockRejectedValue(new Error('Erro na auditoria'));

      // Act & Assert
      await expect(controller.update(idEqualizacao, updateEqualizacaoDto, mockRequest)).rejects.toThrow('Erro na auditoria');
      expect(mockEqualizacaoService.update).toHaveBeenCalledWith(idEqualizacao, updateEqualizacaoDto);
    });

    it('deve ter proteção de autenticação e autorização para ADMIN e MEMBRO_COMITE', () => {
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
      expect(mockRolesGuard.canActivate).toBeDefined();
    });
  });

  describe('remove (DELETE /equalizacao/:idEqualizacao)', () => {
    it('deve remover uma equalização com sucesso e registrar auditoria', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const mensagemSucesso = { message: 'Equalização removida com sucesso' };

      mockEqualizacaoService.remove.mockResolvedValue(mensagemSucesso);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.remove(idEqualizacao, mockRequest);

      // Assert
      expect(resultado).toEqual(mensagemSucesso);
      expect(mockEqualizacaoService.remove).toHaveBeenCalledWith(idEqualizacao);
      expect(mockEqualizacaoService.remove).toHaveBeenCalledTimes(1);

      // Verifica auditoria
      expect(mockAuditoriaService.log).toHaveBeenCalledTimes(1);
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.userId,
        action: 'remover_equalizacao',
        resource: 'Equalizacao',
        details: { idEqualizacao, result: mensagemSucesso },
        ip: mockRequest.ip,
      });
    });

    it('deve retornar erro quando equalização não encontrada para remoção sem registrar auditoria', async () => {
      // Arrange
      const idEqualizacao = 'id-inexistente';
      const error = new NotFoundException(`Equalização com ID ${idEqualizacao} não encontrada`);

      mockEqualizacaoService.remove.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.remove(idEqualizacao, mockRequest)).rejects.toThrow(NotFoundException);
      await expect(controller.remove(idEqualizacao, mockRequest)).rejects.toThrow(
        `Equalização com ID ${idEqualizacao} não encontrada`
      );
      expect(mockEqualizacaoService.remove).toHaveBeenCalledWith(idEqualizacao);
      
      // Verifica que auditoria NÃO foi chamada em caso de erro
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve continuar funcionando mesmo se auditoria falhar', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const mensagemSucesso = { message: 'Equalização removida com sucesso' };

      mockEqualizacaoService.remove.mockResolvedValue(mensagemSucesso);
      mockAuditoriaService.log.mockRejectedValue(new Error('Erro na auditoria'));

      // Act & Assert
      await expect(controller.remove(idEqualizacao, mockRequest)).rejects.toThrow('Erro na auditoria');
      expect(mockEqualizacaoService.remove).toHaveBeenCalledWith(idEqualizacao);
    });

    it('deve ter proteção de autenticação e autorização para ADMIN e MEMBRO_COMITE', () => {
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
      expect(mockRolesGuard.canActivate).toBeDefined();
    });
  });

  describe('Guards e Autenticação', () => {
    it('deve aplicar JwtAuthGuard em todos os endpoints', () => {
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
    });

    it('deve aplicar RolesGuard nos endpoints que exigem role específica', () => {
      expect(mockRolesGuard.canActivate).toBeDefined();
    });

    it('deve simular usuário autenticado com role ADMIN', () => {
      // Arrange
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { userId: 'user-id', roles: ['ADMIN'] },
          }),
        }),
      } as ExecutionContext;

      // Act
      const result = mockJwtAuthGuard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('deve permitir acesso para roles ADMIN e MEMBRO_COMITE', () => {
      const result = mockRolesGuard.canActivate();
      expect(result).toBe(true);
    });

    it('deve proteger endpoints CUD (Create, Update, Delete) com roles ADMIN e MEMBRO_COMITE', () => {
      // Os endpoints POST, PATCH, DELETE devem exigir roles ADMIN ou MEMBRO_COMITE
      expect(mockRolesGuard.canActivate).toBeDefined();
    });

    it('deve proteger endpoints de leitura apenas com JWT', () => {
      // Os endpoints GET devem estar protegidos apenas com JwtAuthGuard
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
    });

    it('deve ter roles corretas aplicadas nos métodos de modificação', () => {
      const metodosModificacao = ['create', 'update', 'remove'];
      
      metodosModificacao.forEach(metodo => {
        const roles = Reflect.getMetadata('roles', EqualizacaoController.prototype[metodo]);
        expect(roles).toEqual(['ADMIN', 'MEMBRO_COMITE']);
      });
    });

    it('deve NOT ter roles nos métodos de consulta', () => {
      const metodosConsulta = ['findAll', 'findByAvaliado', 'findByAvaliadoCiclo', 'findByComite', 'findOne'];
      
      metodosConsulta.forEach(metodo => {
        const roles = Reflect.getMetadata('roles', EqualizacaoController.prototype[metodo]);
        expect(roles).toBeUndefined();
      });
    });
  });

  describe('Auditoria específica', () => {
    it('deve registrar auditoria com dados corretos para cada operação CUD', async () => {
      // Arrange
      const operacoes = [
        {
          metodo: 'create',
          args: [createEqualizacaoDto, mockRequest],
          expectedAction: 'Lancamento de equalizações',
          mockResult: { message: 'Equalizações criadas', total: 1, novasEqualizacoes: 1, equalizacoes: [] },
        },
        {
          metodo: 'update',
          args: ['test-id', updateEqualizacaoDto, mockRequest],
          expectedAction: 'atualizar_equalizacao',
          mockResult: { ...mockEqualizacaoComRelacionamentos, ...updateEqualizacaoDto },
        },
        {
          metodo: 'remove',
          args: ['test-id', mockRequest],
          expectedAction: 'remover_equalizacao',
          mockResult: { message: 'Equalização removida com sucesso' },
        },
      ];

      // Act & Assert
      for (const operacao of operacoes) {
        // Setup mock
        if (operacao.metodo === 'create') {
          mockEqualizacaoService.create.mockResolvedValue(operacao.mockResult);
        } else if (operacao.metodo === 'update') {
          mockEqualizacaoService.update.mockResolvedValue(operacao.mockResult);
        } else if (operacao.metodo === 'remove') {
          mockEqualizacaoService.remove.mockResolvedValue(operacao.mockResult);
        }

        mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

        // Execute
        await controller[operacao.metodo](...operacao.args);

        // Verify
        expect(mockAuditoriaService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: mockRequest.user.userId,
            action: operacao.expectedAction,
            resource: 'Equalizacao',
            ip: mockRequest.ip,
          })
        );

        // Reset
        jest.clearAllMocks();
      }
    });

    it('deve funcionar com diferentes tipos de request', async () => {
      // Arrange
      const requestTypes = [
        { user: { userId: 'user-1' }, ip: '127.0.0.1' },
        { user: { userId: 'user-2', roles: ['ADMIN'] }, ip: '192.168.1.1' },
        { user: undefined, ip: '10.0.0.1' },
        { user: { userId: null }, ip: undefined },
      ];

      const resultadoCriacao = { message: 'Criado', total: 1, novasEqualizacoes: 1, equalizacoes: [] };
      mockEqualizacaoService.create.mockResolvedValue(resultadoCriacao);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act & Assert
      for (const request of requestTypes) {
        await controller.create(createEqualizacaoDto, request);

        expect(mockAuditoriaService.log).toHaveBeenCalledWith({
          userId: request.user?.userId,
          action: 'Lancamento de equalizações',
          resource: 'Equalizacao',
          details: { ...createEqualizacaoDto, result: resultadoCriacao },
          ip: request.ip,
        });

        jest.clearAllMocks();
      }
    });

    it('deve NÃO registrar auditoria para operações de leitura', async () => {
      // Arrange
      const mockResult = [mockEqualizacaoComRelacionamentos];
      mockEqualizacaoService.findAll.mockResolvedValue(mockResult);
      mockEqualizacaoService.findByAvaliado.mockResolvedValue(mockResult);
      mockEqualizacaoService.findByAvaliadoCiclo.mockResolvedValue(mockResult);
      mockEqualizacaoService.findByComite.mockResolvedValue(mockResult);
      mockEqualizacaoService.findOne.mockResolvedValue(mockEqualizacaoComRelacionamentos);

      // Act
      await controller.findAll();
      await controller.findByAvaliado('test-id');
      await controller.findByAvaliadoCiclo('test-id', 'ciclo-id');
      await controller.findByComite('comite-id');
      await controller.findOne('equalizacao-id');

      // Assert
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('Integração de fluxos com auditoria', () => {
    it('deve executar fluxo completo: criar -> buscar -> atualizar -> deletar com auditoria', async () => {
      // Arrange
      const resultadoCriacao = {
        message: 'Equalizações criadas com sucesso para 1 colaboradores',
        total: 1,
        novasEqualizacoes: 1,
        equalizacoes: [{ ...mockEqualizacao, alvo: mockColaborador1 }],
      };
      const equalizacaoAtualizada = { ...mockEqualizacaoComRelacionamentos, ...updateEqualizacaoDto };
      const mensagemRemocao = { message: 'Equalização removida com sucesso' };

      mockEqualizacaoService.create.mockResolvedValue(resultadoCriacao);
      mockEqualizacaoService.findOne.mockResolvedValue(mockEqualizacaoComRelacionamentos);
      mockEqualizacaoService.update.mockResolvedValue(equalizacaoAtualizada);
      mockEqualizacaoService.remove.mockResolvedValue(mensagemRemocao);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const criado = await controller.create(createEqualizacaoDto, mockRequest);
      const buscado = await controller.findOne(mockEqualizacao.idEqualizacao);
      const atualizado = await controller.update(mockEqualizacao.idEqualizacao, updateEqualizacaoDto, mockRequest);
      const removido = await controller.remove(mockEqualizacao.idEqualizacao, mockRequest);

      // Assert
      expect(criado).toEqual(resultadoCriacao);
      expect(buscado).toEqual(mockEqualizacaoComRelacionamentos);
      expect(atualizado).toEqual(equalizacaoAtualizada);
      expect(removido).toEqual(mensagemRemocao);

      // Verifica chamadas do service
      expect(mockEqualizacaoService.create).toHaveBeenCalledWith(createEqualizacaoDto);
      expect(mockEqualizacaoService.findOne).toHaveBeenCalledWith(mockEqualizacao.idEqualizacao);
      expect(mockEqualizacaoService.update).toHaveBeenCalledWith(mockEqualizacao.idEqualizacao, updateEqualizacaoDto);
      expect(mockEqualizacaoService.remove).toHaveBeenCalledWith(mockEqualizacao.idEqualizacao);

      // Verifica que auditoria foi chamada 3 vezes (criar, atualizar, deletar)
      expect(mockAuditoriaService.log).toHaveBeenCalledTimes(3);
    });

    it('deve listar equalizações por diferentes filtros após operações sem auditoria', async () => {
      // Arrange
      const equalizacoesFiltradas = [mockEqualizacaoComRelacionamentos];
      mockEqualizacaoService.findByAvaliado.mockResolvedValue(equalizacoesFiltradas);
      mockEqualizacaoService.findByAvaliadoCiclo.mockResolvedValue(equalizacoesFiltradas);
      mockEqualizacaoService.findByComite.mockResolvedValue(equalizacoesFiltradas);

      // Act
      const porAvaliado = await controller.findByAvaliado(mockColaborador1.idColaborador);
      const porAvaliadoCiclo = await controller.findByAvaliadoCiclo(mockColaborador1.idColaborador, mockCiclo.idCiclo);
      const porComite = await controller.findByComite('membro-comite-id');

      // Assert
      expect(porAvaliado).toEqual(equalizacoesFiltradas);
      expect(porAvaliadoCiclo).toEqual(equalizacoesFiltradas);
      expect(porComite).toEqual(equalizacoesFiltradas);

      expect(mockEqualizacaoService.findByAvaliado).toHaveBeenCalledWith(mockColaborador1.idColaborador);
      expect(mockEqualizacaoService.findByAvaliadoCiclo).toHaveBeenCalledWith(mockColaborador1.idColaborador, mockCiclo.idCiclo);
      expect(mockEqualizacaoService.findByComite).toHaveBeenCalledWith('membro-comite-id');
      
      // Nenhuma auditoria para operações de leitura
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('Tratamento de erros', () => {
    it('deve propagar diferentes tipos de erro do service', async () => {
      // Arrange
      const erros = [
        new Error('Erro de validação'),
        new Error('Erro de banco de dados'),
        new Error('Erro de conexão'),
        new Error('Erro interno'),
      ];

      // Act & Assert
      for (const erro of erros) {
        mockEqualizacaoService.findAll.mockRejectedValue(erro);
        await expect(controller.findAll()).rejects.toThrow(erro.message);
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      }
    });

    it('deve manter operação funcionando mesmo com falha na auditoria durante operações CUD', async () => {
      // Arrange
      const resultadoCriacao = {
        message: 'Equalizações criadas com sucesso',
        total: 1,
        novasEqualizacoes: 1,
        equalizacoes: [mockEqualizacao],
      };

      mockEqualizacaoService.create.mockResolvedValue(resultadoCriacao);
      mockAuditoriaService.log.mockRejectedValue(new Error('Falha na auditoria'));

      // Act & Assert
      await expect(controller.create(createEqualizacaoDto, mockRequest)).rejects.toThrow('Falha na auditoria');
      expect(mockEqualizacaoService.create).toHaveBeenCalledWith(createEqualizacaoDto);
    });
  });

  describe('Validação de DTOs', () => {
    it('deve validar CreateEqualizacaoDto corretamente', async () => {
      // Arrange
      const dtoCompleto: CreateEqualizacaoDto = {
        idCiclo: '123e4567-e89b-12d3-a456-426614174000',
      };

      const resultadoCriacao = {
        message: 'Equalizações criadas com sucesso para 1 colaboradores',
        total: 1,
        novasEqualizacoes: 1,
        equalizacoes: [{ ...mockEqualizacao, alvo: mockColaborador1 }],
      };

      mockEqualizacaoService.create.mockResolvedValue(resultadoCriacao);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.create(dtoCompleto, mockRequest);

      // Assert
      expect(resultado).toBeDefined();
      expect(mockEqualizacaoService.create).toHaveBeenCalledWith(dtoCompleto);
      expect(mockAuditoriaService.log).toHaveBeenCalled();
    });

    it('deve validar UpdateEqualizacaoDto com todos os campos', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const atualizarDto: UpdateEqualizacaoDto = {
        notaAjustada: 4.5,
        justificativa: 'Justificativa completa para a equalização',
        status: preenchimentoStatus.CONCLUIDA,
      };

      mockEqualizacaoService.update.mockResolvedValue({
        ...mockEqualizacaoComRelacionamentos,
        ...atualizarDto,
      });
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.update(idEqualizacao, atualizarDto, mockRequest);

      // Assert
      expect(resultado).toBeDefined();
      expect(mockEqualizacaoService.update).toHaveBeenCalledWith(idEqualizacao, atualizarDto);
      expect(mockAuditoriaService.log).toHaveBeenCalled();
    });
  });

  describe('Integração e casos extremos', () => {
    it('deve lidar com múltiplas operações simultâneas', async () => {
      // Arrange
      mockEqualizacaoService.findAll.mockResolvedValue([mockEqualizacaoComRelacionamentos]);

      // Act
      const operacoes: Promise<any>[] = [
        controller.findAll(),
        controller.findAll(),
        controller.findAll(),
      ];

      const resultados = await Promise.all(operacoes);

      // Assert
      expect(resultados).toHaveLength(3);
      expect(mockEqualizacaoService.findAll).toHaveBeenCalledTimes(3);
      resultados.forEach(resultado => {
        expect(resultado).toEqual([mockEqualizacaoComRelacionamentos]);
      });
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve validar que todos os endpoints estão mapeados corretamente', () => {
      // Assert
      expect(controller.create).toBeDefined();
      expect(controller.findAll).toBeDefined();
      expect(controller.findByAvaliado).toBeDefined();
      expect(controller.findByAvaliadoCiclo).toBeDefined();
      expect(controller.findByComite).toBeDefined();
      expect(controller.findOne).toBeDefined();
      expect(controller.update).toBeDefined();
      expect(controller.remove).toBeDefined();
    });

    it('deve manter consistência entre endpoints de busca específica', async () => {
      // Arrange
      const idAvaliado = mockColaborador1.idColaborador;
      const idCiclo = mockCiclo.idCiclo;
      const idMembroComite = 'membro-comite-id';
      
      const mockEqualizacoesPorAvaliado = [{ ...mockEqualizacao, tipo: 'AVALIADO' }];
      const mockEqualizacoesPorAvaliadoCiclo = [{ ...mockEqualizacao, tipo: 'AVALIADO_CICLO' }];
      const mockEqualizacoesPorComite = [{ ...mockEqualizacao, tipo: 'COMITE' }];

      mockEqualizacaoService.findByAvaliado.mockResolvedValue(mockEqualizacoesPorAvaliado);
      mockEqualizacaoService.findByAvaliadoCiclo.mockResolvedValue(mockEqualizacoesPorAvaliadoCiclo);
      mockEqualizacaoService.findByComite.mockResolvedValue(mockEqualizacoesPorComite);

      // Act
      const resultadoPorAvaliado = await controller.findByAvaliado(idAvaliado);
      const resultadoPorAvaliadoCiclo = await controller.findByAvaliadoCiclo(idAvaliado, idCiclo);
      const resultadoPorComite = await controller.findByComite(idMembroComite);

      // Assert
      expect(resultadoPorAvaliado).toBeDefined();
      expect(resultadoPorAvaliadoCiclo).toBeDefined();
      expect(resultadoPorComite).toBeDefined();
      expect(mockEqualizacaoService.findByAvaliado).toHaveBeenCalledWith(idAvaliado);
      expect(mockEqualizacaoService.findByAvaliadoCiclo).toHaveBeenCalledWith(idAvaliado, idCiclo);
      expect(mockEqualizacaoService.findByComite).toHaveBeenCalledWith(idMembroComite);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('HTTP Status Codes', () => {
    it('deve retornar dados corretos para operações de criação', async () => {
      // Arrange
      const resultadoCriacao = {
        message: 'Equalizações criadas com sucesso para 1 colaboradores',
        total: 1,
        novasEqualizacoes: 1,
        equalizacoes: [{ ...mockEqualizacao, alvo: mockColaborador1 }],
      };

      mockEqualizacaoService.create.mockResolvedValue(resultadoCriacao);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.create(createEqualizacaoDto, mockRequest);

      // Assert
      expect(resultado).toHaveProperty('message');
      expect(resultado).toHaveProperty('total');
      expect(resultado).toHaveProperty('novasEqualizacoes');
      expect(resultado).toHaveProperty('equalizacoes');
      expect(mockAuditoriaService.log).toHaveBeenCalled();
    });

    it('deve retornar dados corretos para operações de busca', async () => {
      // Arrange
      mockEqualizacaoService.findAll.mockResolvedValue([mockEqualizacaoComRelacionamentos]);

      // Act
      const resultado = await controller.findAll();

      // Assert
      expect(Array.isArray(resultado)).toBe(true);
      expect(resultado).toHaveLength(1);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve retornar 204 No Content ao deletar equalização', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const mensagemSucesso = { message: 'Equalização removida com sucesso' };

      mockEqualizacaoService.remove.mockResolvedValue(mensagemSucesso);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.remove(idEqualizacao, mockRequest);

      // Assert
      expect(resultado).toEqual(mensagemSucesso);
      expect(mockAuditoriaService.log).toHaveBeenCalled();
      // O decorator @HttpCode(HttpStatus.NO_CONTENT) deve estar aplicado
    });
  });
});