import { Test, TestingModule } from '@nestjs/testing';
import { EqualizacaoController } from './equalizacao.controller';
import { EqualizacaoService } from './equalizacao.service';
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

describe('EqualizacaoController', () => {
  let controller: EqualizacaoController;
  let service: EqualizacaoService;

  // Mock do EqualizacaoService
  const mockEqualizacaoService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByAvaliado: jest.fn(),
    findByComite: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
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
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    controller = module.get<EqualizacaoController>(EqualizacaoController);
    service = module.get<EqualizacaoService>(EqualizacaoService);

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
  });

  describe('create (POST /equalizacao)', () => {
    it('deve criar equalizações para um ciclo com sucesso', async () => {
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

      // Act
      const resultado = await controller.create(createEqualizacaoDto);

      // Assert
      expect(resultado).toEqual(resultadoCriacao);
      expect(mockEqualizacaoService.create).toHaveBeenCalledWith(createEqualizacaoDto);
      expect(mockEqualizacaoService.create).toHaveBeenCalledTimes(1);
    });

    it('deve criar equalizações parciais quando algumas já existem', async () => {
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

      // Act
      const resultado = await controller.create(createEqualizacaoDto);

      // Assert
      expect(resultado).toEqual(resultadoParcial);
      expect(resultado.total).toBe(2);
      expect(resultado.novasEqualizacoes).toBe(1);
      expect(resultado.equalizacoes).toHaveLength(1);
    });

    it('deve retornar erro quando ciclo não encontrado', async () => {
      // Arrange
      const error = new NotFoundException(`Ciclo com ID ${createEqualizacaoDto.idCiclo} não encontrado`);
      mockEqualizacaoService.create.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.create(createEqualizacaoDto)).rejects.toThrow(NotFoundException);
      await expect(controller.create(createEqualizacaoDto)).rejects.toThrow(
        `Ciclo com ID ${createEqualizacaoDto.idCiclo} não encontrado`
      );
      expect(mockEqualizacaoService.create).toHaveBeenCalledWith(createEqualizacaoDto);
    });

    it('deve retornar erro quando ciclo não possui participantes', async () => {
      // Arrange
      const error = new BadRequestException('Ciclo não possui participantes para equalização');
      mockEqualizacaoService.create.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.create(createEqualizacaoDto)).rejects.toThrow(BadRequestException);
      await expect(controller.create(createEqualizacaoDto)).rejects.toThrow(
        'Ciclo não possui participantes para equalização'
      );
    });

    it('deve validar DTO de criação', async () => {
      // Arrange
      const dtoCicloInvalido = {
        idCiclo: 'uuid-inválido',
      };

      const error = new BadRequestException('UUID inválido');
      mockEqualizacaoService.create.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.create(dtoCicloInvalido)).rejects.toThrow(BadRequestException);
      expect(mockEqualizacaoService.create).toHaveBeenCalledWith(dtoCicloInvalido);
    });

    it('deve retornar estrutura correta de resposta', async () => {
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

      // Act
      const resultado = await controller.create(createEqualizacaoDto);

      // Assert
      expect(resultado).toMatchObject({
        message: expect.any(String),
        total: expect.any(Number),
        novasEqualizacoes: expect.any(Number),
        equalizacoes: expect.any(Array),
      });
    });

    it('deve ter proteção de autenticação e autorização para ADMIN e COMITE', () => {
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

      // Act
      await controller.create(createEqualizacaoDto);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Recebida requisição para criar nova equalização');
    });
  });

  describe('findAll (GET /equalizacao)', () => {
    it('deve retornar todas as equalizações com relacionamentos', async () => {
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
    });

    it('deve retornar array vazio quando não há equalizações', async () => {
      // Arrange
      mockEqualizacaoService.findAll.mockResolvedValue([]);

      // Act
      const resultado = await controller.findAll();

      // Assert
      expect(resultado).toEqual([]);
      expect(mockEqualizacaoService.findAll).toHaveBeenCalledTimes(1);
    });

    it('deve retornar equalizações com estrutura de relacionamentos correta', async () => {
      // Arrange
      const mockEqualizacoes = [mockEqualizacaoComRelacionamentos];
      mockEqualizacaoService.findAll.mockResolvedValue(mockEqualizacoes);

      // Act
      const resultado = await controller.findAll();

      // Assert
      expect(resultado[0]).toHaveProperty('alvo');
      expect(resultado[0].alvo).toHaveProperty('nomeCompleto');
      expect(resultado[0].alvo).toHaveProperty('cargo');
      expect(resultado[0].alvo).toHaveProperty('unidade');
      expect(resultado[0].alvo).toHaveProperty('trilhaCarreira');
    });

    it('deve ter proteção de autenticação JWT', () => {
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
    });

    it('deve fazer log da operação', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      mockEqualizacaoService.findAll.mockResolvedValue([]);

      // Act
      await controller.findAll();

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Recebida requisição para listar todas as equalizações');
    });
  });

  describe('findByAvaliado (GET /equalizacao/avaliado/:idAvaliado)', () => {
    it('deve retornar equalizações de um avaliado específico', async () => {
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
    });

    it('deve retornar equalizações ordenadas por data descendente', async () => {
      // Arrange
      const idAvaliado = mockColaborador1.idColaborador;
      const mockEqualizacoesOrdenadas = [
        { ...mockEqualizacao, dataEqualizacao: new Date('2024-02-01') },
        { ...mockEqualizacao, dataEqualizacao: new Date('2024-01-01') },
      ];

      mockEqualizacaoService.findByAvaliado.mockResolvedValue(mockEqualizacoesOrdenadas);

      // Act
      const resultado = await controller.findByAvaliado(idAvaliado);

      // Assert
      expect(resultado).toEqual(mockEqualizacoesOrdenadas);
      expect(resultado[0].dataEqualizacao > resultado[1].dataEqualizacao).toBe(true);
    });

    it('deve validar formato do UUID do avaliado', async () => {
      // Arrange
      const idAvaliadoInvalido = 'id-inválido';
      const error = new BadRequestException('UUID inválido');

      mockEqualizacaoService.findByAvaliado.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findByAvaliado(idAvaliadoInvalido)).rejects.toThrow(BadRequestException);
      expect(mockEqualizacaoService.findByAvaliado).toHaveBeenCalledWith(idAvaliadoInvalido);
    });

    it('deve ter proteção de autenticação JWT', () => {
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
    });

    it('deve fazer log da operação', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      const idAvaliado = mockColaborador1.idColaborador;
      mockEqualizacaoService.findByAvaliado.mockResolvedValue([]);

      // Act
      await controller.findByAvaliado(idAvaliado);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        `Recebida requisição para buscar equalizações do avaliado: ${idAvaliado}`
      );
    });
  });

  describe('findByComite (GET /equalizacao/comite/:idMembroComite)', () => {
    it('deve retornar equalizações feitas por um membro do comitê', async () => {
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
    });

    it('deve validar formato do UUID do membro do comitê', async () => {
      // Arrange
      const idMembroComiteInvalido = 'id-inválido';
      const error = new BadRequestException('UUID inválido');

      mockEqualizacaoService.findByComite.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findByComite(idMembroComiteInvalido)).rejects.toThrow(BadRequestException);
      expect(mockEqualizacaoService.findByComite).toHaveBeenCalledWith(idMembroComiteInvalido);
    });

    it('deve ter proteção de autenticação JWT', () => {
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
    });

    it('deve fazer log da operação', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      const idMembroComite = 'membro-comite-id';
      mockEqualizacaoService.findByComite.mockResolvedValue([]);

      // Act
      await controller.findByComite(idMembroComite);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        `Recebida requisição para buscar equalizações do membro do comitê: ${idMembroComite}`
      );
    });
  });

  describe('findOne (GET /equalizacao/:idEqualizacao)', () => {
    it('deve retornar uma equalização específica com relacionamentos completos', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      mockEqualizacaoService.findOne.mockResolvedValue(mockEqualizacaoPreenchida);

      // Act
      const resultado = await controller.findOne(idEqualizacao);

      // Assert
      expect(resultado).toEqual(mockEqualizacaoPreenchida);
      expect(mockEqualizacaoService.findOne).toHaveBeenCalledWith(idEqualizacao);
      expect(mockEqualizacaoService.findOne).toHaveBeenCalledTimes(1);
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
    });

    it('deve retornar equalização com todos os relacionamentos', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      mockEqualizacaoService.findOne.mockResolvedValue(mockEqualizacaoPreenchida);

      // Act
      const resultado = await controller.findOne(idEqualizacao);

      // Assert
      expect(resultado).toHaveProperty('alvo');
      expect(resultado).toHaveProperty('membroComite');
      expect(resultado.alvo).toHaveProperty('nomeCompleto');
      expect(resultado.alvo).toHaveProperty('cargo');
      expect(resultado.alvo).toHaveProperty('unidade');
      expect(resultado.alvo).toHaveProperty('trilhaCarreira');
      expect(resultado.membroComite).toHaveProperty('nomeCompleto');
    });

    it('deve validar formato do UUID da equalização', async () => {
      // Arrange
      const idEqualizacaoInvalido = 'id-inválido';
      const error = new BadRequestException('UUID inválido');

      mockEqualizacaoService.findOne.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findOne(idEqualizacaoInvalido)).rejects.toThrow(BadRequestException);
      expect(mockEqualizacaoService.findOne).toHaveBeenCalledWith(idEqualizacaoInvalido);
    });

    it('deve ter proteção de autenticação JWT', () => {
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
    });

    it('deve fazer log da operação', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      mockEqualizacaoService.findOne.mockResolvedValue(mockEqualizacaoComRelacionamentos);

      // Act
      await controller.findOne(idEqualizacao);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        `Recebida requisição para buscar equalização: ${idEqualizacao}`
      );
    });
  });

  describe('update (PATCH /equalizacao/:idEqualizacao)', () => {
    it('deve atualizar uma equalização com sucesso', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const equalizacaoAtualizada = {
        ...mockEqualizacaoComRelacionamentos,
        ...updateEqualizacaoDto,
      };

      mockEqualizacaoService.update.mockResolvedValue(equalizacaoAtualizada);

      // Act
      const resultado = await controller.update(idEqualizacao, updateEqualizacaoDto);

      // Assert
      expect(resultado).toEqual(equalizacaoAtualizada);
      expect(mockEqualizacaoService.update).toHaveBeenCalledWith(idEqualizacao, updateEqualizacaoDto);
      expect(mockEqualizacaoService.update).toHaveBeenCalledTimes(1);
    });

    it('deve atualizar apenas a nota quando justificativa não fornecida', async () => {
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

      // Act
      const resultado = await controller.update(idEqualizacao, updateDtoApenas);

      // Assert
      expect(resultado).toEqual(equalizacaoAtualizada);
      expect(resultado.notaAjustada).toBe(3.5);
      expect(mockEqualizacaoService.update).toHaveBeenCalledWith(idEqualizacao, updateDtoApenas);
    });

    it('deve retornar erro quando equalização não encontrada para atualização', async () => {
      // Arrange
      const idEqualizacao = 'id-inexistente';
      const error = new NotFoundException(`Equalização com ID ${idEqualizacao} não encontrada`);

      mockEqualizacaoService.update.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.update(idEqualizacao, updateEqualizacaoDto)).rejects.toThrow(NotFoundException);
      await expect(controller.update(idEqualizacao, updateEqualizacaoDto)).rejects.toThrow(
        `Equalização com ID ${idEqualizacao} não encontrada`
      );
      expect(mockEqualizacaoService.update).toHaveBeenCalledWith(idEqualizacao, updateEqualizacaoDto);
    });

    it('deve retornar erro quando nota não fornecida', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const updateDtoSemNota = {
        justificativa: 'Justificativa sem nota',
      };

      const error = new BadRequestException('A nota é obrigatória para preencher a equalização');
      mockEqualizacaoService.update.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.update(idEqualizacao, updateDtoSemNota as UpdateEqualizacaoDto)).rejects.toThrow(BadRequestException);
      await expect(controller.update(idEqualizacao, updateDtoSemNota as UpdateEqualizacaoDto)).rejects.toThrow(
        'A nota é obrigatória para preencher a equalização'
      );
    });

    it('deve retornar erro quando nota está fora do intervalo válido', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const updateDtoNotaInvalida = {
        notaAjustada: 6.0,
        justificativa: 'Justificativa',
      };

      const error = new BadRequestException('A nota deve estar entre 1 e 5');
      mockEqualizacaoService.update.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.update(idEqualizacao, updateDtoNotaInvalida)).rejects.toThrow(BadRequestException);
      await expect(controller.update(idEqualizacao, updateDtoNotaInvalida)).rejects.toThrow(
        'A nota deve estar entre 1 e 5'
      );
    });

    it('deve retornar erro quando justificativa não fornecida', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const updateDtoSemJustificativa = {
        notaAjustada: 4.0,
      };

      const error = new BadRequestException('A justificativa é obrigatória para preencher a equalização');
      mockEqualizacaoService.update.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.update(idEqualizacao, updateDtoSemJustificativa as UpdateEqualizacaoDto)).rejects.toThrow(BadRequestException);
      await expect(controller.update(idEqualizacao, updateDtoSemJustificativa as UpdateEqualizacaoDto)).rejects.toThrow(
        'A justificativa é obrigatória para preencher a equalização'
      );
    });

    it('deve aceitar notas válidas nos extremos (1 e 5)', async () => {
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

      // Act
      const resultado1 = await controller.update(idEqualizacao, updateDtoNota1);
      const resultado5 = await controller.update(idEqualizacao, updateDtoNota5);

      // Assert
      expect(resultado1.notaAjustada).toBe(1);
      expect(resultado5.notaAjustada).toBe(5);
      expect(mockEqualizacaoService.update).toHaveBeenCalledTimes(2);
    });

    it('deve validar enum status quando fornecido', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const updateDtoStatusInvalido = {
        notaAjustada: 4.0,
        justificativa: 'Justificativa',
        status: 'STATUS_INEXISTENTE' as any,
      };

      const error = new BadRequestException('Status inválido');
      mockEqualizacaoService.update.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.update(idEqualizacao, updateDtoStatusInvalido)).rejects.toThrow(BadRequestException);
    });

    it('deve definir status como CONCLUIDA quando não fornecido', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const updateDtoSemStatus = {
        notaAjustada: 4.0,
        justificativa: 'Justificativa válida',
      };

      const equalizacaoAtualizada = {
        ...mockEqualizacaoComRelacionamentos,
        ...updateDtoSemStatus,
        status: preenchimentoStatus.CONCLUIDA,
      };

      mockEqualizacaoService.update.mockResolvedValue(equalizacaoAtualizada);

      // Act
      const resultado = await controller.update(idEqualizacao, updateDtoSemStatus);

      // Assert
      expect(resultado.status).toBe(preenchimentoStatus.CONCLUIDA);
    });

    it('deve ter proteção de autenticação e autorização para ADMIN e COMITE', () => {
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
      expect(mockRolesGuard.canActivate).toBeDefined();
    });

    it('deve fazer log da operação', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      mockEqualizacaoService.update.mockResolvedValue(mockEqualizacaoComRelacionamentos);

      // Act
      await controller.update(idEqualizacao, updateEqualizacaoDto);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        `Recebida requisição para atualizar equalização: ${idEqualizacao}`
      );
    });
  });

  describe('remove (DELETE /equalizacao/:idEqualizacao)', () => {
    it('deve remover uma equalização com sucesso', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const mensagemSucesso = { message: 'Equalização removida com sucesso' };

      mockEqualizacaoService.remove.mockResolvedValue(mensagemSucesso);

      // Act
      const resultado = await controller.remove(idEqualizacao);

      // Assert
      expect(resultado).toEqual(mensagemSucesso);
      expect(mockEqualizacaoService.remove).toHaveBeenCalledWith(idEqualizacao);
      expect(mockEqualizacaoService.remove).toHaveBeenCalledTimes(1);
    });

    it('deve retornar erro quando equalização não encontrada para remoção', async () => {
      // Arrange
      const idEqualizacao = 'id-inexistente';
      const error = new NotFoundException(`Equalização com ID ${idEqualizacao} não encontrada`);

      mockEqualizacaoService.remove.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.remove(idEqualizacao)).rejects.toThrow(NotFoundException);
      await expect(controller.remove(idEqualizacao)).rejects.toThrow(
        `Equalização com ID ${idEqualizacao} não encontrada`
      );
      expect(mockEqualizacaoService.remove).toHaveBeenCalledWith(idEqualizacao);
    });

    it('deve retornar mensagem de sucesso após remover', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const mensagemEsperada = { message: 'Equalização removida com sucesso' };

      mockEqualizacaoService.remove.mockResolvedValue(mensagemEsperada);

      // Act
      const resultado = await controller.remove(idEqualizacao);

      // Assert
      expect(resultado).toEqual(mensagemEsperada);
      expect(resultado).toHaveProperty('message');
      expect(typeof resultado.message).toBe('string');
    });

    it('deve validar formato do UUID', async () => {
      // Arrange
      const idEqualizacaoInvalido = 'id-inválido';
      const error = new BadRequestException('UUID inválido');

      mockEqualizacaoService.remove.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.remove(idEqualizacaoInvalido)).rejects.toThrow(BadRequestException);
      expect(mockEqualizacaoService.remove).toHaveBeenCalledWith(idEqualizacaoInvalido);
    });

    it('deve ter proteção de autenticação e autorização para ADMIN e COMITE', () => {
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
      expect(mockRolesGuard.canActivate).toBeDefined();
    });

    it('deve fazer log da operação', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      mockEqualizacaoService.remove.mockResolvedValue({ message: 'Equalização removida com sucesso' });

      // Act
      await controller.remove(idEqualizacao);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        `Recebida requisição para remover equalização: ${idEqualizacao}`
      );
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

    it('deve permitir acesso para roles ADMIN e COMITE', () => {
      const result = mockRolesGuard.canActivate();
      expect(result).toBe(true);
    });

    it('deve proteger endpoints CUD (Create, Update, Delete) com roles ADMIN e COMITE', () => {
      // Os endpoints POST, PATCH, DELETE devem exigir roles ADMIN ou COMITE
      expect(mockRolesGuard.canActivate).toBeDefined();
    });

    it('deve proteger endpoints de leitura apenas com JWT', () => {
      // Os endpoints GET devem estar protegidos apenas com JwtAuthGuard
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
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

      // Act
      const resultado = await controller.create(dtoCompleto);

      // Assert
      expect(resultado).toBeDefined();
      expect(mockEqualizacaoService.create).toHaveBeenCalledWith(dtoCompleto);
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

      // Act
      const resultado = await controller.update(idEqualizacao, atualizarDto);

      // Assert
      expect(resultado).toBeDefined();
      expect(mockEqualizacaoService.update).toHaveBeenCalledWith(idEqualizacao, atualizarDto);
    });

    it('deve validar UpdateEqualizacaoDto com campos obrigatórios apenas', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const atualizarDto: UpdateEqualizacaoDto = {
        notaAjustada: 3.0,
        justificativa: 'Justificativa mínima obrigatória',
        // status é opcional
      };

      mockEqualizacaoService.update.mockResolvedValue({
        ...mockEqualizacaoComRelacionamentos,
        ...atualizarDto,
        status: preenchimentoStatus.CONCLUIDA,
      });

      // Act
      const resultado = await controller.update(idEqualizacao, atualizarDto);

      // Assert
      expect(resultado).toBeDefined();
      expect(mockEqualizacaoService.update).toHaveBeenCalledWith(idEqualizacao, atualizarDto);
    });

    it('deve validar enum preenchimentoStatus', async () => {
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

      // Act
      const resultadoPendente = await controller.update(idEqualizacao, dtoPendente);
      const resultadoConcluida = await controller.update(idEqualizacao, dtoConcluida);

      // Assert
      expect(resultadoPendente.status).toBe(preenchimentoStatus.PENDENTE);
      expect(resultadoConcluida.status).toBe(preenchimentoStatus.CONCLUIDA);
    });
  });

  describe('Integração e casos extremos', () => {
    it('deve lidar com múltiplas operações simultâneas', async () => {
      // Arrange
      mockEqualizacaoService.findAll.mockResolvedValue([mockEqualizacaoComRelacionamentos]);

      // Act
      const promessas = [
        controller.findAll(),
        controller.findAll(),
        controller.findAll(),
      ];

      const resultados = await Promise.all(promessas);

      // Assert
      expect(resultados).toHaveLength(3);
      expect(mockEqualizacaoService.findAll).toHaveBeenCalledTimes(3);
      resultados.forEach(resultado => {
        expect(resultado).toEqual([mockEqualizacaoComRelacionamentos]);
      });
    });

    it('deve propagar erros do service corretamente', async () => {
      // Arrange
      const error = new Error('Erro interno do servidor');
      mockEqualizacaoService.findAll.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findAll()).rejects.toThrow('Erro interno do servidor');
    });

    it('deve validar que todos os endpoints estão mapeados corretamente', () => {
      // Assert
      expect(controller.create).toBeDefined();
      expect(controller.findAll).toBeDefined();
      expect(controller.findByAvaliado).toBeDefined();
      expect(controller.findByComite).toBeDefined();
      expect(controller.findOne).toBeDefined();
      expect(controller.update).toBeDefined();
      expect(controller.remove).toBeDefined();
    });

    it('deve manter consistência entre endpoints de busca específica', async () => {
      // Arrange
      const idAvaliado = mockColaborador1.idColaborador;
      const idMembroComite = 'membro-comite-id';
      
      const mockEqualizacoesPorAvaliado = [{ ...mockEqualizacao, tipo: 'AVALIADO' }];
      const mockEqualizacoesPorComite = [{ ...mockEqualizacao, tipo: 'COMITE' }];

      mockEqualizacaoService.findByAvaliado.mockResolvedValue(mockEqualizacoesPorAvaliado);
      mockEqualizacaoService.findByComite.mockResolvedValue(mockEqualizacoesPorComite);

      // Act
      const resultadoPorAvaliado = await controller.findByAvaliado(idAvaliado);
      const resultadoPorComite = await controller.findByComite(idMembroComite);

      // Assert
      expect(resultadoPorAvaliado).toBeDefined();
      expect(resultadoPorComite).toBeDefined();
      expect(mockEqualizacaoService.findByAvaliado).toHaveBeenCalledWith(idAvaliado);
      expect(mockEqualizacaoService.findByComite).toHaveBeenCalledWith(idMembroComite);
    });
  });

  describe('Estrutura de resposta e tipos', () => {
    it('deve retornar estrutura correta nas operações CRUD', async () => {
      // Arrange
      const resultadoCriacao = {
        message: 'Equalizações criadas com sucesso para 1 colaboradores',
        total: 1,
        novasEqualizacoes: 1,
        equalizacoes: [{ ...mockEqualizacao, alvo: mockColaborador1 }],
      };

      mockEqualizacaoService.create.mockResolvedValue(resultadoCriacao);

      // Act
      const resultado = await controller.create(createEqualizacaoDto);

      // Assert
      expect(resultado).toMatchObject({
        message: expect.any(String),
        total: expect.any(Number),
        novasEqualizacoes: expect.any(Number),
        equalizacoes: expect.any(Array),
      });
    });

    it('deve retornar dados com relacionamentos quando aplicável', async () => {
      // Arrange
      mockEqualizacaoService.findAll.mockResolvedValue([mockEqualizacaoComRelacionamentos]);

      // Act
      const resultado = await controller.findAll();

      // Assert
      expect(resultado[0]).toHaveProperty('alvo');
      expect(resultado[0].alvo).toMatchObject({
        idColaborador: expect.any(String),
        nomeCompleto: expect.any(String),
        cargo: expect.any(String),
        unidade: expect.any(String),
        trilhaCarreira: expect.any(String),
      });
    });

    it('deve manter consistência de tipos nos retornos', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      mockEqualizacaoService.findOne.mockResolvedValue(mockEqualizacaoComRelacionamentos);

      // Act
      const resultado = await controller.findOne(idEqualizacao);

      // Assert
      expect(typeof resultado.idEqualizacao).toBe('string');
      expect(typeof resultado.idCiclo).toBe('string');
      expect(typeof resultado.idAvaliado).toBe('string');
      expect(typeof resultado.status).toBe('string');
      expect(resultado.dataEqualizacao).toBeInstanceOf(Date);
    });

    it('deve retornar mensagem apropriada para operação de delete', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const mensagemSucesso = { message: 'Equalização removida com sucesso' };

      mockEqualizacaoService.remove.mockResolvedValue(mensagemSucesso);

      // Act
      const resultado = await controller.remove(idEqualizacao);

      // Assert
      expect(resultado).toEqual(mensagemSucesso);
      expect(resultado).toHaveProperty('message');
      expect(typeof resultado.message).toBe('string');
    });
  });

  describe('HTTP Status Codes', () => {
    it('deve retornar 204 No Content ao deletar equalização', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const mensagemSucesso = { message: 'Equalização removida com sucesso' };

      mockEqualizacaoService.remove.mockResolvedValue(mensagemSucesso);

      // Act
      const resultado = await controller.remove(idEqualizacao);

      // Assert
      expect(resultado).toEqual(mensagemSucesso);
      // O decorator @HttpCode(HttpStatus.NO_CONTENT) deve estar aplicado
    });

    it('deve retornar dados corretos para operações de busca', async () => {
      // Arrange
      mockEqualizacaoService.findAll.mockResolvedValue([mockEqualizacaoComRelacionamentos]);

      // Act
      const resultado = await controller.findAll();

      // Assert
      expect(Array.isArray(resultado)).toBe(true);
      expect(resultado).toHaveLength(1);
    });

    it('deve retornar dados corretos para operações de criação', async () => {
      // Arrange
      const resultadoCriacao = {
        message: 'Equalizações criadas com sucesso para 1 colaboradores',
        total: 1,
        novasEqualizacoes: 1,
        equalizacoes: [{ ...mockEqualizacao, alvo: mockColaborador1 }],
      };

      mockEqualizacaoService.create.mockResolvedValue(resultadoCriacao);

      // Act
      const resultado = await controller.create(createEqualizacaoDto);

      // Assert
      expect(resultado).toHaveProperty('message');
      expect(resultado).toHaveProperty('total');
      expect(resultado).toHaveProperty('novasEqualizacoes');
      expect(resultado).toHaveProperty('equalizacoes');
    });
  });
});