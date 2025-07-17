import { Test, TestingModule } from '@nestjs/testing';
import { AssociacaoCriterioCicloService } from './criterioCiclo.service';
import { PrismaService } from '../database/prismaService';
import { CreateAssociacaoCriterioCicloDto, UpdateAssociacaoCriterioCicloDto } from './criterioCiclo.dto';
import { 
  ConflictException, 
  NotFoundException 
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('AssociacaoCriterioCicloService', () => {
  let service: AssociacaoCriterioCicloService;
  let prismaService: PrismaService;

  // Mock do PrismaService
  const mockPrismaService = {
    associacaoCriterioCiclo: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
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

  const createAssociacaoDto: CreateAssociacaoCriterioCicloDto = {
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssociacaoCriterioCicloService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AssociacaoCriterioCicloService>(AssociacaoCriterioCicloService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Definição do service', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('create', () => {
    it('deve criar uma associação com sucesso', async () => {
      // Arrange
      mockPrismaService.associacaoCriterioCiclo.create.mockResolvedValue(mockAssociacao);

      // Act
      const resultado = await service.create(createAssociacaoDto);

      // Assert
      expect(resultado).toEqual(mockAssociacao);
      expect(mockPrismaService.associacaoCriterioCiclo.create).toHaveBeenCalledWith({
        data: {
          idCiclo: createAssociacaoDto.idCiclo,
          idCriterio: createAssociacaoDto.idCriterio,
          cargo: createAssociacaoDto.cargo,
          trilhaCarreira: createAssociacaoDto.trilhaCarreira,
          unidade: createAssociacaoDto.unidade,
        },
      });
      expect(mockPrismaService.associacaoCriterioCiclo.create).toHaveBeenCalledTimes(1);
    });

    it('deve criar associação apenas com campos obrigatórios', async () => {
      // Arrange
      const dtoMinimo: CreateAssociacaoCriterioCicloDto = {
        idCiclo: '456e7890-e89b-12d3-a456-426614174001',
        idCriterio: '789e0123-e89b-12d3-a456-426614174002',
      };

      const associacaoMinima = {
        idAssociacao: '123e4567-e89b-12d3-a456-426614174000',
        idCiclo: '456e7890-e89b-12d3-a456-426614174001',
        idCriterio: '789e0123-e89b-12d3-a456-426614174002',
        cargo: null,
        trilhaCarreira: null,
        unidade: null,
      };

      mockPrismaService.associacaoCriterioCiclo.create.mockResolvedValue(associacaoMinima);

      // Act
      const resultado = await service.create(dtoMinimo);

      // Assert
      expect(resultado).toEqual(associacaoMinima);
      expect(mockPrismaService.associacaoCriterioCiclo.create).toHaveBeenCalledWith({
        data: {
          idCiclo: dtoMinimo.idCiclo,
          idCriterio: dtoMinimo.idCriterio,
          cargo: undefined,
          trilhaCarreira: undefined,
          unidade: undefined,
        },
      });
    });

    it('deve lançar ConflictException quando associação já existe', async () => {
      // Arrange
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '4.0.0',
        }
      );

      mockPrismaService.associacaoCriterioCiclo.create.mockRejectedValue(prismaError);

      // Act & Assert
      await expect(service.create(createAssociacaoDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createAssociacaoDto)).rejects.toThrow('Associação já existente');
      expect(mockPrismaService.associacaoCriterioCiclo.create).toHaveBeenCalledWith({
        data: createAssociacaoDto,
      });
    });

    it('deve propagar outros erros do Prisma', async () => {
      // Arrange
      const prismaError = new Error('Database connection error');
      mockPrismaService.associacaoCriterioCiclo.create.mockRejectedValue(prismaError);

      // Act & Assert
      await expect(service.create(createAssociacaoDto)).rejects.toThrow('Database connection error');
      expect(mockPrismaService.associacaoCriterioCiclo.create).toHaveBeenCalledWith({
        data: createAssociacaoDto,
      });
    });

    it('deve propagar erros do Prisma que não são P2002', async () => {
      // Arrange
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: 'P2003',
          clientVersion: '4.0.0',
        }
      );

      mockPrismaService.associacaoCriterioCiclo.create.mockRejectedValue(prismaError);

      // Act & Assert
      await expect(service.create(createAssociacaoDto)).rejects.toThrow(
        Prisma.PrismaClientKnownRequestError
      );
      expect(mockPrismaService.associacaoCriterioCiclo.create).toHaveBeenCalledWith({
        data: createAssociacaoDto,
      });
    });
  });

  describe('findAll', () => {
    it('deve retornar todas as associações', async () => {
      // Arrange
      const mockAssociacoes = [
        mockAssociacao,
        {
          ...mockAssociacao,
          idAssociacao: '987e6543-e89b-12d3-a456-426614174003',
          cargo: 'QA',
          trilhaCarreira: 'QA',
        },
      ];

      mockPrismaService.associacaoCriterioCiclo.findMany.mockResolvedValue(mockAssociacoes);

      // Act
      const resultado = await service.findAll();

      // Assert
      expect(resultado).toEqual(mockAssociacoes);
      expect(mockPrismaService.associacaoCriterioCiclo.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.associacaoCriterioCiclo.findMany).toHaveBeenCalledWith();
    });

    it('deve retornar array vazio quando não há associações', async () => {
      // Arrange
      mockPrismaService.associacaoCriterioCiclo.findMany.mockResolvedValue([]);

      // Act
      const resultado = await service.findAll();

      // Assert
      expect(resultado).toEqual([]);
      expect(mockPrismaService.associacaoCriterioCiclo.findMany).toHaveBeenCalledTimes(1);
    });

    it('deve retornar associações com estrutura correta', async () => {
      // Arrange
      const mockAssociacoes = [mockAssociacao];
      mockPrismaService.associacaoCriterioCiclo.findMany.mockResolvedValue(mockAssociacoes);

      // Act
      const resultado = await service.findAll();

      // Assert
      expect(resultado[0]).toHaveProperty('idAssociacao');
      expect(resultado[0]).toHaveProperty('idCiclo');
      expect(resultado[0]).toHaveProperty('idCriterio');
      expect(resultado[0]).toHaveProperty('cargo');
      expect(resultado[0]).toHaveProperty('trilhaCarreira');
      expect(resultado[0]).toHaveProperty('unidade');
    });
  });

  describe('findOne', () => {
    it('deve retornar uma associação por ID', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockPrismaService.associacaoCriterioCiclo.findUnique.mockResolvedValue(mockAssociacao);

      // Act
      const resultado = await service.findOne(id);

      // Assert
      expect(resultado).toEqual(mockAssociacao);
      expect(mockPrismaService.associacaoCriterioCiclo.findUnique).toHaveBeenCalledWith({
        where: { idAssociacao: id },
      });
      expect(mockPrismaService.associacaoCriterioCiclo.findUnique).toHaveBeenCalledTimes(1);
    });

    it('deve lançar NotFoundException quando associação não encontrada', async () => {
      // Arrange
      const id = 'id-inexistente';
      mockPrismaService.associacaoCriterioCiclo.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(id)).rejects.toThrow(
        `Associação com ID ${id} não encontrada.`
      );
      expect(mockPrismaService.associacaoCriterioCiclo.findUnique).toHaveBeenCalledWith({
        where: { idAssociacao: id },
      });
    });

    it('deve retornar associação com todos os campos', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockPrismaService.associacaoCriterioCiclo.findUnique.mockResolvedValue(mockAssociacao);

      // Act
      const resultado = await service.findOne(id);

      // Assert
      expect(resultado.idAssociacao).toBe(id);
      expect(resultado.idCiclo).toBe(mockAssociacao.idCiclo);
      expect(resultado.idCriterio).toBe(mockAssociacao.idCriterio);
      expect(resultado.cargo).toBe(mockAssociacao.cargo);
      expect(resultado.trilhaCarreira).toBe(mockAssociacao.trilhaCarreira);
      expect(resultado.unidade).toBe(mockAssociacao.unidade);
    });
  });

  describe('update', () => {
    it('deve atualizar uma associação com sucesso', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto: UpdateAssociacaoCriterioCicloDto = {
        cargo: 'SENIOR_DEVELOPER',
        trilhaCarreira: 'DESENVOLVIMENTO',
      };

      const associacaoAtualizada = { ...mockAssociacao, ...updateDto };

      mockPrismaService.associacaoCriterioCiclo.findUnique.mockResolvedValue(mockAssociacao);
      mockPrismaService.associacaoCriterioCiclo.update.mockResolvedValue(associacaoAtualizada);

      // Act
      const resultado = await service.update(id, updateDto);

      // Assert
      expect(resultado).toEqual(associacaoAtualizada);
      expect(mockPrismaService.associacaoCriterioCiclo.findUnique).toHaveBeenCalledWith({
        where: { idAssociacao: id },
      });
      expect(mockPrismaService.associacaoCriterioCiclo.update).toHaveBeenCalledWith({
        where: { idAssociacao: id },
        data: updateDto,
      });
    });

    it('deve atualizar apenas campos fornecidos', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto: UpdateAssociacaoCriterioCicloDto = {
        unidade: 'SAO_PAULO',
      };

      const associacaoAtualizada = { ...mockAssociacao, unidade: 'SAO_PAULO' };

      mockPrismaService.associacaoCriterioCiclo.findUnique.mockResolvedValue(mockAssociacao);
      mockPrismaService.associacaoCriterioCiclo.update.mockResolvedValue(associacaoAtualizada);

      // Act
      const resultado = await service.update(id, updateDto);

      // Assert
      expect(resultado).toEqual(associacaoAtualizada);
      expect(mockPrismaService.associacaoCriterioCiclo.update).toHaveBeenCalledWith({
        where: { idAssociacao: id },
        data: { unidade: 'SAO_PAULO' },
      });
    });

    it('deve lançar NotFoundException quando associação não existe para atualização', async () => {
      // Arrange
      const id = 'id-inexistente';
      const updateDto: UpdateAssociacaoCriterioCicloDto = {
        cargo: 'QA',
      };

      mockPrismaService.associacaoCriterioCiclo.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(id, updateDto)).rejects.toThrow(NotFoundException);
      await expect(service.update(id, updateDto)).rejects.toThrow(
        `Associação com ID ${id} não encontrada.`
      );
      expect(mockPrismaService.associacaoCriterioCiclo.findUnique).toHaveBeenCalledWith({
        where: { idAssociacao: id },
      });
      expect(mockPrismaService.associacaoCriterioCiclo.update).not.toHaveBeenCalled();
    });

    it('deve funcionar com DTO vazio', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto: UpdateAssociacaoCriterioCicloDto = {};

      mockPrismaService.associacaoCriterioCiclo.findUnique.mockResolvedValue(mockAssociacao);
      mockPrismaService.associacaoCriterioCiclo.update.mockResolvedValue(mockAssociacao);

      // Act
      const resultado = await service.update(id, updateDto);

      // Assert
      expect(resultado).toEqual(mockAssociacao);
      expect(mockPrismaService.associacaoCriterioCiclo.update).toHaveBeenCalledWith({
        where: { idAssociacao: id },
        data: {},
      });
    });

    it('deve atualizar todos os campos quando fornecidos', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto: UpdateAssociacaoCriterioCicloDto = {
        idCiclo: 'novo-ciclo-id',
        idCriterio: 'novo-criterio-id',
        cargo: 'LEAD_DEVELOPER',
        trilhaCarreira: 'LIDERANCA',
        unidade: 'BRASILIA',
      };

      const associacaoAtualizada = { ...mockAssociacao, ...updateDto };

      mockPrismaService.associacaoCriterioCiclo.findUnique.mockResolvedValue(mockAssociacao);
      mockPrismaService.associacaoCriterioCiclo.update.mockResolvedValue(associacaoAtualizada);

      // Act
      const resultado = await service.update(id, updateDto);

      // Assert
      expect(resultado).toEqual(associacaoAtualizada);
      expect(mockPrismaService.associacaoCriterioCiclo.update).toHaveBeenCalledWith({
        where: { idAssociacao: id },
        data: updateDto,
      });
    });
  });

  describe('remove', () => {
    it('deve remover uma associação com sucesso', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';

      mockPrismaService.associacaoCriterioCiclo.findUnique.mockResolvedValue(mockAssociacao);
      mockPrismaService.associacaoCriterioCiclo.delete.mockResolvedValue(mockAssociacao);

      // Act
      const resultado = await service.remove(id);

      // Assert
      expect(resultado).toEqual(mockAssociacao);
      expect(mockPrismaService.associacaoCriterioCiclo.findUnique).toHaveBeenCalledWith({
        where: { idAssociacao: id },
      });
      expect(mockPrismaService.associacaoCriterioCiclo.delete).toHaveBeenCalledWith({
        where: { idAssociacao: id },
      });
      expect(mockPrismaService.associacaoCriterioCiclo.delete).toHaveBeenCalledTimes(1);
    });

    it('deve lançar NotFoundException quando associação não existe para remoção', async () => {
      // Arrange
      const id = 'id-inexistente';

      mockPrismaService.associacaoCriterioCiclo.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove(id)).rejects.toThrow(NotFoundException);
      await expect(service.remove(id)).rejects.toThrow(
        `Associação com ID ${id} não encontrada.`
      );
      expect(mockPrismaService.associacaoCriterioCiclo.findUnique).toHaveBeenCalledWith({
        where: { idAssociacao: id },
      });
      expect(mockPrismaService.associacaoCriterioCiclo.delete).not.toHaveBeenCalled();
    });

     it('deve verificar se existe antes de deletar', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const mockAssociacao = { ...mockAssociacaoComCriterio };

      mockPrismaService.associacaoCriterioCiclo.findUnique.mockResolvedValue(mockAssociacao);
      mockPrismaService.associacaoCriterioCiclo.delete.mockResolvedValue(mockAssociacao);

      // Act
      await service.remove(id);

      // Assert
      expect(mockPrismaService.associacaoCriterioCiclo.findUnique).toHaveBeenCalledWith({
        where: { idAssociacao: id },
      });
      expect(mockPrismaService.associacaoCriterioCiclo.delete).toHaveBeenCalledWith({
        where: { idAssociacao: id },
      });
      
      // Verify both methods were called
      expect(mockPrismaService.associacaoCriterioCiclo.findUnique).toHaveBeenCalled();
      expect(mockPrismaService.associacaoCriterioCiclo.delete).toHaveBeenCalled();
    });
  });

  describe('findByCiclo', () => {
    it('deve retornar associações de um ciclo específico com critérios incluídos', async () => {
      // Arrange
      const idCiclo = '456e7890-e89b-12d3-a456-426614174001';
      const mockAssociacoesComCriterios = [
        mockAssociacaoComCriterio,
        {
          ...mockAssociacaoComCriterio,
          idAssociacao: '987e6543-e89b-12d3-a456-426614174003',
          cargo: 'QA',
          trilhaCarreira: 'QA',
          criterio: {
            ...mockAssociacaoComCriterio.criterio,
            idCriterio: 'outro-criterio-id',
            nomeCriterio: 'Atenção aos Detalhes',
            pilar: 'Execucao',
          },
        },
      ];

      mockPrismaService.associacaoCriterioCiclo.findMany.mockResolvedValue(
        mockAssociacoesComCriterios
      );

      // Act
      const resultado = await service.findByCiclo(idCiclo);

      // Assert
      expect(resultado).toEqual(mockAssociacoesComCriterios);
      expect(mockPrismaService.associacaoCriterioCiclo.findMany).toHaveBeenCalledWith({
        where: { idCiclo },
        include: {
          criterio: true,
        },
      });
      expect(mockPrismaService.associacaoCriterioCiclo.findMany).toHaveBeenCalledTimes(1);
    });

    it('deve retornar array vazio quando ciclo não tem associações', async () => {
      // Arrange
      const idCiclo = 'ciclo-sem-associacoes';
      mockPrismaService.associacaoCriterioCiclo.findMany.mockResolvedValue([]);

      // Act
      const resultado = await service.findByCiclo(idCiclo);

      // Assert
      expect(resultado).toEqual([]);
      expect(mockPrismaService.associacaoCriterioCiclo.findMany).toHaveBeenCalledWith({
        where: { idCiclo },
        include: {
          criterio: true,
        },
      });
    });

    it('deve retornar associações com dados completos do critério', async () => {
      // Arrange
      const idCiclo = '456e7890-e89b-12d3-a456-426614174001';
      const mockAssociacoesComCriterios = [mockAssociacaoComCriterio];

      mockPrismaService.associacaoCriterioCiclo.findMany.mockResolvedValue(
        mockAssociacoesComCriterios
      );

      // Act
      const resultado = await service.findByCiclo(idCiclo);

      // Assert
      expect(resultado[0]).toHaveProperty('criterio');
      expect(resultado[0].criterio).toHaveProperty('idCriterio');
      expect(resultado[0].criterio).toHaveProperty('nomeCriterio');
      expect(resultado[0].criterio).toHaveProperty('pilar');
      expect(resultado[0].criterio).toHaveProperty('descricao');
      expect(resultado[0].criterio).toHaveProperty('peso');
      expect(resultado[0].criterio).toHaveProperty('obrigatorio');
    });

    it('deve filtrar corretamente por ID do ciclo', async () => {
      // Arrange
      const idCiclo = 'ciclo-especifico';
      mockPrismaService.associacaoCriterioCiclo.findMany.mockResolvedValue([]);

      // Act
      await service.findByCiclo(idCiclo);

      // Assert
      expect(mockPrismaService.associacaoCriterioCiclo.findMany).toHaveBeenCalledWith({
        where: { idCiclo: 'ciclo-especifico' },
        include: {
          criterio: true,
        },
      });
    });
  });

  describe('Casos extremos e integração', () => {
    it('deve lidar com múltiplas operações simultâneas', async () => {
      // Arrange
      mockPrismaService.associacaoCriterioCiclo.findMany.mockResolvedValue([mockAssociacao]);

      // Act
      const promessas = [
        service.findAll(),
        service.findAll(),
        service.findAll(),
      ];

      const resultados = await Promise.all(promessas);

      // Assert
      expect(resultados).toHaveLength(3);
      expect(mockPrismaService.associacaoCriterioCiclo.findMany).toHaveBeenCalledTimes(3);
      resultados.forEach(resultado => {
        expect(resultado).toEqual([mockAssociacao]);
      });
    });

    it('deve propagar erros do Prisma corretamente', async () => {
      // Arrange
      const error = new Error('Database connection lost');
      mockPrismaService.associacaoCriterioCiclo.findMany.mockRejectedValue(error);

      // Act & Assert
      await expect(service.findAll()).rejects.toThrow('Database connection lost');
    });

    it('deve funcionar com UUIDs válidos', async () => {
      // Arrange
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      mockPrismaService.associacaoCriterioCiclo.findUnique.mockResolvedValue(mockAssociacao);

      // Act
      const resultado = await service.findOne(validUUID);

      // Assert
      expect(resultado).toBeDefined();
      expect(resultado.idAssociacao).toBe(validUUID);
    });

    it('deve lidar com dados de critério complexos', async () => {
      // Arrange
      const idCiclo = '456e7890-e89b-12d3-a456-426614174001';
      const associacaoComCriterioComplexo = {
        ...mockAssociacaoComCriterio,
        criterio: {
          ...mockAssociacaoComCriterio.criterio,
          peso: 2.5,
          obrigatorio: false,
          descricao: 'Descrição muito longa e detalhada do critério que pode conter caracteres especiais @#$%',
        },
      };

      mockPrismaService.associacaoCriterioCiclo.findMany.mockResolvedValue([
        associacaoComCriterioComplexo,
      ]);

      // Act
      const resultado = await service.findByCiclo(idCiclo);

      // Assert
      expect(resultado[0].criterio.peso).toBe(2.5);
      expect(resultado[0].criterio.obrigatorio).toBe(false);
      expect(resultado[0].criterio.descricao).toContain('caracteres especiais');
    });

    it('deve manter integridade dos dados durante operações CRUD', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      
      // Simular operação completa: create -> read -> update -> delete
      mockPrismaService.associacaoCriterioCiclo.create.mockResolvedValue(mockAssociacao);
      mockPrismaService.associacaoCriterioCiclo.findUnique.mockResolvedValue(mockAssociacao);
      mockPrismaService.associacaoCriterioCiclo.update.mockResolvedValue({
        ...mockAssociacao,
        cargo: 'ATUALIZADO',
      });
      mockPrismaService.associacaoCriterioCiclo.delete.mockResolvedValue(mockAssociacao);

      // Act
      const criado = await service.create(createAssociacaoDto);
      const encontrado = await service.findOne(id);
      const atualizado = await service.update(id, { cargo: 'ATUALIZADO' });
      const removido = await service.remove(id);

      // Assert
      expect(criado.idCiclo).toBe(createAssociacaoDto.idCiclo);
      expect(encontrado.idAssociacao).toBe(id);
      expect(atualizado.cargo).toBe('ATUALIZADO');
      expect(removido.idAssociacao).toBe(id);
    });
  });

  describe('Validação de estruturas de dados', () => {
    it('deve retornar estrutura correta para associação completa', async () => {
      // Arrange
      mockPrismaService.associacaoCriterioCiclo.create.mockResolvedValue(mockAssociacao);

      // Act
      const resultado = await service.create(createAssociacaoDto);

      // Assert
      expect(resultado).toMatchObject({
        idAssociacao: expect.any(String),
        idCiclo: expect.any(String),
        idCriterio: expect.any(String),
        cargo: expect.any(String),
        trilhaCarreira: expect.any(String),
        unidade: expect.any(String),
      });
    });

    it('deve aceitar valores null para campos opcionais', async () => {
      // Arrange
      const associacaoComNulls = {
        ...mockAssociacao,
        cargo: null,
        trilhaCarreira: null,
        unidade: null,
      };

      mockPrismaService.associacaoCriterioCiclo.create.mockResolvedValue(associacaoComNulls);

      // Act
      const resultado = await service.create({
        idCiclo: createAssociacaoDto.idCiclo,
        idCriterio: createAssociacaoDto.idCriterio,
      });

      // Assert
      expect(resultado.cargo).toBeNull();
      expect(resultado.trilhaCarreira).toBeNull();
      expect(resultado.unidade).toBeNull();
    });
  });
});