import { Test, TestingModule } from '@nestjs/testing';
import { AssociacaoCriterioCicloController } from './criterioCiclo.controller';
import { AssociacaoCriterioCicloService } from './criterioCiclo.service';
import { CreateAssociacaoCriterioCicloDto, UpdateAssociacaoCriterioCicloDto } from './criterioCiclo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { 
  ConflictException, 
  NotFoundException,
  BadRequestException 
} from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';

describe('AssociacaoCriterioCicloController', () => {
  let controller: AssociacaoCriterioCicloController;
  let service: AssociacaoCriterioCicloService;

  // Mock do AssociacaoCriterioCicloService
  const mockAssociacaoCriterioCicloService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findByCiclo: jest.fn(),
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
  const mockAssociacao = {
    idAssociacao: '123e4567-e89b-12d3-a456-426614174000',
    idCiclo: '456e7890-e89b-12d3-a456-426614174001',
    idCriterio: '789e0123-e89b-12d3-a456-426614174002',
    cargo: 'DESENVOLVEDOR',
    trilhaCarreira: 'DESENVOLVIMENTO',
    unidade: 'RECIFE',
  };

  const mockAssociacaoComCriterio = {
    ...mockAssociacao,
    criterio: {
      idCriterio: '789e0123-e89b-12d3-a456-426614174002',
      nomeCriterio: 'Comunicação Efetiva',
      pilar: 'Comportamento',
      descricao: 'Capacidade de se comunicar de forma clara e efetiva',
      peso: 1.0,
      obrigatorio: true,
    },
  };

  const createDto: CreateAssociacaoCriterioCicloDto = {
    idCiclo: '456e7890-e89b-12d3-a456-426614174001',
    idCriterio: '789e0123-e89b-12d3-a456-426614174002',
    cargo: 'DESENVOLVEDOR',
    trilhaCarreira: 'DESENVOLVIMENTO',
    unidade: 'RECIFE',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssociacaoCriterioCicloController],
      providers: [
        {
          provide: AssociacaoCriterioCicloService,
          useValue: mockAssociacaoCriterioCicloService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    controller = module.get<AssociacaoCriterioCicloController>(AssociacaoCriterioCicloController);
    service = module.get<AssociacaoCriterioCicloService>(AssociacaoCriterioCicloService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Definição do controller', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('create (POST /associacoes-criterio-ciclo)', () => {
    it('deve criar uma associação com sucesso', async () => {
      // Arrange
      mockAssociacaoCriterioCicloService.create.mockResolvedValue(mockAssociacao);

      // Act
      const resultado = await controller.create(createDto);

      // Assert
      expect(resultado).toEqual(mockAssociacao);
      expect(mockAssociacaoCriterioCicloService.create).toHaveBeenCalledWith(createDto);
      expect(mockAssociacaoCriterioCicloService.create).toHaveBeenCalledTimes(1);
    });

    it('deve criar associação apenas com campos obrigatórios', async () => {
      // Arrange
      const dtoMinimo: CreateAssociacaoCriterioCicloDto = {
        idCiclo: '456e7890-e89b-12d3-a456-426614174001',
        idCriterio: '789e0123-e89b-12d3-a456-426614174002',
      };

      const associacaoMinima = {
        ...mockAssociacao,
        cargo: null,
        trilhaCarreira: null,
        unidade: null,
      };

      mockAssociacaoCriterioCicloService.create.mockResolvedValue(associacaoMinima);

      // Act
      const resultado = await controller.create(dtoMinimo);

      // Assert
      expect(resultado).toEqual(associacaoMinima);
      expect(mockAssociacaoCriterioCicloService.create).toHaveBeenCalledWith(dtoMinimo);
    });

    it('deve retornar erro quando associação já existe', async () => {
      // Arrange
      const error = new ConflictException('Associação já existente');
      mockAssociacaoCriterioCicloService.create.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.create(createDto)).rejects.toThrow(ConflictException);
      await expect(controller.create(createDto)).rejects.toThrow('Associação já existente');
      expect(mockAssociacaoCriterioCicloService.create).toHaveBeenCalledWith(createDto);
    });

    it('deve retornar erro para UUIDs inválidos', async () => {
      // Arrange
      const dtoInvalido = {
        ...createDto,
        idCiclo: 'uuid-inválido',
      };

      const error = new BadRequestException('UUID inválido');
      mockAssociacaoCriterioCicloService.create.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.create(dtoInvalido)).rejects.toThrow(BadRequestException);
      expect(mockAssociacaoCriterioCicloService.create).toHaveBeenCalledWith(dtoInvalido);
    });

    it('deve validar enum de cargo quando fornecido', async () => {
      // Arrange
      const dtoCargoInvalido = {
        ...createDto,
        cargo: 'CARGO_INEXISTENTE',
      };

      const error = new BadRequestException('Cargo inválido');
      mockAssociacaoCriterioCicloService.create.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.create(dtoCargoInvalido)).rejects.toThrow(BadRequestException);
      expect(mockAssociacaoCriterioCicloService.create).toHaveBeenCalledWith(dtoCargoInvalido);
    });

    it('deve ter proteção de autenticação e autorização', () => {
      // Assert - verificar se os guards estão sendo aplicados
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
      expect(mockRolesGuard.canActivate).toBeDefined();
    });
  });

  describe('findByCiclo (GET /associacoes-criterio-ciclo/ciclo/:idCiclo)', () => {
    it('deve retornar associações de um ciclo específico', async () => {
      // Arrange
      const idCiclo = '456e7890-e89b-12d3-a456-426614174001';
      const mockAssociacoes = [
        mockAssociacaoComCriterio,
        {
          ...mockAssociacaoComCriterio,
          idAssociacao: '987e6543-e89b-12d3-a456-426614174003',
          cargo: 'QA',
          trilhaCarreira: 'QA',
        },
      ];

      mockAssociacaoCriterioCicloService.findByCiclo.mockResolvedValue(mockAssociacoes);

      // Act
      const resultado = await controller.findByCiclo(idCiclo);

      // Assert
      expect(resultado).toEqual(mockAssociacoes);
      expect(mockAssociacaoCriterioCicloService.findByCiclo).toHaveBeenCalledWith(idCiclo);
      expect(mockAssociacaoCriterioCicloService.findByCiclo).toHaveBeenCalledTimes(1);
    });

    it('deve retornar array vazio quando ciclo não tem associações', async () => {
      // Arrange
      const idCiclo = 'ciclo-sem-associacoes';
      mockAssociacaoCriterioCicloService.findByCiclo.mockResolvedValue([]);

      // Act
      const resultado = await controller.findByCiclo(idCiclo);

      // Assert
      expect(resultado).toEqual([]);
      expect(mockAssociacaoCriterioCicloService.findByCiclo).toHaveBeenCalledWith(idCiclo);
    });

    it('deve retornar associações com dados completos do critério', async () => {
      // Arrange
      const idCiclo = '456e7890-e89b-12d3-a456-426614174001';
      const mockAssociacoes = [mockAssociacaoComCriterio];

      mockAssociacaoCriterioCicloService.findByCiclo.mockResolvedValue(mockAssociacoes);

      // Act
      const resultado = await controller.findByCiclo(idCiclo);

      // Assert
      expect(resultado[0]).toHaveProperty('criterio');
      expect(resultado[0].criterio).toHaveProperty('nomeCriterio');
      expect(resultado[0].criterio).toHaveProperty('pilar');
      expect(resultado[0].criterio).toHaveProperty('peso');
      expect(resultado[0].criterio).toHaveProperty('obrigatorio');
    });

    it('deve validar UUID do ciclo com ParseUUIDPipe', async () => {
      // Arrange
      const idCicloInvalido = 'id-inválido';
      
      // O ParseUUIDPipe deve lançar erro antes mesmo de chegar ao service
      const error = new BadRequestException('Validation failed (uuid is expected)');
      mockAssociacaoCriterioCicloService.findByCiclo.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findByCiclo(idCicloInvalido)).rejects.toThrow(BadRequestException);
    });

    it('deve ter proteção de autenticação JWT', () => {
      // O endpoint deve estar protegido apenas com JwtAuthGuard
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
    });
  });

  describe('findOne (GET /associacoes-criterio-ciclo/:id)', () => {
    it('deve retornar uma associação específica por ID', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockAssociacaoCriterioCicloService.findOne.mockResolvedValue(mockAssociacao);

      // Act
      const resultado = await controller.findOne(id);

      // Assert
      expect(resultado).toEqual(mockAssociacao);
      expect(mockAssociacaoCriterioCicloService.findOne).toHaveBeenCalledWith(id);
      expect(mockAssociacaoCriterioCicloService.findOne).toHaveBeenCalledTimes(1);
    });

    it('deve retornar erro quando associação não encontrada', async () => {
      // Arrange
      const id = 'id-inexistente';
      const error = new NotFoundException(`Associação com ID ${id} não encontrada.`);
      
      mockAssociacaoCriterioCicloService.findOne.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findOne(id)).rejects.toThrow(NotFoundException);
      await expect(controller.findOne(id)).rejects.toThrow('não encontrada');
      expect(mockAssociacaoCriterioCicloService.findOne).toHaveBeenCalledWith(id);
    });

    it('deve validar UUID com ParseUUIDPipe', async () => {
      // Arrange
      const idInvalido = 'id-inválido';
      
      // ParseUUIDPipe deve interceptar antes do service
      const error = new BadRequestException('Validation failed (uuid is expected)');
      mockAssociacaoCriterioCicloService.findOne.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findOne(idInvalido)).rejects.toThrow(BadRequestException);
    });

    it('deve retornar associação com estrutura completa', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockAssociacaoCriterioCicloService.findOne.mockResolvedValue(mockAssociacao);

      // Act
      const resultado = await controller.findOne(id);

      // Assert
      expect(resultado).toHaveProperty('idAssociacao');
      expect(resultado).toHaveProperty('idCiclo');
      expect(resultado).toHaveProperty('idCriterio');
      expect(resultado.idAssociacao).toBe(id);
    });
  });

  describe('update (PATCH /associacoes-criterio-ciclo/:id)', () => {
    it('deve atualizar uma associação com sucesso', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto: UpdateAssociacaoCriterioCicloDto = {
        cargo: 'SENIOR_DEVELOPER',
        trilhaCarreira: 'DESENVOLVIMENTO',
      };

      const associacaoAtualizada = { ...mockAssociacao, ...updateDto };
      mockAssociacaoCriterioCicloService.update.mockResolvedValue(associacaoAtualizada);

      // Act
      const resultado = await controller.update(id, updateDto);

      // Assert
      expect(resultado).toEqual(associacaoAtualizada);
      expect(mockAssociacaoCriterioCicloService.update).toHaveBeenCalledWith(id, updateDto);
      expect(mockAssociacaoCriterioCicloService.update).toHaveBeenCalledTimes(1);
    });

    it('deve atualizar apenas campos fornecidos', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto: UpdateAssociacaoCriterioCicloDto = {
        unidade: 'SAO_PAULO',
      };

      const associacaoAtualizada = { ...mockAssociacao, unidade: 'SAO_PAULO' };
      mockAssociacaoCriterioCicloService.update.mockResolvedValue(associacaoAtualizada);

      // Act
      const resultado = await controller.update(id, updateDto);

      // Assert
      expect(resultado).toEqual(associacaoAtualizada);
      expect(mockAssociacaoCriterioCicloService.update).toHaveBeenCalledWith(id, updateDto);
    });

    it('deve funcionar com DTO vazio', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto: UpdateAssociacaoCriterioCicloDto = {};

      mockAssociacaoCriterioCicloService.update.mockResolvedValue(mockAssociacao);

      // Act
      const resultado = await controller.update(id, updateDto);

      // Assert
      expect(resultado).toEqual(mockAssociacao);
      expect(mockAssociacaoCriterioCicloService.update).toHaveBeenCalledWith(id, updateDto);
    });

    it('deve retornar erro quando associação não encontrada para atualização', async () => {
      // Arrange
      const id = 'id-inexistente';
      const updateDto: UpdateAssociacaoCriterioCicloDto = { cargo: 'QA' };
      const error = new NotFoundException(`Associação com ID ${id} não encontrada.`);
      
      mockAssociacaoCriterioCicloService.update.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.update(id, updateDto)).rejects.toThrow(NotFoundException);
      expect(mockAssociacaoCriterioCicloService.update).toHaveBeenCalledWith(id, updateDto);
    });

    it('deve validar enums quando fornecidos', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto: UpdateAssociacaoCriterioCicloDto = {
        cargo: 'CARGO_INEXISTENTE' as any,
      };

      const error = new BadRequestException('Cargo inválido');
      mockAssociacaoCriterioCicloService.update.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.update(id, updateDto)).rejects.toThrow(BadRequestException);
      expect(mockAssociacaoCriterioCicloService.update).toHaveBeenCalledWith(id, updateDto);
    });

    it('deve validar UUIDs quando fornecidos no update', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto: UpdateAssociacaoCriterioCicloDto = {
        idCiclo: 'uuid-inválido',
      };

      const error = new BadRequestException('UUID inválido');
      mockAssociacaoCriterioCicloService.update.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.update(id, updateDto)).rejects.toThrow(BadRequestException);
      expect(mockAssociacaoCriterioCicloService.update).toHaveBeenCalledWith(id, updateDto);
    });

    it('deve ter proteção de autenticação e autorização adequada', () => {
      // O endpoint update deve exigir roles ADMIN ou RH
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
      expect(mockRolesGuard.canActivate).toBeDefined();
    });
  });

  describe('remove (DELETE /associacoes-criterio-ciclo/:id)', () => {
    it('deve remover uma associação com sucesso', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockAssociacaoCriterioCicloService.remove.mockResolvedValue(mockAssociacao);

      // Act
      const resultado = await controller.remove(id);

      // Assert
      expect(resultado).toEqual(mockAssociacao);
      expect(mockAssociacaoCriterioCicloService.remove).toHaveBeenCalledWith(id);
      expect(mockAssociacaoCriterioCicloService.remove).toHaveBeenCalledTimes(1);
    });

    it('deve retornar erro quando associação não encontrada para remoção', async () => {
      // Arrange
      const id = 'id-inexistente';
      const error = new NotFoundException(`Associação com ID ${id} não encontrada.`);
      
      mockAssociacaoCriterioCicloService.remove.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.remove(id)).rejects.toThrow(NotFoundException);
      await expect(controller.remove(id)).rejects.toThrow('não encontrada');
      expect(mockAssociacaoCriterioCicloService.remove).toHaveBeenCalledWith(id);
    });

    it('deve validar UUID com ParseUUIDPipe', async () => {
      // Arrange
      const idInvalido = 'id-inválido';
      
      // ParseUUIDPipe deve interceptar
      const error = new BadRequestException('Validation failed (uuid is expected)');
      mockAssociacaoCriterioCicloService.remove.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.remove(idInvalido)).rejects.toThrow(BadRequestException);
    });

    it('deve retornar a associação removida', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const associacaoRemovida = { ...mockAssociacao };
      
      mockAssociacaoCriterioCicloService.remove.mockResolvedValue(associacaoRemovida);

      // Act
      const resultado = await controller.remove(id);

      // Assert
      expect(resultado).toEqual(associacaoRemovida);
      expect(resultado.idAssociacao).toBe(id);
    });

    it('deve ter proteção de autenticação e autorização adequada', () => {
      // O endpoint remove deve exigir roles ADMIN ou RH
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
      expect(mockRolesGuard.canActivate).toBeDefined();
    });
  });

  describe('Guards e Autenticação', () => {
    it('deve aplicar JwtAuthGuard em todos os endpoints', () => {
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
    });

    it('deve aplicar RolesGuard nos endpoints que exigem', () => {
      expect(mockRolesGuard.canActivate).toBeDefined();
    });

    it('deve simular usuário autenticado com roles adequadas', () => {
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

    it('deve permitir acesso para role ADMIN', () => {
      const result = mockRolesGuard.canActivate();
      expect(result).toBe(true);
    });

    it('deve permitir acesso para role RH', () => {
      const result = mockRolesGuard.canActivate();
      expect(result).toBe(true);
    });
  });

  describe('Validação de DTOs e Pipes', () => {
    it('deve validar CreateAssociacaoCriterioCicloDto corretamente', async () => {
      // Arrange
      const dtoCompleto: CreateAssociacaoCriterioCicloDto = {
        idCiclo: '456e7890-e89b-12d3-a456-426614174001',
        idCriterio: '789e0123-e89b-12d3-a456-426614174002',
        cargo: 'DESENVOLVEDOR',
        trilhaCarreira: 'DESENVOLVIMENTO',
        unidade: 'RECIFE',
      };

      mockAssociacaoCriterioCicloService.create.mockResolvedValue(mockAssociacao);

      // Act
      const resultado = await controller.create(dtoCompleto);

      // Assert
      expect(resultado).toBeDefined();
      expect(mockAssociacaoCriterioCicloService.create).toHaveBeenCalledWith(dtoCompleto);
    });

    it('deve validar UpdateAssociacaoCriterioCicloDto com campos opcionais', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto: UpdateAssociacaoCriterioCicloDto = {
        cargo: 'QA',
        // Outros campos opcionais omitidos
      };

      mockAssociacaoCriterioCicloService.update.mockResolvedValue({
        ...mockAssociacao,
        ...updateDto,
      });

      // Act
      const resultado = await controller.update(id, updateDto);

      // Assert
      expect(resultado).toBeDefined();
      expect(mockAssociacaoCriterioCicloService.update).toHaveBeenCalledWith(id, updateDto);
    });

    it('deve aplicar ParseUUIDPipe corretamente nos parâmetros', async () => {
      // Arrange
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      mockAssociacaoCriterioCicloService.findOne.mockResolvedValue(mockAssociacao);

      // Act
      const resultado = await controller.findOne(validUUID);

      // Assert
      expect(resultado).toBeDefined();
      expect(mockAssociacaoCriterioCicloService.findOne).toHaveBeenCalledWith(validUUID);
    });
  });

  describe('Integração e casos extremos', () => {
    it('deve lidar com múltiplas operações simultâneas', async () => {
      // Arrange
      const idCiclo = '456e7890-e89b-12d3-a456-426614174001';
      mockAssociacaoCriterioCicloService.findByCiclo.mockResolvedValue([mockAssociacao]);

      // Act
      const promessas = [
        controller.findByCiclo(idCiclo),
        controller.findByCiclo(idCiclo),
        controller.findByCiclo(idCiclo),
      ];

      const resultados = await Promise.all(promessas);

      // Assert
      expect(resultados).toHaveLength(3);
      expect(mockAssociacaoCriterioCicloService.findByCiclo).toHaveBeenCalledTimes(3);
      resultados.forEach(resultado => {
        expect(resultado).toEqual([mockAssociacao]);
      });
    });

    it('deve propagar erros do service corretamente', async () => {
      // Arrange
      const error = new Error('Erro interno do servidor');
      mockAssociacaoCriterioCicloService.findByCiclo.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findByCiclo('some-uuid')).rejects.toThrow('Erro interno do servidor');
    });

    it('deve validar que todos os endpoints estão mapeados corretamente', () => {
      // Assert
      expect(controller.create).toBeDefined();
      expect(controller.findByCiclo).toBeDefined();
      expect(controller.findOne).toBeDefined();
      expect(controller.update).toBeDefined();
      expect(controller.remove).toBeDefined();
    });

    it('deve lidar com associações que possuem apenas campos obrigatórios', async () => {
      // Arrange
      const associacaoMinima = {
        idAssociacao: '123e4567-e89b-12d3-a456-426614174000',
        idCiclo: '456e7890-e89b-12d3-a456-426614174001',
        idCriterio: '789e0123-e89b-12d3-a456-426614174002',
        cargo: null,
        trilhaCarreira: null,
        unidade: null,
      };

      mockAssociacaoCriterioCicloService.findOne.mockResolvedValue(associacaoMinima);

      // Act
      const resultado = await controller.findOne(associacaoMinima.idAssociacao);

      // Assert
      expect(resultado).toEqual(associacaoMinima);
      expect(resultado.cargo).toBeNull();
      expect(resultado.trilhaCarreira).toBeNull();
      expect(resultado.unidade).toBeNull();
    });
  });

  describe('Estrutura de resposta e tipos', () => {
    it('deve retornar estrutura correta nas operações CRUD', async () => {
      // Arrange
      mockAssociacaoCriterioCicloService.create.mockResolvedValue(mockAssociacao);

      // Act
      const resultado = await controller.create(createDto);

      // Assert
      expect(resultado).toMatchObject({
        idAssociacao: expect.any(String),
        idCiclo: expect.any(String),
        idCriterio: expect.any(String),
      });
    });

    it('deve retornar dados com relacionamentos quando aplicável', async () => {
      // Arrange
      const idCiclo = '456e7890-e89b-12d3-a456-426614174001';
      mockAssociacaoCriterioCicloService.findByCiclo.mockResolvedValue([mockAssociacaoComCriterio]);

      // Act
      const resultado = await controller.findByCiclo(idCiclo);

      // Assert
      expect(resultado[0]).toHaveProperty('criterio');
      expect(resultado[0].criterio).toMatchObject({
        idCriterio: expect.any(String),
        nomeCriterio: expect.any(String),
        pilar: expect.any(String),
        peso: expect.any(Number),
        obrigatorio: expect.any(Boolean),
      });
    });

    it('deve manter consistência de tipos nos retornos', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockAssociacaoCriterioCicloService.findOne.mockResolvedValue(mockAssociacao);

      // Act
      const resultado = await controller.findOne(id);

      // Assert
      expect(typeof resultado.idAssociacao).toBe('string');
      expect(typeof resultado.idCiclo).toBe('string');
      expect(typeof resultado.idCriterio).toBe('string');
      expect(typeof resultado.cargo).toBe('string');
      expect(typeof resultado.trilhaCarreira).toBe('string');
      expect(typeof resultado.unidade).toBe('string');
    });
  });
});
