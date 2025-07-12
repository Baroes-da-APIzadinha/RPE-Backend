import { Test, TestingModule } from '@nestjs/testing';
import { ReferenciasService } from './referencias.service';
import { PrismaService } from '../database/prismaService';
import { CriarReferenciaDto, AtualizarReferenciaDto } from './referencias.dto';
import { TipoReferencia } from './referencias.constants';
import { 
  BadRequestException, 
  NotFoundException 
} from '@nestjs/common';

describe('ReferenciasService', () => {
  let service: ReferenciasService;
  let prismaService: PrismaService;

  // Mock do PrismaService
  const mockPrismaService = {
    indicacaoReferencia: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
  };

  // Dados de teste
  const mockIndicacao = {
    idIndicacao: '123e4567-e89b-12d3-a456-426614174000',
    idCiclo: '456e7890-e89b-12d3-a456-426614174001',
    idIndicador: '789e0123-e89b-12d3-a456-426614174002',
    idIndicado: '987e6543-e89b-12d3-a456-426614174003',
    tipo: TipoReferencia.TECNICA,
    justificativa: 'Excelente conhecimento técnico em desenvolvimento de software',
  };

  const mockIndicacaoComRelacionamentos = {
    ...mockIndicacao,
    ciclo: {
      idCiclo: '456e7890-e89b-12d3-a456-426614174001',
      nomeCiclo: '2024.1',
      status: 'EM_ANDAMENTO',
    },
    indicador: {
      idColaborador: '789e0123-e89b-12d3-a456-426614174002',
      nomeCompleto: 'João Silva',
      email: 'joao.silva@empresa.com',
    },
    indicado: {
      idColaborador: '987e6543-e89b-12d3-a456-426614174003',
      nomeCompleto: 'Maria Santos',
      email: 'maria.santos@empresa.com',
    },
  };

  const criarReferenciaDto: CriarReferenciaDto = {
    idCiclo: '456e7890-e89b-12d3-a456-426614174001',
    idIndicador: '789e0123-e89b-12d3-a456-426614174002',
    idIndicado: '987e6543-e89b-12d3-a456-426614174003',
    tipo: TipoReferencia.TECNICA,
    justificativa: 'Excelente conhecimento técnico em desenvolvimento de software',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferenciasService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReferenciasService>(ReferenciasService);
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

  describe('criarReferencia', () => {
    it('deve criar uma referência com sucesso', async () => {
      // Arrange
      mockPrismaService.indicacaoReferencia.create.mockResolvedValue(mockIndicacao);

      // Act
      const resultado = await service.criarReferencia(criarReferenciaDto);

      // Assert
      expect(resultado).toEqual(mockIndicacao);
      expect(mockPrismaService.indicacaoReferencia.create).toHaveBeenCalledWith({
        data: {
          idCiclo: criarReferenciaDto.idCiclo,
          idIndicador: criarReferenciaDto.idIndicador,
          idIndicado: criarReferenciaDto.idIndicado,
          tipo: criarReferenciaDto.tipo,
          justificativa: criarReferenciaDto.justificativa,
        },
      });
      expect(mockPrismaService.indicacaoReferencia.create).toHaveBeenCalledTimes(1);
    });

    it('deve criar referência do tipo CULTURAL', async () => {
      // Arrange
      const dtoCultural: CriarReferenciaDto = {
        ...criarReferenciaDto,
        tipo: TipoReferencia.CULTURAL,
        justificativa: 'Demonstra excelentes valores culturais da empresa',
      };

      const indicacaoCultural = {
        ...mockIndicacao,
        tipo: TipoReferencia.CULTURAL,
        justificativa: 'Demonstra excelentes valores culturais da empresa',
      };

      mockPrismaService.indicacaoReferencia.create.mockResolvedValue(indicacaoCultural);

      // Act
      const resultado = await service.criarReferencia(dtoCultural);

      // Assert
      expect(resultado).toEqual(indicacaoCultural);
      expect(resultado.tipo).toBe(TipoReferencia.CULTURAL);
      expect(mockPrismaService.indicacaoReferencia.create).toHaveBeenCalledWith({
        data: dtoCultural,
      });
    });

    it('deve lançar BadRequestException quando há erro no Prisma', async () => {
      // Arrange
      const prismaError = new Error('Database connection error');
      mockPrismaService.indicacaoReferencia.create.mockRejectedValue(prismaError);

      // Act & Assert
      await expect(service.criarReferencia(criarReferenciaDto)).rejects.toThrow(BadRequestException);
      await expect(service.criarReferencia(criarReferenciaDto)).rejects.toThrow(
        'Erro ao criar referência: Database connection error'
      );
      expect(mockPrismaService.indicacaoReferencia.create).toHaveBeenCalledWith({
        data: criarReferenciaDto,
      });
    });

    it('deve criar referência com justificativa longa', async () => {
      // Arrange
      const justificativaLonga = 'Esta é uma justificativa muito longa que pode conter até 1000 caracteres. '.repeat(10);
      const dtoJustificativaLonga = {
        ...criarReferenciaDto,
        justificativa: justificativaLonga,
      };

      const indicacaoJustificativaLonga = {
        ...mockIndicacao,
        justificativa: justificativaLonga,
      };

      mockPrismaService.indicacaoReferencia.create.mockResolvedValue(indicacaoJustificativaLonga);

      // Act
      const resultado = await service.criarReferencia(dtoJustificativaLonga);

      // Assert
      expect(resultado.justificativa).toBe(justificativaLonga);
      expect(mockPrismaService.indicacaoReferencia.create).toHaveBeenCalledWith({
        data: dtoJustificativaLonga,
      });
    });

    it('deve retornar estrutura correta da indicação criada', async () => {
      // Arrange
      mockPrismaService.indicacaoReferencia.create.mockResolvedValue(mockIndicacao);

      // Act
      const resultado = await service.criarReferencia(criarReferenciaDto);

      // Assert
      expect(resultado).toHaveProperty('idIndicacao');
      expect(resultado).toHaveProperty('idCiclo');
      expect(resultado).toHaveProperty('idIndicador');
      expect(resultado).toHaveProperty('idIndicado');
      expect(resultado).toHaveProperty('tipo');
      expect(resultado).toHaveProperty('justificativa');
      expect(typeof resultado.idIndicacao).toBe('string');
      expect(typeof resultado.tipo).toBe('string');
    });
  });

  describe('atualizarReferencia', () => {
    it('deve atualizar uma referência com sucesso', async () => {
      // Arrange
      const idIndicacao = '123e4567-e89b-12d3-a456-426614174000';
      const atualizarDto: AtualizarReferenciaDto = {
        tipo: TipoReferencia.CULTURAL,
        justificativa: 'Justificativa atualizada com novos valores culturais',
      };

      const indicacaoAtualizada = {
        ...mockIndicacao,
        ...atualizarDto,
      };

      mockPrismaService.indicacaoReferencia.findUnique.mockResolvedValue(mockIndicacao);
      mockPrismaService.indicacaoReferencia.update.mockResolvedValue(indicacaoAtualizada);

      // Act
      const resultado = await service.atualizarReferencia(idIndicacao, atualizarDto);

      // Assert
      expect(resultado).toEqual(indicacaoAtualizada);
      expect(mockPrismaService.indicacaoReferencia.findUnique).toHaveBeenCalledWith({
        where: { idIndicacao },
      });
      expect(mockPrismaService.indicacaoReferencia.update).toHaveBeenCalledWith({
        where: { idIndicacao },
        data: {
          tipo: atualizarDto.tipo,
          justificativa: atualizarDto.justificativa,
        },
      });
    });

    it('deve atualizar apenas o tipo quando justificativa não fornecida', async () => {
      // Arrange
      const idIndicacao = '123e4567-e89b-12d3-a456-426614174000';
      const atualizarDto: AtualizarReferenciaDto = {
        tipo: TipoReferencia.CULTURAL,
      };

      const indicacaoAtualizada = {
        ...mockIndicacao,
        tipo: TipoReferencia.CULTURAL,
      };

      mockPrismaService.indicacaoReferencia.findUnique.mockResolvedValue(mockIndicacao);
      mockPrismaService.indicacaoReferencia.update.mockResolvedValue(indicacaoAtualizada);

      // Act
      const resultado = await service.atualizarReferencia(idIndicacao, atualizarDto);

      // Assert
      expect(resultado).toEqual(indicacaoAtualizada);
      expect(mockPrismaService.indicacaoReferencia.update).toHaveBeenCalledWith({
        where: { idIndicacao },
        data: {
          tipo: atualizarDto.tipo,
        },
      });
    });

    it('deve atualizar apenas justificativa quando tipo não fornecido', async () => {
      // Arrange
      const idIndicacao = '123e4567-e89b-12d3-a456-426614174000';
      const atualizarDto: AtualizarReferenciaDto = {
        tipo: TipoReferencia.TECNICA, // campo obrigatório no DTO
        justificativa: 'Nova justificativa apenas',
      };

      const indicacaoAtualizada = {
        ...mockIndicacao,
        justificativa: 'Nova justificativa apenas',
      };

      mockPrismaService.indicacaoReferencia.findUnique.mockResolvedValue(mockIndicacao);
      mockPrismaService.indicacaoReferencia.update.mockResolvedValue(indicacaoAtualizada);

      // Act
      const resultado = await service.atualizarReferencia(idIndicacao, atualizarDto);

      // Assert
      expect(resultado.justificativa).toBe('Nova justificativa apenas');
      expect(mockPrismaService.indicacaoReferencia.update).toHaveBeenCalledWith({
        where: { idIndicacao },
        data: {
          tipo: atualizarDto.tipo,
          justificativa: atualizarDto.justificativa,
        },
      });
    });

    it('deve lançar NotFoundException quando referência não existe', async () => {
      // Arrange
      const idIndicacao = 'id-inexistente';
      const atualizarDto: AtualizarReferenciaDto = {
        tipo: TipoReferencia.CULTURAL,
      };

      mockPrismaService.indicacaoReferencia.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.atualizarReferencia(idIndicacao, atualizarDto)).rejects.toThrow(NotFoundException);
      await expect(service.atualizarReferencia(idIndicacao, atualizarDto)).rejects.toThrow('Referência não encontrada');
      
      expect(mockPrismaService.indicacaoReferencia.findUnique).toHaveBeenCalledWith({
        where: { idIndicacao },
      });
      expect(mockPrismaService.indicacaoReferencia.update).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequestException quando há erro no Prisma', async () => {
      // Arrange
      const idIndicacao = '123e4567-e89b-12d3-a456-426614174000';
      const atualizarDto: AtualizarReferenciaDto = {
        tipo: TipoReferencia.CULTURAL,
      };

      mockPrismaService.indicacaoReferencia.findUnique.mockResolvedValue(mockIndicacao);
      mockPrismaService.indicacaoReferencia.update.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.atualizarReferencia(idIndicacao, atualizarDto)).rejects.toThrow(BadRequestException);
      await expect(service.atualizarReferencia(idIndicacao, atualizarDto)).rejects.toThrow(
        'Erro ao atualizar referência: Database error'
      );
    });

    it('deve preservar NotFoundException quando lançada', async () => {
      // Arrange
      const idIndicacao = 'id-inexistente';
      const atualizarDto: AtualizarReferenciaDto = {
        tipo: TipoReferencia.CULTURAL,
      };

      mockPrismaService.indicacaoReferencia.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.atualizarReferencia(idIndicacao, atualizarDto)).rejects.toBeInstanceOf(NotFoundException);
      expect(mockPrismaService.indicacaoReferencia.update).not.toHaveBeenCalled();
    });
  });

  describe('deletarReferencia', () => {
    it('deve deletar uma referência com sucesso', async () => {
      // Arrange
      const idIndicacao = '123e4567-e89b-12d3-a456-426614174000';

      mockPrismaService.indicacaoReferencia.findUnique.mockResolvedValue(mockIndicacao);
      mockPrismaService.indicacaoReferencia.delete.mockResolvedValue(mockIndicacao);

      // Act
      const resultado = await service.deletarReferencia(idIndicacao);

      // Assert
      expect(resultado).toEqual({ message: 'Referência deletada com sucesso' });
      expect(mockPrismaService.indicacaoReferencia.findUnique).toHaveBeenCalledWith({
        where: { idIndicacao },
      });
      expect(mockPrismaService.indicacaoReferencia.delete).toHaveBeenCalledWith({
        where: { idIndicacao },
      });
      expect(mockPrismaService.indicacaoReferencia.delete).toHaveBeenCalledTimes(1);
    });

    it('deve lançar NotFoundException quando referência não existe para remoção', async () => {
      // Arrange
      const idIndicacao = 'id-inexistente';

      mockPrismaService.indicacaoReferencia.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deletarReferencia(idIndicacao)).rejects.toThrow(NotFoundException);
      await expect(service.deletarReferencia(idIndicacao)).rejects.toThrow('Referência não encontrada');
      
      expect(mockPrismaService.indicacaoReferencia.findUnique).toHaveBeenCalledWith({
        where: { idIndicacao },
      });
      expect(mockPrismaService.indicacaoReferencia.delete).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequestException quando há erro no Prisma', async () => {
      // Arrange
      const idIndicacao = '123e4567-e89b-12d3-a456-426614174000';

      mockPrismaService.indicacaoReferencia.findUnique.mockResolvedValue(mockIndicacao);
      mockPrismaService.indicacaoReferencia.delete.mockRejectedValue(new Error('Foreign key constraint'));

      // Act & Assert
      await expect(service.deletarReferencia(idIndicacao)).rejects.toThrow(BadRequestException);
      await expect(service.deletarReferencia(idIndicacao)).rejects.toThrow(
        'Erro ao deletar referência: Foreign key constraint'
      );
    });

    it('deve verificar existência antes de deletar', async () => {
      // Arrange
      const idIndicacao = '123e4567-e89b-12d3-a456-426614174000';

      mockPrismaService.indicacaoReferencia.findUnique.mockResolvedValue(mockIndicacao);
      mockPrismaService.indicacaoReferencia.delete.mockResolvedValue(mockIndicacao);

      // Act
      await service.deletarReferencia(idIndicacao);

      // Assert
      expect(mockPrismaService.indicacaoReferencia.findUnique).toHaveBeenCalled();
      expect(mockPrismaService.indicacaoReferencia.delete).toHaveBeenCalled();
    });

    it('deve preservar NotFoundException quando lançada', async () => {
      // Arrange
      const idIndicacao = 'id-inexistente';

      mockPrismaService.indicacaoReferencia.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deletarReferencia(idIndicacao)).rejects.toBeInstanceOf(NotFoundException);
      expect(mockPrismaService.indicacaoReferencia.delete).not.toHaveBeenCalled();
    });
  });

  describe('getAllReferencias', () => {
    it('deve retornar todas as referências com relacionamentos', async () => {
      // Arrange
      const mockReferencias = [
        mockIndicacaoComRelacionamentos,
        {
          ...mockIndicacaoComRelacionamentos,
          idIndicacao: '999e8888-e89b-12d3-a456-426614174999',
          tipo: TipoReferencia.CULTURAL,
        },
      ];

      mockPrismaService.indicacaoReferencia.findMany.mockResolvedValue(mockReferencias);

      // Act
      const resultado = await service.getAllReferencias();

      // Assert
      expect(resultado).toEqual(mockReferencias);
      expect(mockPrismaService.indicacaoReferencia.findMany).toHaveBeenCalledWith({
        include: {
          ciclo: true,
          indicador: true,
          indicado: true,
        },
      });
      expect(mockPrismaService.indicacaoReferencia.findMany).toHaveBeenCalledTimes(1);
    });

    it('deve retornar array vazio quando não há referências', async () => {
      // Arrange
      mockPrismaService.indicacaoReferencia.findMany.mockResolvedValue([]);

      // Act
      const resultado = await service.getAllReferencias();

      // Assert
      expect(resultado).toEqual([]);
      expect(mockPrismaService.indicacaoReferencia.findMany).toHaveBeenCalledTimes(1);
    });

    it('deve retornar referências com estrutura de relacionamentos correta', async () => {
      // Arrange
      const mockReferencias = [mockIndicacaoComRelacionamentos];
      mockPrismaService.indicacaoReferencia.findMany.mockResolvedValue(mockReferencias);

      // Act
      const resultado = await service.getAllReferencias();

      // Assert
      expect(resultado[0]).toHaveProperty('ciclo');
      expect(resultado[0]).toHaveProperty('indicador');
      expect(resultado[0]).toHaveProperty('indicado');
      expect(resultado[0].ciclo).toHaveProperty('nomeCiclo');
      expect(resultado[0].indicador).toHaveProperty('nomeCompleto');
      expect(resultado[0].indicado).toHaveProperty('email');
    });

    it('deve lançar BadRequestException quando há erro no Prisma', async () => {
      // Arrange
      const prismaError = new Error('Database connection failed');
      mockPrismaService.indicacaoReferencia.findMany.mockRejectedValue(prismaError);

      // Act & Assert
      await expect(service.getAllReferencias()).rejects.toThrow(BadRequestException);
      await expect(service.getAllReferencias()).rejects.toThrow(
        'Erro ao listar referências: Database connection failed'
      );
    });
  });

  describe('getReferenciaByIndicador', () => {
    it('deve retornar referências de um indicador específico', async () => {
      // Arrange
      const idIndicador = '789e0123-e89b-12d3-a456-426614174002';
      const mockReferenciasIndicador = [
        {
          ...mockIndicacaoComRelacionamentos,
          // Remove indicador do include para simular a resposta real
          ciclo: mockIndicacaoComRelacionamentos.ciclo,
          indicado: mockIndicacaoComRelacionamentos.indicado,
        },
      ];

      mockPrismaService.indicacaoReferencia.findMany.mockResolvedValue(mockReferenciasIndicador);

      // Act
      const resultado = await service.getReferenciaByIndicador(idIndicador);

      // Assert
      expect(resultado).toEqual(mockReferenciasIndicador);
      expect(mockPrismaService.indicacaoReferencia.findMany).toHaveBeenCalledWith({
        where: { idIndicador },
        include: {
          ciclo: true,
          indicado: true,
        },
      });
    });

    it('deve lançar BadRequestException quando indicador não tem referências', async () => {
      // Arrange
      const idIndicador = 'indicador-sem-referencias';
      mockPrismaService.indicacaoReferencia.findMany.mockResolvedValue([]);

      // Act & Assert
      await expect(service.getReferenciaByIndicador(idIndicador)).rejects.toThrow(BadRequestException);
      await expect(service.getReferenciaByIndicador(idIndicador)).rejects.toThrow(
        'Erro ao buscar referências por indicador: Nenhuma referência encontrada para este indicador'
      );
      expect(mockPrismaService.indicacaoReferencia.findMany).toHaveBeenCalledWith({
        where: { idIndicador },
        include: {
          ciclo: true,
          indicado: true,
        },
      });
    });

    it('deve lançar BadRequestException quando há erro no Prisma', async () => {
      // Arrange
      const idIndicador = '789e0123-e89b-12d3-a456-426614174002';
      const prismaError = new Error('Database query failed');
      mockPrismaService.indicacaoReferencia.findMany.mockRejectedValue(prismaError);

      // Act & Assert
      await expect(service.getReferenciaByIndicador(idIndicador)).rejects.toThrow(BadRequestException);
      await expect(service.getReferenciaByIndicador(idIndicador)).rejects.toThrow(
        'Erro ao buscar referências por indicador: Database query failed'
      );
    });

    it('deve incluir relacionamentos corretos na consulta por indicador', async () => {
      // Arrange
      const idIndicador = '789e0123-e89b-12d3-a456-426614174002';

      const mockReferenciasIndicador = [
        {
            idIndicacao: mockIndicacaoComRelacionamentos.idIndicacao,
            idCiclo: mockIndicacaoComRelacionamentos.idCiclo,
            idIndicador: mockIndicacaoComRelacionamentos.idIndicador,
            idIndicado: mockIndicacaoComRelacionamentos.idIndicado,
            tipo: mockIndicacaoComRelacionamentos.tipo,
            justificativa: mockIndicacaoComRelacionamentos.justificativa,
            ciclo: mockIndicacaoComRelacionamentos.ciclo,
            indicado: mockIndicacaoComRelacionamentos.indicado,
        },
      ];

        mockPrismaService.indicacaoReferencia.findMany.mockResolvedValue(mockReferenciasIndicador);

      // Act
      const resultado = await service.getReferenciaByIndicador(idIndicador);

      // Assert
      expect(resultado[0]).toHaveProperty('ciclo');
      expect(resultado[0]).toHaveProperty('indicado');
      expect(resultado[0]).not.toHaveProperty('indicador'); // Não deve incluir o próprio indicador
    });
  });

  describe('getReferenciaByIndicado', () => {
    it('deve retornar referências de um indicado específico', async () => {
      // Arrange
      const idIndicado = '987e6543-e89b-12d3-a456-426614174003';
      const mockReferenciasIndicado = [
        {
          ...mockIndicacaoComRelacionamentos,
          // Remove indicado do include para simular a resposta real
          ciclo: mockIndicacaoComRelacionamentos.ciclo,
          indicador: mockIndicacaoComRelacionamentos.indicador,
        },
      ];

      mockPrismaService.indicacaoReferencia.findMany.mockResolvedValue(mockReferenciasIndicado);

      // Act
      const resultado = await service.getReferenciaByIndicado(idIndicado);

      // Assert
      expect(resultado).toEqual(mockReferenciasIndicado);
      expect(mockPrismaService.indicacaoReferencia.findMany).toHaveBeenCalledWith({
        where: { idIndicado },
        include: {
          ciclo: true,
          indicador: true,
        },
      });
    });

    it('deve lançar BadRequestException quando indicado não tem referências', async () => {
      // Arrange
      const idIndicado = 'indicado-sem-referencias';
      mockPrismaService.indicacaoReferencia.findMany.mockResolvedValue([]);

      // Act & Assert
      await expect(service.getReferenciaByIndicado(idIndicado)).rejects.toThrow(BadRequestException);
      await expect(service.getReferenciaByIndicado(idIndicado)).rejects.toThrow(
        'Erro ao buscar referências por indicado: Nenhuma referência encontrada para este indicado'
      );
      expect(mockPrismaService.indicacaoReferencia.findMany).toHaveBeenCalledWith({
        where: { idIndicado },
        include: {
          ciclo: true,
          indicador: true,
        },
      });
    });

    it('deve lançar BadRequestException quando há erro no Prisma', async () => {
      // Arrange
      const idIndicado = '987e6543-e89b-12d3-a456-426614174003';
      const prismaError = new Error('Query timeout');
      mockPrismaService.indicacaoReferencia.findMany.mockRejectedValue(prismaError);

      // Act & Assert
      await expect(service.getReferenciaByIndicado(idIndicado)).rejects.toThrow(BadRequestException);
      await expect(service.getReferenciaByIndicado(idIndicado)).rejects.toThrow(
        'Erro ao buscar referências por indicado: Query timeout'
      );
    });

    it('deve incluir relacionamentos corretos na consulta por indicado', async () => {
      // Arrange
      const idIndicado = '987e6543-e89b-12d3-a456-426614174003';
      
      const mockReferenciasIndicado = [
        {
            idIndicacao: mockIndicacaoComRelacionamentos.idIndicacao,
            idCiclo: mockIndicacaoComRelacionamentos.idCiclo,
            idIndicador: mockIndicacaoComRelacionamentos.idIndicador,
            idIndicado: mockIndicacaoComRelacionamentos.idIndicado,
            tipo: mockIndicacaoComRelacionamentos.tipo,
            justificativa: mockIndicacaoComRelacionamentos.justificativa,
            ciclo: mockIndicacaoComRelacionamentos.ciclo,
            indicador: mockIndicacaoComRelacionamentos.indicador,
        },
      ];
  
      mockPrismaService.indicacaoReferencia.findMany.mockResolvedValue(mockReferenciasIndicado);

      // Act
      const resultado = await service.getReferenciaByIndicado(idIndicado);

      // Assert
      expect(resultado[0]).toHaveProperty('ciclo');
      expect(resultado[0]).toHaveProperty('indicador');
      expect(resultado[0]).not.toHaveProperty('indicado'); // Não deve incluir o próprio indicado
    });
  });

  describe('getReferenciaById', () => {
    it('deve retornar uma referência específica por ID', async () => {
      // Arrange
      const idIndicacao = '123e4567-e89b-12d3-a456-426614174000';
      mockPrismaService.indicacaoReferencia.findUnique.mockResolvedValue(mockIndicacaoComRelacionamentos);

      // Act
      const resultado = await service.getReferenciaById(idIndicacao);

      // Assert
      expect(resultado).toEqual(mockIndicacaoComRelacionamentos);
      expect(mockPrismaService.indicacaoReferencia.findUnique).toHaveBeenCalledWith({
        where: { idIndicacao },
        include: {
          ciclo: true,
          indicador: true,
          indicado: true,
        },
      });
      expect(mockPrismaService.indicacaoReferencia.findUnique).toHaveBeenCalledTimes(1);
    });

    it('deve lançar BadRequestException quando referência não encontrada', async () => {
      // Arrange
      const idIndicacao = 'id-inexistente';
      mockPrismaService.indicacaoReferencia.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getReferenciaById(idIndicacao)).rejects.toThrow(BadRequestException);
      await expect(service.getReferenciaById(idIndicacao)).rejects.toThrow(
        'Erro ao buscar referência: Referência não encontrada'
      );
      expect(mockPrismaService.indicacaoReferencia.findUnique).toHaveBeenCalledWith({
        where: { idIndicacao },
        include: {
          ciclo: true,
          indicador: true,
          indicado: true,
        },
      });
    });

    it('deve lançar BadRequestException quando há erro no Prisma', async () => {
      // Arrange
      const idIndicacao = '123e4567-e89b-12d3-a456-426614174000';
      const prismaError = new Error('Connection lost');
      mockPrismaService.indicacaoReferencia.findUnique.mockRejectedValue(prismaError);

      // Act & Assert
      await expect(service.getReferenciaById(idIndicacao)).rejects.toThrow(BadRequestException);
      await expect(service.getReferenciaById(idIndicacao)).rejects.toThrow(
        'Erro ao buscar referência: Connection lost'
      );
    });

    it('deve retornar referência com todos os relacionamentos', async () => {
      // Arrange
      const idIndicacao = '123e4567-e89b-12d3-a456-426614174000';
      mockPrismaService.indicacaoReferencia.findUnique.mockResolvedValue(mockIndicacaoComRelacionamentos);

      // Act
      const resultado = await service.getReferenciaById(idIndicacao);

      // Assert
      expect(resultado).toHaveProperty('ciclo');
      expect(resultado).toHaveProperty('indicador');
      expect(resultado).toHaveProperty('indicado');
      expect(resultado.ciclo).toHaveProperty('nomeCiclo');
      expect(resultado.indicador).toHaveProperty('nomeCompleto');
      expect(resultado.indicado).toHaveProperty('email');
    });
  });

  describe('Casos extremos e integração', () => {
    it('deve lidar com múltiplas operações simultâneas', async () => {
      // Arrange
      mockPrismaService.indicacaoReferencia.findMany.mockResolvedValue([mockIndicacao]);

      // Act
      const promessas = [
        service.getAllReferencias(),
        service.getAllReferencias(),
        service.getAllReferencias(),
      ];

      const resultados = await Promise.all(promessas);

      // Assert
      expect(resultados).toHaveLength(3);
      expect(mockPrismaService.indicacaoReferencia.findMany).toHaveBeenCalledTimes(3);
      resultados.forEach(resultado => {
        expect(resultado).toEqual([mockIndicacao]);
      });
    });

    it('deve propagar erros do Prisma corretamente', async () => {
      // Arrange
      const error = new Error('Database server down');
      mockPrismaService.indicacaoReferencia.findMany.mockRejectedValue(error);

      // Act & Assert
      await expect(service.getAllReferencias()).rejects.toThrow(BadRequestException);
      await expect(service.getAllReferencias()).rejects.toThrow('Database server down');
    });

    it('deve funcionar com UUIDs válidos', async () => {
      // Arrange
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      mockPrismaService.indicacaoReferencia.findUnique.mockResolvedValue(mockIndicacao);

      // Act
      const resultado = await service.getReferenciaById(validUUID);

      // Assert
      expect(resultado).toBeDefined();
      expect(resultado.idIndicacao).toBe(validUUID);
    });

    it('deve manter integridade dos dados durante operações CRUD', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      
      // Simular operação completa: create -> read -> update -> delete
      mockPrismaService.indicacaoReferencia.create.mockResolvedValue(mockIndicacao);
      mockPrismaService.indicacaoReferencia.findUnique.mockResolvedValue(mockIndicacao);
      mockPrismaService.indicacaoReferencia.update.mockResolvedValue({
        ...mockIndicacao,
        tipo: TipoReferencia.CULTURAL,
      });
      mockPrismaService.indicacaoReferencia.delete.mockResolvedValue(mockIndicacao);

      // Act
      const criado = await service.criarReferencia(criarReferenciaDto);
      const encontrado = await service.getReferenciaById(id);
      const atualizado = await service.atualizarReferencia(id, { tipo: TipoReferencia.CULTURAL });
      const removido = await service.deletarReferencia(id);

      // Assert
      expect(criado.idCiclo).toBe(criarReferenciaDto.idCiclo);
      expect(encontrado.idIndicacao).toBe(id);
      expect(atualizado.tipo).toBe(TipoReferencia.CULTURAL);
      expect(removido).toEqual({ message: 'Referência deletada com sucesso' });
    });
  });

  describe('Validação de tipos de referência', () => {
    it('deve criar referência TECNICA corretamente', async () => {
      // Arrange
      const dtoCriarTecnica = {
        ...criarReferenciaDto,
        tipo: TipoReferencia.TECNICA,
      };

      mockPrismaService.indicacaoReferencia.create.mockResolvedValue({
        ...mockIndicacao,
        tipo: TipoReferencia.TECNICA,
      });

      // Act
      const resultado = await service.criarReferencia(dtoCriarTecnica);

      // Assert
      expect(resultado.tipo).toBe(TipoReferencia.TECNICA);
    });

    it('deve criar referência CULTURAL corretamente', async () => {
      // Arrange
      const dtoCriarCultural = {
        ...criarReferenciaDto,
        tipo: TipoReferencia.CULTURAL,
      };

      mockPrismaService.indicacaoReferencia.create.mockResolvedValue({
        ...mockIndicacao,
        tipo: TipoReferencia.CULTURAL,
      });

      // Act
      const resultado = await service.criarReferencia(dtoCriarCultural);

      // Assert
      expect(resultado.tipo).toBe(TipoReferencia.CULTURAL);
    });

    it('deve atualizar tipo de TECNICA para CULTURAL', async () => {
      // Arrange
      const idIndicacao = '123e4567-e89b-12d3-a456-426614174000';
      const atualizarDto: AtualizarReferenciaDto = {
        tipo: TipoReferencia.CULTURAL,
      };

      mockPrismaService.indicacaoReferencia.findUnique.mockResolvedValue(mockIndicacao);
      mockPrismaService.indicacaoReferencia.update.mockResolvedValue({
        ...mockIndicacao,
        tipo: TipoReferencia.CULTURAL,
      });

      // Act
      const resultado = await service.atualizarReferencia(idIndicacao, atualizarDto);

      // Assert
      expect(resultado.tipo).toBe(TipoReferencia.CULTURAL);
    });
  });

  describe('Validação de estruturas de dados', () => {
    it('deve retornar estrutura correta para indicação completa', async () => {
      // Arrange
      mockPrismaService.indicacaoReferencia.create.mockResolvedValue(mockIndicacao);

      // Act
      const resultado = await service.criarReferencia(criarReferenciaDto);

      // Assert
      expect(resultado).toMatchObject({
        idIndicacao: expect.any(String),
        idCiclo: expect.any(String),
        idIndicador: expect.any(String),
        idIndicado: expect.any(String),
        tipo: expect.any(String),
        justificativa: expect.any(String),
      });
    });

    it('deve manter consistência de tipos nos retornos', async () => {
      // Arrange
      const idIndicacao = '123e4567-e89b-12d3-a456-426614174000';
      mockPrismaService.indicacaoReferencia.findUnique.mockResolvedValue(mockIndicacaoComRelacionamentos);

      // Act
      const resultado = await service.getReferenciaById(idIndicacao);

      // Assert
      expect(typeof resultado.idIndicacao).toBe('string');
      expect(typeof resultado.idCiclo).toBe('string');
      expect(typeof resultado.idIndicador).toBe('string');
      expect(typeof resultado.idIndicado).toBe('string');
      expect(typeof resultado.tipo).toBe('string');
      expect(typeof resultado.justificativa).toBe('string');
      expect(typeof resultado.ciclo.nomeCiclo).toBe('string');
      expect(typeof resultado.indicador.nomeCompleto).toBe('string');
      expect(typeof resultado.indicado.email).toBe('string');
    });
  });
});