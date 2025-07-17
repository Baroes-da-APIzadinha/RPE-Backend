import { Test, TestingModule } from '@nestjs/testing';
import { CriteriosService } from './criterios.service';
import { PrismaService } from '../database/prismaService';
import { pilarCriterio } from '@prisma/client';
import { CreateCriterioDto, UpdateCriterioDto } from './criterios.dto';

// Mock do PrismaService
const mockPrismaService = {
  criterioAvaliativo: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('CriteriosService', () => {
  let service: CriteriosService;
  let prisma: PrismaService;

  // Dados de teste
  const mockCriterio = {
    idCriterio: '123e4567-e89b-12d3-a456-426614174000',
    nomeCriterio: 'Comunicação',
    descricao: 'Capacidade de comunicação',
    peso: 1.5,
    obrigatorio: true,
    pilar: pilarCriterio.Execucao,
    dataCriacao: new Date('2024-01-01'),
    dataUltimaModificacao: new Date('2024-01-01'),
  };

  const mockCriterios = [
    mockCriterio,
    {
      idCriterio: '123e4567-e89b-12d3-a456-426614174001',
      nomeCriterio: 'Liderança',
      descricao: 'Capacidade de liderança',
      peso: 2.0,
      obrigatorio: true,
      pilar: pilarCriterio.Gestao_e_Lideranca,
      dataCriacao: new Date('2024-01-02'),
      dataUltimaModificacao: new Date('2024-01-02'),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CriteriosService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CriteriosService>(CriteriosService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Definição do serviço', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('getCriterios', () => {
    it('deve retornar todos os critérios ordenados por ID', async () => {
      // Arrange
      mockPrismaService.criterioAvaliativo.findMany.mockResolvedValue(mockCriterios);

      // Act
      const resultado = await service.getCriterios();

      // Assert
      expect(resultado).toEqual(mockCriterios);
      expect(mockPrismaService.criterioAvaliativo.findMany).toHaveBeenCalledWith({
        orderBy: {
          idCriterio: 'asc',
        },
      });
      expect(mockPrismaService.criterioAvaliativo.findMany).toHaveBeenCalledTimes(1);
    });

    it('deve retornar array vazio quando não há critérios', async () => {
      // Arrange
      mockPrismaService.criterioAvaliativo.findMany.mockResolvedValue([]);

      // Act
      const resultado = await service.getCriterios();

      // Assert
      expect(resultado).toEqual([]);
      expect(mockPrismaService.criterioAvaliativo.findMany).toHaveBeenCalledTimes(1);
    });

    it('deve propagar erro do Prisma', async () => {
      // Arrange
      const erro = new Error('Erro de conexão com banco');
      mockPrismaService.criterioAvaliativo.findMany.mockRejectedValue(erro);

      // Act & Assert
      await expect(service.getCriterios()).rejects.toThrow('Erro de conexão com banco');
    });
  });

  describe('getCriterio', () => {
    it('deve retornar um critério específico por ID', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockPrismaService.criterioAvaliativo.findUnique.mockResolvedValue(mockCriterio);

      // Act
      const resultado = await service.getCriterio(id);

      // Assert
      expect(resultado).toEqual(mockCriterio);
      expect(mockPrismaService.criterioAvaliativo.findUnique).toHaveBeenCalledWith({
        where: { idCriterio: id },
      });
      expect(mockPrismaService.criterioAvaliativo.findUnique).toHaveBeenCalledTimes(1);
    });

    it('deve retornar null quando critério não encontrado', async () => {
      // Arrange
      const id = 'inexistente';
      mockPrismaService.criterioAvaliativo.findUnique.mockResolvedValue(null);

      // Act
      const resultado = await service.getCriterio(id);

      // Assert
      expect(resultado).toBeNull();
      expect(mockPrismaService.criterioAvaliativo.findUnique).toHaveBeenCalledWith({
        where: { idCriterio: id },
      });
    });
  });

  describe('getCriterioPorPilar', () => {
    it('deve retornar critérios filtrados por pilar', async () => {
      // Arrange
      const pilar = pilarCriterio.Execucao;
      const criteriosFiltrados = [mockCriterio];
      mockPrismaService.criterioAvaliativo.findMany.mockResolvedValue(criteriosFiltrados);

      // Act
      const resultado = await service.getCriterioPorPilar(pilar);

      // Assert
      expect(resultado).toEqual(criteriosFiltrados);
      expect(mockPrismaService.criterioAvaliativo.findMany).toHaveBeenCalledWith({
        where: { pilar },
      });
      expect(mockPrismaService.criterioAvaliativo.findMany).toHaveBeenCalledTimes(1);
    });

    it('deve retornar array vazio quando não há critérios para o pilar', async () => {
      // Arrange
      const pilar = pilarCriterio.Gestao_e_Lideranca;
      mockPrismaService.criterioAvaliativo.findMany.mockResolvedValue([]);

      // Act
      const resultado = await service.getCriterioPorPilar(pilar);

      // Assert
      expect(resultado).toEqual([]);
    });
  });

  describe('createCriterio', () => {
    it('deve criar um novo critério com sucesso', async () => {
      // Arrange
      const createDto: CreateCriterioDto = {
        nomeCriterio: 'Novo Critério',
        descricao: 'Descrição do novo critério',
        peso: 1.0,
        obrigatorio: true,
        pilar: pilarCriterio.Execucao,
      };

      const criterioCreated = {
        ...mockCriterio,
        ...createDto,
        idCriterio: 'novo-id',
      };

      mockPrismaService.criterioAvaliativo.create.mockResolvedValue(criterioCreated);

      // Act
      const resultado = await service.createCriterio(createDto);

      // Assert
      expect(resultado).toEqual(criterioCreated);
      expect(mockPrismaService.criterioAvaliativo.create).toHaveBeenCalledWith({
        data: createDto,
      });
      expect(mockPrismaService.criterioAvaliativo.create).toHaveBeenCalledTimes(1);
    });

    it('deve criar critério com valores opcionais undefined', async () => {
      // Arrange
      const createDto: CreateCriterioDto = {
        nomeCriterio: 'Critério Mínimo',
      };

      const criterioCreated = {
        ...mockCriterio,
        nomeCriterio: createDto.nomeCriterio,
      };

      mockPrismaService.criterioAvaliativo.create.mockResolvedValue(criterioCreated);

      // Act
      const resultado = await service.createCriterio(createDto);

      // Assert
      expect(resultado).toEqual(criterioCreated);
      expect(mockPrismaService.criterioAvaliativo.create).toHaveBeenCalledWith({
        data: createDto,
      });
    });

    it('deve propagar erro de validação do Prisma', async () => {
      // Arrange
      const createDto: CreateCriterioDto = {
        nomeCriterio: '',
      };
      const erro = new Error('Nome do critério é obrigatório');
      mockPrismaService.criterioAvaliativo.create.mockRejectedValue(erro);

      // Act & Assert
      await expect(service.createCriterio(createDto)).rejects.toThrow('Nome do critério é obrigatório');
    });
  });

  describe('updateCriterio', () => {
    it('deve atualizar um critério com sucesso', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto: UpdateCriterioDto = {
        nomeCriterio: 'Critério Atualizado',
        peso: 2.5,
      };

      const criterioUpdated = {
        ...mockCriterio,
        ...updateDto,
        dataUltimaModificacao: new Date(),
      };

      mockPrismaService.criterioAvaliativo.update.mockResolvedValue(criterioUpdated);

      // Act
      const resultado = await service.updateCriterio(id, updateDto);

      // Assert
      expect(resultado).toEqual(criterioUpdated);
      expect(mockPrismaService.criterioAvaliativo.update).toHaveBeenCalledWith({
        where: { idCriterio: id },
        data: {
          ...updateDto,
          dataUltimaModificacao: expect.any(Date),
        },
      });
      expect(mockPrismaService.criterioAvaliativo.update).toHaveBeenCalledTimes(1);
    });

    it('deve atualizar apenas campos fornecidos', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto: UpdateCriterioDto = {
        peso: 3.0,
      };

      const criterioUpdated = {
        ...mockCriterio,
        peso: 3.0,
        dataUltimaModificacao: new Date(),
      };

      mockPrismaService.criterioAvaliativo.update.mockResolvedValue(criterioUpdated);

      // Act
      const resultado = await service.updateCriterio(id, updateDto);

      // Assert
      expect(resultado).toEqual(criterioUpdated);
      expect(mockPrismaService.criterioAvaliativo.update).toHaveBeenCalledWith({
        where: { idCriterio: id },
        data: {
          peso: 3.0,
          dataUltimaModificacao: expect.any(Date),
        },
      });
    });

    it('deve atualizar dataUltimaModificacao automaticamente', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto: UpdateCriterioDto = {
        nomeCriterio: 'Nome Atualizado',
      };

      const dataAntes = new Date();
      mockPrismaService.criterioAvaliativo.update.mockResolvedValue({
        ...mockCriterio,
        ...updateDto,
      });

      // Act
      await service.updateCriterio(id, updateDto);

      // Assert
      const chamada = mockPrismaService.criterioAvaliativo.update.mock.calls[0][0];
      expect(chamada.data.dataUltimaModificacao).toBeInstanceOf(Date);
      expect(chamada.data.dataUltimaModificacao.getTime()).toBeGreaterThanOrEqual(dataAntes.getTime());
    });

    it('deve propagar erro quando critério não encontrado', async () => {
      // Arrange
      const id = 'inexistente';
      const updateDto: UpdateCriterioDto = {
        nomeCriterio: 'Teste',
      };
      const erro = new Error('Critério não encontrado');
      mockPrismaService.criterioAvaliativo.update.mockRejectedValue(erro);

      // Act & Assert
      await expect(service.updateCriterio(id, updateDto)).rejects.toThrow('Critério não encontrado');
    });
  });

  describe('deleteCriterio', () => {
    it('deve deletar um critério com sucesso', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockPrismaService.criterioAvaliativo.delete.mockResolvedValue(mockCriterio);

      // Act
      const resultado = await service.deleteCriterio(id);

      // Assert
      expect(resultado).toEqual(mockCriterio);
      expect(mockPrismaService.criterioAvaliativo.delete).toHaveBeenCalledWith({
        where: { idCriterio: id },
      });
      expect(mockPrismaService.criterioAvaliativo.delete).toHaveBeenCalledTimes(1);
    });

    it('deve propagar erro quando critério não encontrado', async () => {
      // Arrange
      const id = 'inexistente';
      const erro = new Error('Critério não encontrado para exclusão');
      mockPrismaService.criterioAvaliativo.delete.mockRejectedValue(erro);

      // Act & Assert
      await expect(service.deleteCriterio(id)).rejects.toThrow('Critério não encontrado para exclusão');
    });

    it('deve propagar erro de constraint quando critério está em uso', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const erro = new Error('Não é possível deletar: critério está sendo usado em avaliações');
      mockPrismaService.criterioAvaliativo.delete.mockRejectedValue(erro);

      // Act & Assert
      await expect(service.deleteCriterio(id)).rejects.toThrow('Não é possível deletar: critério está sendo usado em avaliações');
    });
  });

  describe('Integração entre métodos', () => {
    it('deve criar e depois buscar o critério criado', async () => {
      // Arrange
      const createDto: CreateCriterioDto = {
        nomeCriterio: 'Critério Teste',
        pilar: pilarCriterio.Execucao,
      };

      const criterioCreated = {
        ...mockCriterio,
        ...createDto,
        idCriterio: 'novo-id-teste',
      };

      mockPrismaService.criterioAvaliativo.create.mockResolvedValue(criterioCreated);
      mockPrismaService.criterioAvaliativo.findUnique.mockResolvedValue(criterioCreated);

      // Act
      const criado = await service.createCriterio(createDto);
      const buscado = await service.getCriterio(criado.idCriterio);

      // Assert
      expect(criado).toEqual(criterioCreated);
      expect(buscado).toEqual(criterioCreated);
      expect(mockPrismaService.criterioAvaliativo.create).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.criterioAvaliativo.findUnique).toHaveBeenCalledTimes(1);
    });
  });
});