import { Test, TestingModule } from '@nestjs/testing';
import { EqualizacaoService } from './equalizacao.service';
import { PrismaService } from '../database/prismaService';
import { CreateEqualizacaoDto, UpdateEqualizacaoDto } from './equalizacao.dto';
import { preenchimentoStatus } from '@prisma/client';
import { 
  BadRequestException, 
  NotFoundException,
  Logger
} from '@nestjs/common';

describe('EqualizacaoService', () => {
  let service: EqualizacaoService;
  let prismaService: PrismaService;
  let loggerSpy: jest.SpyInstance;

  // Mock do PrismaService
  const mockPrismaService = {
    cicloAvaliacao: {
      findUnique: jest.fn(),
    },
    colaboradorCiclo: {
      findMany: jest.fn(),
    },
    equalizacao: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
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

  const mockParticipantes = [
    {
      idColaborador: mockColaborador1.idColaborador,
      idCiclo: mockCiclo.idCiclo,
      colaborador: mockColaborador1,
    },
    {
      idColaborador: mockColaborador2.idColaborador,
      idCiclo: mockCiclo.idCiclo,
      colaborador: mockColaborador2,
    },
  ];

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
      providers: [
        EqualizacaoService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<EqualizacaoService>(EqualizacaoService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Mock do Logger
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
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
    it('deve criar equalizações para todos os colaboradores do ciclo', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.colaboradorCiclo.findMany.mockResolvedValue(mockParticipantes);
      mockPrismaService.equalizacao.findFirst.mockResolvedValue(null);
      mockPrismaService.equalizacao.create
        .mockResolvedValueOnce({ ...mockEqualizacao, alvo: mockColaborador1 })
        .mockResolvedValueOnce({ 
          ...mockEqualizacao, 
          idEqualizacao: 'another-id',
          idAvaliado: mockColaborador2.idColaborador,
          alvo: mockColaborador2 
        });

      // Act
      const resultado = await service.create(createEqualizacaoDto);

      // Assert
      expect(resultado).toEqual({
        message: 'Equalizações criadas com sucesso para 2 colaboradores',
        total: 2,
        novasEqualizacoes: 2,
        equalizacoes: expect.arrayContaining([
          expect.objectContaining({ alvo: mockColaborador1 }),
          expect.objectContaining({ alvo: mockColaborador2 }),
        ]),
      });

      expect(mockPrismaService.cicloAvaliacao.findUnique).toHaveBeenCalledWith({
        where: { idCiclo: createEqualizacaoDto.idCiclo },
      });
      expect(mockPrismaService.colaboradorCiclo.findMany).toHaveBeenCalledWith({
        where: { idCiclo: createEqualizacaoDto.idCiclo },
        include: { colaborador: true },
      });
      expect(mockPrismaService.equalizacao.create).toHaveBeenCalledTimes(2);
    });

    it('deve lançar NotFoundException quando ciclo não existe', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createEqualizacaoDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createEqualizacaoDto)).rejects.toThrow(
        `Ciclo com ID ${createEqualizacaoDto.idCiclo} não encontrado`
      );
      expect(mockPrismaService.cicloAvaliacao.findUnique).toHaveBeenCalledWith({
        where: { idCiclo: createEqualizacaoDto.idCiclo },
      });
      expect(mockPrismaService.colaboradorCiclo.findMany).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequestException quando ciclo não possui participantes', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.colaboradorCiclo.findMany.mockResolvedValue([]);

      // Act & Assert
      await expect(service.create(createEqualizacaoDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createEqualizacaoDto)).rejects.toThrow(
        'Ciclo não possui participantes para equalização'
      );
      expect(mockPrismaService.colaboradorCiclo.findMany).toHaveBeenCalledWith({
        where: { idCiclo: createEqualizacaoDto.idCiclo },
        include: { colaborador: true },
      });
    });

    it('deve pular colaboradores que já possuem equalização', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.colaboradorCiclo.findMany.mockResolvedValue(mockParticipantes);
      mockPrismaService.equalizacao.findFirst
        .mockResolvedValueOnce(mockEqualizacao) // Já existe para o primeiro
        .mockResolvedValueOnce(null); // Não existe para o segundo
      mockPrismaService.equalizacao.create.mockResolvedValueOnce({
        ...mockEqualizacao,
        idAvaliado: mockColaborador2.idColaborador,
        alvo: mockColaborador2,
      });

      // Act
      const resultado = await service.create(createEqualizacaoDto);

      // Assert
      expect(resultado).toEqual({
        message: 'Equalizações criadas com sucesso para 1 colaboradores',
        total: 2,
        novasEqualizacoes: 1,
        equalizacoes: expect.arrayContaining([
          expect.objectContaining({ 
            idAvaliado: mockColaborador2.idColaborador,
            alvo: mockColaborador2 
          }),
        ]),
      });
      expect(mockPrismaService.equalizacao.create).toHaveBeenCalledTimes(1);
    });

    it('deve continuar criando equalizações mesmo se uma falhar', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.colaboradorCiclo.findMany.mockResolvedValue(mockParticipantes);
      mockPrismaService.equalizacao.findFirst.mockResolvedValue(null);
      mockPrismaService.equalizacao.create
        .mockRejectedValueOnce(new Error('Erro de banco')) // Falha para o primeiro
        .mockResolvedValueOnce({ 
          ...mockEqualizacao, 
          idAvaliado: mockColaborador2.idColaborador,
          alvo: mockColaborador2 
        }); // Sucesso para o segundo

      // Act
      const resultado = await service.create(createEqualizacaoDto);

      // Assert
      expect(resultado).toEqual({
        message: 'Equalizações criadas com sucesso para 1 colaboradores',
        total: 2,
        novasEqualizacoes: 1,
        equalizacoes: expect.arrayContaining([
          expect.objectContaining({ 
            idAvaliado: mockColaborador2.idColaborador,
            alvo: mockColaborador2 
          }),
        ]),
      });
      expect(mockPrismaService.equalizacao.create).toHaveBeenCalledTimes(2);
    });

    it('deve fazer log correto durante o processo', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.colaboradorCiclo.findMany.mockResolvedValue(mockParticipantes);
      mockPrismaService.equalizacao.findFirst.mockResolvedValue(null);
      mockPrismaService.equalizacao.create
        .mockResolvedValueOnce({ ...mockEqualizacao, alvo: mockColaborador1 })
        .mockResolvedValueOnce({ 
          ...mockEqualizacao, 
          idEqualizacao: 'another-id',
          idAvaliado: mockColaborador2.idColaborador,
          alvo: mockColaborador2 
        });

      // Act
      await service.create(createEqualizacaoDto);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        `Lançando equalizações para todos os colaboradores do ciclo: ${createEqualizacaoDto.idCiclo}`
      );
      expect(loggerSpy).toHaveBeenCalledWith('Encontrados 2 participantes no ciclo');
      expect(loggerSpy).toHaveBeenCalledWith(
        'Criadas 2 novas equalizações de um total de 2 participantes'
      );
    });

    it('deve retornar estrutura correta quando nenhuma equalização é criada', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.colaboradorCiclo.findMany.mockResolvedValue(mockParticipantes);
      mockPrismaService.equalizacao.findFirst.mockResolvedValue(mockEqualizacao); // Já existem

      // Act
      const resultado = await service.create(createEqualizacaoDto);

      // Assert
      expect(resultado).toEqual({
        message: 'Equalizações criadas com sucesso para 0 colaboradores',
        total: 2,
        novasEqualizacoes: 0,
        equalizacoes: [],
      });
    });
  });

  describe('findAll', () => {
    it('deve retornar todas as equalizações com relacionamentos', async () => {
      // Arrange
      const mockEqualizacoes = [
        mockEqualizacaoComRelacionamentos,
        {
          ...mockEqualizacaoComRelacionamentos,
          idEqualizacao: 'another-id',
          idAvaliado: mockColaborador2.idColaborador,
          alvo: {
            nomeCompleto: mockColaborador2.nomeCompleto,
            cargo: mockColaborador2.cargo,
            unidade: mockColaborador2.unidade,
            trilhaCarreira: mockColaborador2.trilhaCarreira,
          },
        },
      ];

      mockPrismaService.equalizacao.findMany.mockResolvedValue(mockEqualizacoes);

      // Act
      const resultado = await service.findAll();

      // Assert
      expect(resultado).toEqual(mockEqualizacoes);
      expect(mockPrismaService.equalizacao.findMany).toHaveBeenCalledWith({
        include: {
          alvo: {
            select: {
              nomeCompleto: true,
              cargo: true,
              unidade: true,
              trilhaCarreira: true,
            },
          },
        },
      });
      expect(loggerSpy).toHaveBeenCalledWith('Buscando todas as equalizações');
    });

    it('deve retornar array vazio quando não há equalizações', async () => {
      // Arrange
      mockPrismaService.equalizacao.findMany.mockResolvedValue([]);

      // Act
      const resultado = await service.findAll();

      // Assert
      expect(resultado).toEqual([]);
      expect(mockPrismaService.equalizacao.findMany).toHaveBeenCalledTimes(1);
    });

    it('deve incluir apenas campos específicos do alvo', async () => {
      // Arrange
      mockPrismaService.equalizacao.findMany.mockResolvedValue([mockEqualizacaoComRelacionamentos]);

      // Act
      await service.findAll();

      // Assert
      expect(mockPrismaService.equalizacao.findMany).toHaveBeenCalledWith({
        include: {
          alvo: {
            select: {
              nomeCompleto: true,
              cargo: true,
              unidade: true,
              trilhaCarreira: true,
            },
          },
        },
      });
    });
  });

  describe('findByAvaliado', () => {
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

      mockPrismaService.equalizacao.findMany.mockResolvedValue(mockEqualizacoesAvaliado);

      // Act
      const resultado = await service.findByAvaliado(idAvaliado);

      // Assert
      expect(resultado).toEqual(mockEqualizacoesAvaliado);
      expect(mockPrismaService.equalizacao.findMany).toHaveBeenCalledWith({
        where: { idAvaliado },
        include: {
          alvo: {
            select: {
              nomeCompleto: true,
              cargo: true,
            },
          },
        },
        orderBy: {
          dataEqualizacao: 'desc',
        },
      });
      expect(loggerSpy).toHaveBeenCalledWith(`Buscando equalizações para avaliado: ${idAvaliado}`);
    });

    it('deve retornar array vazio quando avaliado não tem equalizações', async () => {
      // Arrange
      const idAvaliado = 'avaliado-sem-equalizacoes';
      mockPrismaService.equalizacao.findMany.mockResolvedValue([]);

      // Act
      const resultado = await service.findByAvaliado(idAvaliado);

      // Assert
      expect(resultado).toEqual([]);
      expect(mockPrismaService.equalizacao.findMany).toHaveBeenCalledWith({
        where: { idAvaliado },
        include: {
          alvo: {
            select: {
              nomeCompleto: true,
              cargo: true,
            },
          },
        },
        orderBy: {
          dataEqualizacao: 'desc',
        },
      });
    });

    it('deve ordenar por data de equalização descendente', async () => {
      // Arrange
      const idAvaliado = mockColaborador1.idColaborador;
      mockPrismaService.equalizacao.findMany.mockResolvedValue([]);

      // Act
      await service.findByAvaliado(idAvaliado);

      // Assert
      expect(mockPrismaService.equalizacao.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            dataEqualizacao: 'desc',
          },
        })
      );
    });
  });

  describe('findByComite', () => {
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

      mockPrismaService.equalizacao.findMany.mockResolvedValue(mockEqualizacoesComite);

      // Act
      const resultado = await service.findByComite(idMembroComite);

      // Assert
      expect(resultado).toEqual(mockEqualizacoesComite);
      expect(mockPrismaService.equalizacao.findMany).toHaveBeenCalledWith({
        where: { idMembroComite },
        include: {
          alvo: {
            select: {
              nomeCompleto: true,
              cargo: true,
            },
          },
        },
        orderBy: {
          dataEqualizacao: 'desc',
        },
      });
      expect(loggerSpy).toHaveBeenCalledWith(
        `Buscando equalizações realizadas pelo membro do comitê: ${idMembroComite}`
      );
    });

    it('deve retornar array vazio quando membro do comitê não fez equalizações', async () => {
      // Arrange
      const idMembroComite = 'membro-sem-equalizacoes';
      mockPrismaService.equalizacao.findMany.mockResolvedValue([]);

      // Act
      const resultado = await service.findByComite(idMembroComite);

      // Assert
      expect(resultado).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('deve retornar uma equalização específica com relacionamentos completos', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const mockEqualizacaoCompleta = {
        ...mockEqualizacaoComRelacionamentos,
        membroComite: {
          idColaborador: 'membro-comite-id',
          nomeCompleto: 'Comitê Membro',
        },
      };

      mockPrismaService.equalizacao.findUnique.mockResolvedValue(mockEqualizacaoCompleta);

      // Act
      const resultado = await service.findOne(idEqualizacao);

      // Assert
      expect(resultado).toEqual(mockEqualizacaoCompleta);
      expect(mockPrismaService.equalizacao.findUnique).toHaveBeenCalledWith({
        where: { idEqualizacao },
        include: {
          alvo: {
            select: {
              idColaborador: true,
              nomeCompleto: true,
              cargo: true,
              unidade: true,
              trilhaCarreira: true,
            },
          },
          membroComite: {
            select: {
              idColaborador: true,
              nomeCompleto: true,
            },
          },
        },
      });
      expect(loggerSpy).toHaveBeenCalledWith(`Buscando equalização: ${idEqualizacao}`);
    });

    it('deve lançar NotFoundException quando equalização não encontrada', async () => {
      // Arrange
      const idEqualizacao = 'id-inexistente';
      mockPrismaService.equalizacao.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(idEqualizacao)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(idEqualizacao)).rejects.toThrow(
        `Equalização com ID ${idEqualizacao} não encontrada`
      );
      expect(mockPrismaService.equalizacao.findUnique).toHaveBeenCalledWith({
        where: { idEqualizacao },
        include: {
          alvo: {
            select: {
              idColaborador: true,
              nomeCompleto: true,
              cargo: true,
              unidade: true,
              trilhaCarreira: true,
            },
          },
          membroComite: {
            select: {
              idColaborador: true,
              nomeCompleto: true,
            },
          },
        },
      });
    });

    it('deve incluir relacionamentos corretos na consulta', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      mockPrismaService.equalizacao.findUnique.mockResolvedValue(mockEqualizacaoComRelacionamentos);

      // Act
      await service.findOne(idEqualizacao);

      // Assert
      expect(mockPrismaService.equalizacao.findUnique).toHaveBeenCalledWith({
        where: { idEqualizacao },
        include: {
          alvo: {
            select: {
              idColaborador: true,
              nomeCompleto: true,
              cargo: true,
              unidade: true,
              trilhaCarreira: true,
            },
          },
          membroComite: {
            select: {
              idColaborador: true,
              nomeCompleto: true,
            },
          },
        },
      });
    });
  });

  describe('update', () => {
    it('deve atualizar uma equalização com sucesso', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const equalizacaoAtualizada = {
        ...mockEqualizacaoComRelacionamentos,
        ...updateEqualizacaoDto,
        status: preenchimentoStatus.CONCLUIDA,
      };

      mockPrismaService.equalizacao.findUnique.mockResolvedValue(mockEqualizacaoComRelacionamentos);
      mockPrismaService.equalizacao.update.mockResolvedValue(equalizacaoAtualizada);

      // Act
      const resultado = await service.update(idEqualizacao, updateEqualizacaoDto);

      // Assert
      expect(resultado).toEqual(equalizacaoAtualizada);
      expect(mockPrismaService.equalizacao.update).toHaveBeenCalledWith({
        where: { idEqualizacao },
        data: updateEqualizacaoDto,
        include: { alvo: true },
      });
      expect(loggerSpy).toHaveBeenCalledWith(`Atualizando equalização: ${idEqualizacao}`);
      expect(loggerSpy).toHaveBeenCalledWith(`Equalização atualizada com sucesso: ${idEqualizacao}`);
    });

    it('deve lançar NotFoundException quando equalização não existe', async () => {
      // Arrange
      const idEqualizacao = 'id-inexistente';
      mockPrismaService.equalizacao.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(idEqualizacao, updateEqualizacaoDto)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.equalizacao.update).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequestException quando nota não fornecida', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const updateDtoSemNota = {
        justificativa: 'Justificativa sem nota',
      };

      mockPrismaService.equalizacao.findUnique.mockResolvedValue(mockEqualizacaoComRelacionamentos);

      // Act & Assert
      await expect(service.update(idEqualizacao, updateDtoSemNota as UpdateEqualizacaoDto)).rejects.toThrow(BadRequestException);
      await expect(service.update(idEqualizacao, updateDtoSemNota as UpdateEqualizacaoDto)).rejects.toThrow(
        'A nota é obrigatória para preencher a equalização'
      );
      expect(mockPrismaService.equalizacao.update).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequestException quando nota é inválida (menor que 1)', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const updateDtoNotaInvalida = {
        notaAjustada: 0.5,
        justificativa: 'Justificativa',
      };

      mockPrismaService.equalizacao.findUnique.mockResolvedValue(mockEqualizacaoComRelacionamentos);

      // Act & Assert
      await expect(service.update(idEqualizacao, updateDtoNotaInvalida)).rejects.toThrow(BadRequestException);
      await expect(service.update(idEqualizacao, updateDtoNotaInvalida)).rejects.toThrow(
        'A nota deve estar entre 1 e 5'
      );
    });

    it('deve lançar BadRequestException quando nota é inválida (maior que 5)', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const updateDtoNotaInvalida = {
        notaAjustada: 5.5,
        justificativa: 'Justificativa',
      };

      mockPrismaService.equalizacao.findUnique.mockResolvedValue(mockEqualizacaoComRelacionamentos);

      // Act & Assert
      await expect(service.update(idEqualizacao, updateDtoNotaInvalida)).rejects.toThrow(BadRequestException);
      await expect(service.update(idEqualizacao, updateDtoNotaInvalida)).rejects.toThrow(
        'A nota deve estar entre 1 e 5'
      );
    });

    it('deve lançar BadRequestException quando nota não é um número válido', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const updateDtoNotaInvalida = {
        notaAjustada: 'not-a-number' as any,
        justificativa: 'Justificativa',
      };

      mockPrismaService.equalizacao.findUnique.mockResolvedValue(mockEqualizacaoComRelacionamentos);

      // Act & Assert
      await expect(service.update(idEqualizacao, updateDtoNotaInvalida)).rejects.toThrow(BadRequestException);
      await expect(service.update(idEqualizacao, updateDtoNotaInvalida)).rejects.toThrow(
        'A nota deve estar entre 1 e 5'
      );
    });

    it('deve lançar BadRequestException quando justificativa não fornecida', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const updateDtoSemJustificativa = {
        notaAjustada: 4.0,
      };

      mockPrismaService.equalizacao.findUnique.mockResolvedValue(mockEqualizacaoComRelacionamentos);

      // Act & Assert
      await expect(service.update(idEqualizacao, updateDtoSemJustificativa as UpdateEqualizacaoDto)).rejects.toThrow(BadRequestException);
      await expect(service.update(idEqualizacao, updateDtoSemJustificativa as UpdateEqualizacaoDto)).rejects.toThrow(
        'A justificativa é obrigatória para preencher a equalização'
      );
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

      mockPrismaService.equalizacao.findUnique.mockResolvedValue(mockEqualizacaoComRelacionamentos);
      mockPrismaService.equalizacao.update.mockResolvedValue(equalizacaoAtualizada);

      // Act
      const resultado = await service.update(idEqualizacao, updateDtoSemStatus);

      // Assert
      expect(resultado.status).toBe(preenchimentoStatus.CONCLUIDA);
      expect(mockPrismaService.equalizacao.update).toHaveBeenCalledWith({
        where: { idEqualizacao },
        data: {
          ...updateDtoSemStatus,
          status: preenchimentoStatus.CONCLUIDA,
        },
        include: { alvo: true },
      });
      expect(loggerSpy).toHaveBeenCalledWith(`Marcando equalização ${idEqualizacao} como CONCLUIDA`);
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

      mockPrismaService.equalizacao.findUnique.mockResolvedValue(mockEqualizacaoComRelacionamentos);
      mockPrismaService.equalizacao.update
        .mockResolvedValueOnce({ ...mockEqualizacaoComRelacionamentos, ...updateDtoNota1 })
        .mockResolvedValueOnce({ ...mockEqualizacaoComRelacionamentos, ...updateDtoNota5 });

      // Act
      const resultado1 = await service.update(idEqualizacao, updateDtoNota1);
      const resultado5 = await service.update(idEqualizacao, updateDtoNota5);

      // Assert
      expect(resultado1.notaAjustada).toBe(1);
      expect(resultado5.notaAjustada).toBe(5);
      expect(mockPrismaService.equalizacao.update).toHaveBeenCalledTimes(2);
    });

    it('deve manter status fornecido quando especificado', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const updateDtoComStatus = {
        notaAjustada: 4.0,
        justificativa: 'Justificativa',
        status: preenchimentoStatus.PENDENTE,
      };

      mockPrismaService.equalizacao.findUnique.mockResolvedValue(mockEqualizacaoComRelacionamentos);
      mockPrismaService.equalizacao.update.mockResolvedValue({
        ...mockEqualizacaoComRelacionamentos,
        ...updateDtoComStatus,
      });

      // Act
      const resultado = await service.update(idEqualizacao, updateDtoComStatus);

      // Assert
      expect(resultado.status).toBe(preenchimentoStatus.PENDENTE);
      expect(mockPrismaService.equalizacao.update).toHaveBeenCalledWith({
        where: { idEqualizacao },
        data: updateDtoComStatus,
        include: { alvo: true },
      });
    });
  });

  describe('remove', () => {
    it('deve remover uma equalização com sucesso', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;

      mockPrismaService.equalizacao.findUnique.mockResolvedValue(mockEqualizacaoComRelacionamentos);
      mockPrismaService.equalizacao.delete.mockResolvedValue(mockEqualizacao);

      // Act
      const resultado = await service.remove(idEqualizacao);

      // Assert
      expect(resultado).toEqual({ message: 'Equalização removida com sucesso' });
      expect(mockPrismaService.equalizacao.delete).toHaveBeenCalledWith({
        where: { idEqualizacao },
      });
      expect(loggerSpy).toHaveBeenCalledWith(`Removendo equalização: ${idEqualizacao}`);
      expect(loggerSpy).toHaveBeenCalledWith(`Equalização removida com sucesso: ${idEqualizacao}`);
    });

    it('deve lançar NotFoundException quando equalização não existe para remoção', async () => {
      // Arrange
      const idEqualizacao = 'id-inexistente';
      mockPrismaService.equalizacao.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove(idEqualizacao)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.equalizacao.delete).not.toHaveBeenCalled();
    });

    it('deve verificar existência antes de deletar', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;

      mockPrismaService.equalizacao.findUnique.mockResolvedValue(mockEqualizacaoComRelacionamentos);
      mockPrismaService.equalizacao.delete.mockResolvedValue(mockEqualizacao);

      // Act
      await service.remove(idEqualizacao);

      // Assert
      expect(mockPrismaService.equalizacao.findUnique).toHaveBeenCalledWith({
        where: { idEqualizacao },
        include: {
          alvo: {
            select: {
              idColaborador: true,
              nomeCompleto: true,
              cargo: true,
              unidade: true,
              trilhaCarreira: true,
            },
          },
          membroComite: {
            select: {
              idColaborador: true,
              nomeCompleto: true,
            },
          },
        },
      });
      expect(mockPrismaService.equalizacao.delete).toHaveBeenCalled();
    });
  });

  describe('Validações e casos extremos', () => {
    it('deve lidar com notas decimais válidas', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const updateDtoDecimal = {
        notaAjustada: 3.75,
        justificativa: 'Nota decimal válida',
      };

      mockPrismaService.equalizacao.findUnique.mockResolvedValue(mockEqualizacaoComRelacionamentos);
      mockPrismaService.equalizacao.update.mockResolvedValue({
        ...mockEqualizacaoComRelacionamentos,
        ...updateDtoDecimal,
      });

      // Act
      const resultado = await service.update(idEqualizacao, updateDtoDecimal);

      // Assert
      expect(resultado.notaAjustada).toBe(3.75);
    });

    it('deve lidar com justificativas longas', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      const justificativaLonga = 'Justificativa muito longa '.repeat(50);
      const updateDtoJustificativaLonga = {
        notaAjustada: 4.0,
        justificativa: justificativaLonga,
      };

      mockPrismaService.equalizacao.findUnique.mockResolvedValue(mockEqualizacaoComRelacionamentos);
      mockPrismaService.equalizacao.update.mockResolvedValue({
        ...mockEqualizacaoComRelacionamentos,
        ...updateDtoJustificativaLonga,
      });

      // Act
      const resultado = await service.update(idEqualizacao, updateDtoJustificativaLonga);

      // Assert
      expect(resultado.justificativa).toBe(justificativaLonga);
    });

    it('deve fazer logs de erro quando criação falha', async () => {
      // Arrange
      const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.colaboradorCiclo.findMany.mockResolvedValue([mockParticipantes[0]]);
      mockPrismaService.equalizacao.findFirst.mockResolvedValue(null);
      mockPrismaService.equalizacao.create.mockRejectedValue(new Error('Erro de banco'));

      // Act
      await service.create(createEqualizacaoDto);

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `Erro ao criar equalização para ${mockColaborador1.nomeCompleto}: Erro de banco`
      );
    });

    it('deve fazer log de warning quando equalização já existe', async () => {
      // Arrange
      const loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.colaboradorCiclo.findMany.mockResolvedValue([mockParticipantes[0]]);
      mockPrismaService.equalizacao.findFirst.mockResolvedValue(mockEqualizacao);

      // Act
      await service.create(createEqualizacaoDto);

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        `Equalização já existe para ${mockColaborador1.nomeCompleto}`
      );
    });

    it('deve fazer log de warning quando ciclo não possui participantes', async () => {
      // Arrange
      const loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.colaboradorCiclo.findMany.mockResolvedValue([]);

      // Act & Assert
      await expect(service.create(createEqualizacaoDto)).rejects.toThrow(BadRequestException);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        `Nenhum participante encontrado para o ciclo: ${createEqualizacaoDto.idCiclo}`
      );
    });

    it('deve lidar com múltiplas operações simultâneas', async () => {
      // Arrange
      mockPrismaService.equalizacao.findMany.mockResolvedValue([mockEqualizacaoComRelacionamentos]);

      // Act
      const promessas = [
        service.findAll(),
        service.findAll(),
        service.findAll(),
      ];

      const resultados = await Promise.all(promessas);

      // Assert
      expect(resultados).toHaveLength(3);
      expect(mockPrismaService.equalizacao.findMany).toHaveBeenCalledTimes(3);
      resultados.forEach(resultado => {
        expect(resultado).toEqual([mockEqualizacaoComRelacionamentos]);
      });
    });

    it('deve manter integridade dos dados durante operações CRUD', async () => {
      // Arrange
      const id = mockEqualizacao.idEqualizacao;
      
      // Simular operação completa: create -> read -> update -> delete
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.colaboradorCiclo.findMany.mockResolvedValue([mockParticipantes[0]]);
      mockPrismaService.equalizacao.findFirst.mockResolvedValue(null);
      mockPrismaService.equalizacao.create.mockResolvedValue({ ...mockEqualizacao, alvo: mockColaborador1 });
      mockPrismaService.equalizacao.findUnique.mockResolvedValue(mockEqualizacaoComRelacionamentos);
      mockPrismaService.equalizacao.update.mockResolvedValue({
        ...mockEqualizacaoComRelacionamentos,
        ...updateEqualizacaoDto,
      });
      mockPrismaService.equalizacao.delete.mockResolvedValue(mockEqualizacao);

      // Act
      const criado = await service.create(createEqualizacaoDto);
      const encontrado = await service.findOne(id);
      const atualizado = await service.update(id, updateEqualizacaoDto);
      const removido = await service.remove(id);

      // Assert
      expect(criado.equalizacoes).toHaveLength(1);
      expect(encontrado.idEqualizacao).toBe(id);
      expect(atualizado.notaAjustada).toBe(updateEqualizacaoDto.notaAjustada);
      expect(removido).toEqual({ message: 'Equalização removida com sucesso' });
    });
  });

  describe('Estrutura de dados e tipos', () => {
    it('deve retornar estrutura correta para equalização criada', async () => {
      // Arrange
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.colaboradorCiclo.findMany.mockResolvedValue([mockParticipantes[0]]);
      mockPrismaService.equalizacao.findFirst.mockResolvedValue(null);
      mockPrismaService.equalizacao.create.mockResolvedValue({ ...mockEqualizacao, alvo: mockColaborador1 });

      // Act
      const resultado = await service.create(createEqualizacaoDto);

      // Assert
      expect(resultado).toMatchObject({
        message: expect.any(String),
        total: expect.any(Number),
        novasEqualizacoes: expect.any(Number),
        equalizacoes: expect.any(Array),
      });
    });

    it('deve manter consistência de tipos nos retornos', async () => {
      // Arrange
      const idEqualizacao = mockEqualizacao.idEqualizacao;
      mockPrismaService.equalizacao.findUnique.mockResolvedValue(mockEqualizacaoComRelacionamentos);

      // Act
      const resultado = await service.findOne(idEqualizacao);

      // Assert
      expect(typeof resultado.idEqualizacao).toBe('string');
      expect(typeof resultado.idCiclo).toBe('string');
      expect(typeof resultado.idAvaliado).toBe('string');
      expect(typeof resultado.status).toBe('string');
      expect(resultado.dataEqualizacao).toBeInstanceOf(Date);
    });

    it('deve incluir relacionamentos corretos em consultas', async () => {
      // Arrange
      mockPrismaService.equalizacao.findMany.mockResolvedValue([mockEqualizacaoComRelacionamentos]);

      // Act
      const resultado = await service.findAll();

      // Assert
      expect(resultado[0]).toHaveProperty('alvo');
      expect(resultado[0].alvo).toHaveProperty('nomeCompleto');
      expect(resultado[0].alvo).toHaveProperty('cargo');
      expect(resultado[0].alvo).toHaveProperty('unidade');
      expect(resultado[0].alvo).toHaveProperty('trilhaCarreira');
    });
  });
});