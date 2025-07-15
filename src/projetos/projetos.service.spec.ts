import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ProjetosService } from './projetos.service';
import { PrismaService } from '../database/prismaService';
import { CreateProjetoDto, UpdateProjetoDto } from './projetos.dto';
import { CreateAlocacaoDto, UpdateAlocacaoDto } from './alocacao.dto';
import { projetoStatus } from '@prisma/client';

describe('ProjetosService', () => {
  let service: ProjetosService;
  let prismaService: PrismaService;

  // Mock do PrismaService
  const mockPrismaService = {
    projeto: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    colaborador: {
      findUnique: jest.fn(),
    },
    alocacaoColaboradorProjeto: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  // Dados de teste para projetos
  const mockCreateProjetoDto: CreateProjetoDto = {
    nomeProjeto: 'Projeto Teste',
    cliente: 'Cliente XYZ',
    dataInicio: '2026-01-01',
    dataFim: '2026-06-30',
    status: projetoStatus.PLANEJADO,
  };

  const mockUpdateProjetoDto: UpdateProjetoDto = {
    nomeProjeto: 'Projeto Atualizado',
    cliente: 'Cliente ABC',
    status: projetoStatus.EM_ANDAMENTO,
  };

  const mockProjeto = {
    idProjeto: '123e4567-e89b-12d3-a456-426614174000',
    nomeProjeto: 'Projeto Teste',
    cliente: 'Cliente XYZ',
    dataInicio: new Date('2026-01-01'),
    dataFim: new Date('2026-06-30'),
    status: projetoStatus.PLANEJADO,
    dataCriacao: new Date(),
  };

  const mockProjetoAtualizado = {
    ...mockProjeto,
    nomeProjeto: 'Projeto Atualizado',
    cliente: 'Cliente ABC',
    status: projetoStatus.EM_ANDAMENTO,
  };

  // Dados de teste para alocações
  const mockCreateAlocacaoDto: CreateAlocacaoDto = {
    idColaborador: '456e7890-f12g-34h5-i678-901234567890',
    dataEntrada: '2026-02-01',
    dataSaida: '2026-05-31',
  };

  const mockUpdateAlocacaoDto: UpdateAlocacaoDto = {
    dataEntrada: '2026-02-15',
    dataSaida: '2026-06-15',
  };

  const mockColaborador = {
    idColaborador: '456e7890-f12g-34h5-i678-901234567890',
    nomeCompleto: 'João Silva',
    email: 'joao@empresa.com',
    cargo: 'Desenvolvedor',
  };

  const mockAlocacao = {
    idAlocacao: 'aaa1111-bbb2-333c-444d-555555555555',
    idProjeto: mockProjeto.idProjeto,
    idColaborador: mockColaborador.idColaborador,
    dataEntrada: new Date('2026-02-01'),
    dataSaida: new Date('2026-05-31'),
  };

  const mockAlocacaoComColaborador = {
    ...mockAlocacao,
    colaborador: {
      idColaborador: mockColaborador.idColaborador,
      nomeCompleto: mockColaborador.nomeCompleto,
      email: mockColaborador.email,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjetosService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProjetosService>(ProjetosService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Definição do service', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('deve ter PrismaService injetado', () => {
      expect(prismaService).toBeDefined();
    });
  });

  describe('create', () => {
    it('deve criar um projeto com sucesso', async () => {
      // Arrange
      mockPrismaService.projeto.create.mockResolvedValue(mockProjeto);

      // Act
      const resultado = await service.create(mockCreateProjetoDto);

      // Assert
      expect(resultado).toEqual(mockProjeto);
      expect(mockPrismaService.projeto.create).toHaveBeenCalledWith({
        data: {
          nomeProjeto: mockCreateProjetoDto.nomeProjeto,
          cliente: mockCreateProjetoDto.cliente,
          dataInicio: new Date(mockCreateProjetoDto.dataInicio!),
          dataFim: new Date(mockCreateProjetoDto.dataFim!),
          status: mockCreateProjetoDto.status,
        },
      });
    });

    it('deve criar projeto sem datas opcionais', async () => {
      // Arrange
      const createDtoSemDatas: CreateProjetoDto = {
        nomeProjeto: 'Projeto Simples',
      };

      const projetoSemDatas = {
        ...mockProjeto,
        nomeProjeto: 'Projeto Simples',
        cliente: null,
        dataInicio: null,
        dataFim: null,
        status: null,
      };

      mockPrismaService.projeto.create.mockResolvedValue(projetoSemDatas);

      // Act
      const resultado = await service.create(createDtoSemDatas);

      // Assert
      expect(resultado).toEqual(projetoSemDatas);
      expect(mockPrismaService.projeto.create).toHaveBeenCalledWith({
        data: {
          nomeProjeto: 'Projeto Simples',
          cliente: undefined,
          dataInicio: undefined,
          dataFim: undefined,
          status: undefined,
        },
      });
    });

    it('deve propagar erro do Prisma', async () => {
      // Arrange
      const prismaError = new Error('Database error');
      mockPrismaService.projeto.create.mockRejectedValue(prismaError);

      // Act & Assert
      await expect(service.create(mockCreateProjetoDto)).rejects.toThrow(prismaError);
    });
  });

  describe('findAll', () => {
    it('deve retornar lista de projetos', async () => {
      // Arrange
      const listaProjetos = [mockProjeto, { ...mockProjeto, idProjeto: 'outro-id' }];
      mockPrismaService.projeto.findMany.mockResolvedValue(listaProjetos);

      // Act
      const resultado = await service.findAll();

      // Assert
      expect(resultado).toEqual(listaProjetos);
      expect(mockPrismaService.projeto.findMany).toHaveBeenCalledWith();
    });

    it('deve retornar lista vazia quando não há projetos', async () => {
      // Arrange
      mockPrismaService.projeto.findMany.mockResolvedValue([]);

      // Act
      const resultado = await service.findAll();

      // Assert
      expect(resultado).toEqual([]);
    });

    it('deve propagar erro do Prisma', async () => {
      // Arrange
      const prismaError = new Error('Database connection failed');
      mockPrismaService.projeto.findMany.mockRejectedValue(prismaError);

      // Act & Assert
      await expect(service.findAll()).rejects.toThrow(prismaError);
    });
  });

  describe('findOne', () => {
    it('deve retornar projeto quando encontrado', async () => {
      // Arrange
      mockPrismaService.projeto.findUnique.mockResolvedValue(mockProjeto);

      // Act
      const resultado = await service.findOne(mockProjeto.idProjeto);

      // Assert
      expect(resultado).toEqual(mockProjeto);
      expect(mockPrismaService.projeto.findUnique).toHaveBeenCalledWith({
        where: { idProjeto: mockProjeto.idProjeto },
      });
    });

    it('deve lançar NotFoundException quando projeto não encontrado', async () => {
      // Arrange
      const idInexistente = 'id-inexistente';
      mockPrismaService.projeto.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(idInexistente)).rejects.toThrow(
        new NotFoundException(`Projeto com ID "${idInexistente}" não encontrado.`)
      );
    });

    it('deve propagar erro do Prisma', async () => {
      // Arrange
      const prismaError = new Error('Database error');
      mockPrismaService.projeto.findUnique.mockRejectedValue(prismaError);

      // Act & Assert
      await expect(service.findOne(mockProjeto.idProjeto)).rejects.toThrow(prismaError);
    });
  });

  describe('update', () => {
    it('deve atualizar projeto com sucesso', async () => {
      // Arrange
      mockPrismaService.projeto.findUnique.mockResolvedValue(mockProjeto);
      mockPrismaService.projeto.update.mockResolvedValue(mockProjetoAtualizado);

      // Act
      const resultado = await service.update(mockProjeto.idProjeto, mockUpdateProjetoDto);

      // Assert
      expect(resultado).toEqual(mockProjetoAtualizado);
      expect(mockPrismaService.projeto.findUnique).toHaveBeenCalledWith({
        where: { idProjeto: mockProjeto.idProjeto },
      });
      expect(mockPrismaService.projeto.update).toHaveBeenCalledWith({
        where: { idProjeto: mockProjeto.idProjeto },
        data: {
          nomeProjeto: mockUpdateProjetoDto.nomeProjeto,
          cliente: mockUpdateProjetoDto.cliente,
          dataInicio: undefined,
          dataFim: undefined,
          status: mockUpdateProjetoDto.status,
        },
      });
    });

    it('deve atualizar projeto com datas', async () => {
      // Arrange
      const updateComDatas: UpdateProjetoDto = {
        dataInicio: '2026-03-01',
        dataFim: '2026-08-31',
      };

      mockPrismaService.projeto.findUnique.mockResolvedValue(mockProjeto);
      mockPrismaService.projeto.update.mockResolvedValue({
        ...mockProjeto,
        dataInicio: new Date('2026-03-01'),
        dataFim: new Date('2026-08-31'),
      });

      // Act
      const resultado = await service.update(mockProjeto.idProjeto, updateComDatas);

      // Assert
      expect(mockPrismaService.projeto.update).toHaveBeenCalledWith({
        where: { idProjeto: mockProjeto.idProjeto },
        data: {
          nomeProjeto: undefined,
          cliente: undefined,
          dataInicio: new Date('2026-03-01'),
          dataFim: new Date('2026-08-31'),
          status: undefined,
        },
      });
    });

    it('deve lançar NotFoundException quando projeto não encontrado', async () => {
      // Arrange
      const idInexistente = 'id-inexistente';
      mockPrismaService.projeto.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(idInexistente, mockUpdateProjetoDto)).rejects.toThrow(
        new NotFoundException(`Projeto com ID "${idInexistente}" não encontrado.`)
      );
    });

    it('deve propagar erro do Prisma no update', async () => {
      // Arrange
      mockPrismaService.projeto.findUnique.mockResolvedValue(mockProjeto);
      const prismaError = new Error('Update failed');
      mockPrismaService.projeto.update.mockRejectedValue(prismaError);

      // Act & Assert
      await expect(service.update(mockProjeto.idProjeto, mockUpdateProjetoDto)).rejects.toThrow(prismaError);
    });
  });

  describe('remove', () => {
    it('deve remover projeto com sucesso', async () => {
      // Arrange
      mockPrismaService.projeto.findUnique.mockResolvedValue(mockProjeto);
      mockPrismaService.projeto.delete.mockResolvedValue(mockProjeto);

      // Act
      const resultado = await service.remove(mockProjeto.idProjeto);

      // Assert
      expect(resultado).toEqual(mockProjeto);
      expect(mockPrismaService.projeto.findUnique).toHaveBeenCalledWith({
        where: { idProjeto: mockProjeto.idProjeto },
      });
      expect(mockPrismaService.projeto.delete).toHaveBeenCalledWith({
        where: { idProjeto: mockProjeto.idProjeto },
      });
    });

    it('deve lançar NotFoundException quando projeto não encontrado', async () => {
      // Arrange
      const idInexistente = 'id-inexistente';
      mockPrismaService.projeto.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove(idInexistente)).rejects.toThrow(
        new NotFoundException(`Projeto com ID "${idInexistente}" não encontrado.`)
      );
    });

    it('deve propagar erro do Prisma no delete', async () => {
      // Arrange
      mockPrismaService.projeto.findUnique.mockResolvedValue(mockProjeto);
      const prismaError = new Error('Delete failed');
      mockPrismaService.projeto.delete.mockRejectedValue(prismaError);

      // Act & Assert
      await expect(service.remove(mockProjeto.idProjeto)).rejects.toThrow(prismaError);
    });
  });

  describe('alocarColaborador', () => {
    it('deve alocar colaborador com sucesso', async () => {
      // Arrange
      mockPrismaService.projeto.findUnique.mockResolvedValue(mockProjeto);
      mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
      mockPrismaService.alocacaoColaboradorProjeto.findFirst.mockResolvedValue(null);
      mockPrismaService.alocacaoColaboradorProjeto.create.mockResolvedValue(mockAlocacao);

      // Act
      const resultado = await service.alocarColaborador(mockProjeto.idProjeto, mockCreateAlocacaoDto);

      // Assert
      expect(resultado).toEqual(mockAlocacao);
      expect(mockPrismaService.projeto.findUnique).toHaveBeenCalledWith({
        where: { idProjeto: mockProjeto.idProjeto },
      });
      expect(mockPrismaService.colaborador.findUnique).toHaveBeenCalledWith({
        where: { idColaborador: mockCreateAlocacaoDto.idColaborador },
      });
      expect(mockPrismaService.alocacaoColaboradorProjeto.findFirst).toHaveBeenCalledWith({
        where: { 
          idProjeto: mockProjeto.idProjeto, 
          idColaborador: mockCreateAlocacaoDto.idColaborador 
        },
      });
      expect(mockPrismaService.alocacaoColaboradorProjeto.create).toHaveBeenCalledWith({          data: {
            idProjeto: mockProjeto.idProjeto,
            idColaborador: mockCreateAlocacaoDto.idColaborador,
            dataEntrada: new Date(mockCreateAlocacaoDto.dataEntrada),
            dataSaida: new Date(mockCreateAlocacaoDto.dataSaida!),
          },
      });
    });

    it('deve alocar colaborador sem data de saída', async () => {
      // Arrange
      const alocacaoSemDataSaida: CreateAlocacaoDto = {
        idColaborador: mockColaborador.idColaborador,
        dataEntrada: '2026-02-01',
      };

      mockPrismaService.projeto.findUnique.mockResolvedValue(mockProjeto);
      mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
      mockPrismaService.alocacaoColaboradorProjeto.findFirst.mockResolvedValue(null);
      mockPrismaService.alocacaoColaboradorProjeto.create.mockResolvedValue({
        ...mockAlocacao,
        dataSaida: null,
      });

      // Act
      const resultado = await service.alocarColaborador(mockProjeto.idProjeto, alocacaoSemDataSaida);

      // Assert
      expect(mockPrismaService.alocacaoColaboradorProjeto.create).toHaveBeenCalledWith({
        data: {
          idProjeto: mockProjeto.idProjeto,
          idColaborador: alocacaoSemDataSaida.idColaborador,
          dataEntrada: new Date(alocacaoSemDataSaida.dataEntrada),
          dataSaida: null,
        },
      });
    });

    it('deve lançar NotFoundException quando projeto não encontrado', async () => {
      // Arrange
      const idProjetoInexistente = 'projeto-inexistente';
      mockPrismaService.projeto.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.alocarColaborador(idProjetoInexistente, mockCreateAlocacaoDto)).rejects.toThrow(
        new NotFoundException(`Projeto com ID "${idProjetoInexistente}" não encontrado.`)
      );
    });

    it('deve lançar NotFoundException quando colaborador não encontrado', async () => {
      // Arrange
      const idColaboradorInexistente = 'colaborador-inexistente';
      const alocacaoComColaboradorInexistente: CreateAlocacaoDto = {
        ...mockCreateAlocacaoDto,
        idColaborador: idColaboradorInexistente,
      };

      mockPrismaService.projeto.findUnique.mockResolvedValue(mockProjeto);
      mockPrismaService.colaborador.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.alocarColaborador(mockProjeto.idProjeto, alocacaoComColaboradorInexistente)).rejects.toThrow(
        new NotFoundException(`Colaborador com ID "${idColaboradorInexistente}" não encontrado.`)
      );
    });

    it('deve lançar ConflictException quando colaborador já está alocado', async () => {
      // Arrange
      mockPrismaService.projeto.findUnique.mockResolvedValue(mockProjeto);
      mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
      mockPrismaService.alocacaoColaboradorProjeto.findFirst.mockResolvedValue(mockAlocacao);

      // Act & Assert
      await expect(service.alocarColaborador(mockProjeto.idProjeto, mockCreateAlocacaoDto)).rejects.toThrow(
        new ConflictException('Este colaborador já está alocado neste projeto.')
      );
    });

    it('deve propagar erro do Prisma na criação da alocação', async () => {
      // Arrange
      mockPrismaService.projeto.findUnique.mockResolvedValue(mockProjeto);
      mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
      mockPrismaService.alocacaoColaboradorProjeto.findFirst.mockResolvedValue(null);
      const prismaError = new Error('Create allocation failed');
      mockPrismaService.alocacaoColaboradorProjeto.create.mockRejectedValue(prismaError);

      // Act & Assert
      await expect(service.alocarColaborador(mockProjeto.idProjeto, mockCreateAlocacaoDto)).rejects.toThrow(prismaError);
    });
  });

  describe('listarAlocacoesPorProjeto', () => {
    it('deve listar alocações de um projeto com sucesso', async () => {
      // Arrange
      const listaAlocacoes = [mockAlocacaoComColaborador];
      mockPrismaService.projeto.findUnique.mockResolvedValue(mockProjeto);
      mockPrismaService.alocacaoColaboradorProjeto.findMany.mockResolvedValue(listaAlocacoes);

      // Act
      const resultado = await service.listarAlocacoesPorProjeto(mockProjeto.idProjeto);

      // Assert
      expect(resultado).toEqual(listaAlocacoes);
      expect(mockPrismaService.projeto.findUnique).toHaveBeenCalledWith({
        where: { idProjeto: mockProjeto.idProjeto },
      });
      expect(mockPrismaService.alocacaoColaboradorProjeto.findMany).toHaveBeenCalledWith({
        where: { idProjeto: mockProjeto.idProjeto },
        include: {
          colaborador: {
            select: {
              idColaborador: true,
              nomeCompleto: true,
              email: true,
            },
          },
        },
      });
    });

    it('deve retornar lista vazia quando projeto não tem alocações', async () => {
      // Arrange
      mockPrismaService.projeto.findUnique.mockResolvedValue(mockProjeto);
      mockPrismaService.alocacaoColaboradorProjeto.findMany.mockResolvedValue([]);

      // Act
      const resultado = await service.listarAlocacoesPorProjeto(mockProjeto.idProjeto);

      // Assert
      expect(resultado).toEqual([]);
    });

    it('deve lançar NotFoundException quando projeto não encontrado', async () => {
      // Arrange
      const idInexistente = 'projeto-inexistente';
      mockPrismaService.projeto.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.listarAlocacoesPorProjeto(idInexistente)).rejects.toThrow(
        new NotFoundException(`Projeto com ID "${idInexistente}" não encontrado.`)
      );
    });

    it('deve propagar erro do Prisma', async () => {
      // Arrange
      mockPrismaService.projeto.findUnique.mockResolvedValue(mockProjeto);
      const prismaError = new Error('Database error');
      mockPrismaService.alocacaoColaboradorProjeto.findMany.mockRejectedValue(prismaError);

      // Act & Assert
      await expect(service.listarAlocacoesPorProjeto(mockProjeto.idProjeto)).rejects.toThrow(prismaError);
    });
  });

  describe('atualizarAlocacao', () => {
    it('deve atualizar alocação com sucesso', async () => {
      // Arrange
      const alocacaoAtualizada = {
        ...mockAlocacao,
        dataEntrada: new Date('2026-02-15'),
        dataSaida: new Date('2026-06-15'),
      };

      mockPrismaService.alocacaoColaboradorProjeto.findUnique.mockResolvedValue(mockAlocacao);
      mockPrismaService.alocacaoColaboradorProjeto.update.mockResolvedValue(alocacaoAtualizada);

      // Act
      const resultado = await service.atualizarAlocacao(mockAlocacao.idAlocacao, mockUpdateAlocacaoDto);

      // Assert
      expect(resultado).toEqual(alocacaoAtualizada);
      expect(mockPrismaService.alocacaoColaboradorProjeto.findUnique).toHaveBeenCalledWith({
        where: { idAlocacao: mockAlocacao.idAlocacao },
      });
      expect(mockPrismaService.alocacaoColaboradorProjeto.update).toHaveBeenCalledWith({
        where: { idAlocacao: mockAlocacao.idAlocacao },
        data: {
          dataEntrada: new Date(mockUpdateAlocacaoDto.dataEntrada!),
          dataSaida: new Date(mockUpdateAlocacaoDto.dataSaida!),
        },
      });
    });

    it('deve atualizar alocação sem datas fornecidas', async () => {
      // Arrange
      const updateSemDatas: UpdateAlocacaoDto = {};
      mockPrismaService.alocacaoColaboradorProjeto.findUnique.mockResolvedValue(mockAlocacao);
      mockPrismaService.alocacaoColaboradorProjeto.update.mockResolvedValue(mockAlocacao);

      // Act
      const resultado = await service.atualizarAlocacao(mockAlocacao.idAlocacao, updateSemDatas);

      // Assert
      expect(mockPrismaService.alocacaoColaboradorProjeto.update).toHaveBeenCalledWith({
        where: { idAlocacao: mockAlocacao.idAlocacao },
        data: {
          dataEntrada: undefined,
          dataSaida: undefined,
        },
      });
    });

    it('deve lançar NotFoundException quando alocação não encontrada', async () => {
      // Arrange
      const idInexistente = 'alocacao-inexistente';
      mockPrismaService.alocacaoColaboradorProjeto.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.atualizarAlocacao(idInexistente, mockUpdateAlocacaoDto)).rejects.toThrow(
        new NotFoundException(`Alocação com ID "${idInexistente}" não encontrada.`)
      );
    });

    it('deve propagar erro do Prisma no update', async () => {
      // Arrange
      mockPrismaService.alocacaoColaboradorProjeto.findUnique.mockResolvedValue(mockAlocacao);
      const prismaError = new Error('Update failed');
      mockPrismaService.alocacaoColaboradorProjeto.update.mockRejectedValue(prismaError);

      // Act & Assert
      await expect(service.atualizarAlocacao(mockAlocacao.idAlocacao, mockUpdateAlocacaoDto)).rejects.toThrow(prismaError);
    });
  });

  describe('removerAlocacao', () => {
    it('deve remover alocação com sucesso', async () => {
      // Arrange
      mockPrismaService.alocacaoColaboradorProjeto.findUnique.mockResolvedValue(mockAlocacao);
      mockPrismaService.alocacaoColaboradorProjeto.delete.mockResolvedValue(mockAlocacao);

      // Act
      const resultado = await service.removerAlocacao(mockAlocacao.idAlocacao);

      // Assert
      expect(resultado).toEqual(mockAlocacao);
      expect(mockPrismaService.alocacaoColaboradorProjeto.findUnique).toHaveBeenCalledWith({
        where: { idAlocacao: mockAlocacao.idAlocacao },
      });
      expect(mockPrismaService.alocacaoColaboradorProjeto.delete).toHaveBeenCalledWith({
        where: { idAlocacao: mockAlocacao.idAlocacao },
      });
    });

    it('deve lançar NotFoundException quando alocação não encontrada', async () => {
      // Arrange
      const idInexistente = 'alocacao-inexistente';
      mockPrismaService.alocacaoColaboradorProjeto.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.removerAlocacao(idInexistente)).rejects.toThrow(
        new NotFoundException(`Alocação com ID "${idInexistente}" não encontrada.`)
      );
    });

    it('deve propagar erro do Prisma no delete', async () => {
      // Arrange
      mockPrismaService.alocacaoColaboradorProjeto.findUnique.mockResolvedValue(mockAlocacao);
      const prismaError = new Error('Delete failed');
      mockPrismaService.alocacaoColaboradorProjeto.delete.mockRejectedValue(prismaError);

      // Act & Assert
      await expect(service.removerAlocacao(mockAlocacao.idAlocacao)).rejects.toThrow(prismaError);
    });
  });

  describe('Testes de integração simulada', () => {
    it('deve simular fluxo completo de criação de projeto e alocação de colaborador', async () => {
      // Arrange
      mockPrismaService.projeto.create.mockResolvedValue(mockProjeto);
      mockPrismaService.projeto.findUnique.mockResolvedValue(mockProjeto);
      mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
      mockPrismaService.alocacaoColaboradorProjeto.findFirst.mockResolvedValue(null);
      mockPrismaService.alocacaoColaboradorProjeto.create.mockResolvedValue(mockAlocacao);
      mockPrismaService.alocacaoColaboradorProjeto.findMany.mockResolvedValue([mockAlocacaoComColaborador]);

      // Act - Criar projeto
      const novoProjeto = await service.create(mockCreateProjetoDto);
      
      // Act - Alocar colaborador
      const alocacao = await service.alocarColaborador(novoProjeto.idProjeto, mockCreateAlocacaoDto);
      
      // Act - Listar alocações
      const alocacoes = await service.listarAlocacoesPorProjeto(novoProjeto.idProjeto);

      // Assert
      expect(novoProjeto).toEqual(mockProjeto);
      expect(alocacao).toEqual(mockAlocacao);
      expect(alocacoes).toEqual([mockAlocacaoComColaborador]);
      expect(alocacoes[0]).toHaveProperty('colaborador');
      expect(alocacoes[0].colaborador).toHaveProperty('nomeCompleto');
    });

    it('deve simular fluxo de atualização de projeto e remoção de alocação', async () => {
      // Arrange
      mockPrismaService.projeto.findUnique.mockResolvedValue(mockProjeto);
      mockPrismaService.projeto.update.mockResolvedValue(mockProjetoAtualizado);
      mockPrismaService.alocacaoColaboradorProjeto.findUnique.mockResolvedValue(mockAlocacao);
      mockPrismaService.alocacaoColaboradorProjeto.delete.mockResolvedValue(mockAlocacao);

      // Act - Atualizar projeto
      const projetoAtualizado = await service.update(mockProjeto.idProjeto, mockUpdateProjetoDto);
      
      // Act - Remover alocação
      const alocacaoRemovida = await service.removerAlocacao(mockAlocacao.idAlocacao);

      // Assert
      expect(projetoAtualizado).toEqual(mockProjetoAtualizado);
      expect(alocacaoRemovida).toEqual(mockAlocacao);
    });
  });

  describe('Validação de tipos e status', () => {
    it('deve trabalhar com todos os status de projeto', async () => {
      // Arrange
      const statusList = [
        projetoStatus.PLANEJADO,
        projetoStatus.EM_ANDAMENTO,
        projetoStatus.CONCLUIDO,
        projetoStatus.CANCELADO,
      ];

      for (const status of statusList) {
        const createDto: CreateProjetoDto = {
          nomeProjeto: `Projeto ${status}`,
          status,
        };

        const projetoComStatus = { ...mockProjeto, status, nomeProjeto: `Projeto ${status}` };
        mockPrismaService.projeto.create.mockResolvedValue(projetoComStatus);

        // Act
        const resultado = await service.create(createDto);

        // Assert
        expect(resultado.status).toBe(status);
      }
    });

    it('deve converter strings de data para objetos Date', async () => {
      // Arrange
      mockPrismaService.projeto.create.mockImplementation((params) => {
        // Verificar se as datas foram convertidas corretamente
        expect(params.data.dataInicio).toBeInstanceOf(Date);
        expect(params.data.dataFim).toBeInstanceOf(Date);
        return Promise.resolve(mockProjeto);
      });

      // Act
      await service.create(mockCreateProjetoDto);

      // Assert
      // Verificações estão na implementação do mock acima
    });

    it('deve retornar objetos com propriedades corretas', async () => {
      // Arrange
      mockPrismaService.projeto.findUnique.mockResolvedValue(mockProjeto);

      // Act
      const resultado = await service.findOne(mockProjeto.idProjeto);

      // Assert
      expect(resultado).toHaveProperty('idProjeto');
      expect(resultado).toHaveProperty('nomeProjeto');
      expect(resultado).toHaveProperty('cliente');
      expect(resultado).toHaveProperty('dataInicio');
      expect(resultado).toHaveProperty('dataFim');
      expect(resultado).toHaveProperty('status');
      expect(typeof resultado.idProjeto).toBe('string');
      expect(typeof resultado.nomeProjeto).toBe('string');
    });
  });
});
