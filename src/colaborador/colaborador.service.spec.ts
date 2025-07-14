import { Test, TestingModule } from '@nestjs/testing';
import { ColaboradorService } from './colaborador.service';
import { PrismaService } from '../database/prismaService';
import { AvaliacoesService } from '../avaliacoes/avaliacoes.service';
import { CicloService } from '../ciclo/ciclo.service';
import { CriteriosService } from '../criterios/criterios.service';
import { EqualizacaoService } from '../equalizacao/equalizacao.service';
import { CreateColaboradorDto, UpdateColaboradorDto, TrocarSenhaDto } from './colaborador.dto';
import { perfilTipo } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Mock do módulo
jest.mock('bcrypt');

// Tipagem correta do mock
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

const salt = 'saltTest';

(mockedBcrypt.genSalt as jest.Mock).mockResolvedValue(salt);

// Mock do PrismaService
const mockPrismaService = {
  colaborador: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  colaboradorPerfil: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  colaboradorCiclo: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  gestorColaborador: {
    findFirst: jest.fn(),
  },
  cicloAvaliacao: {
    findUnique: jest.fn(),
  },
  avaliacao: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  criterioAvaliativo: {
    findMany: jest.fn(),
  },
};

// Mock dos services
const mockAvaliacoesService = {
  // Não utilizado
};

const mockCicloService = {
  // Não utilizado
};

const mockCriteriosService = {
  // Não utilizado
};

const mockEqualizacaoService = {
  getEqualizacaoColaboradorCiclo: jest.fn(),
};

describe('ColaboradorService', () => {
  let service: ColaboradorService;
  let prisma: PrismaService;

  // Dados de teste
  const mockColaborador = {
    idColaborador: '123e4567-e89b-12d3-a456-426614174000',
    nomeCompleto: 'João da Silva',
    email: 'joao@teste.com',
    senha: 'hashedPassword',
    trilhaCarreira: 'DESENVOLVIMENTO',
    cargo: 'DESENVOLVEDOR',
    unidade: 'RECIFE',
    primeiroLogin: true,
    dataCriacao: new Date('2024-01-01'),
    dataUltimaModificacao: new Date('2024-01-01'),
  };

  const mockColaboradorPerfil = {
    idColaborador: mockColaborador.idColaborador,
    tipoPerfil: perfilTipo.COLABORADOR_COMUM,
  };

  const mockCiclo = {
    idCiclo: '456e7890-e89b-12d3-a456-426614174001',
    nomeCiclo: 'Ciclo 2024',
    status: 'EM_ANDAMENTO',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ColaboradorService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AvaliacoesService,
          useValue: mockAvaliacoesService,
        },
        {
          provide: CicloService,
          useValue: mockCicloService,
        },
        {
          provide: CriteriosService,
          useValue: mockCriteriosService,
        },
        {
          provide: EqualizacaoService,
          useValue: mockEqualizacaoService,
        },
      ],
    }).compile();

    service = module.get<ColaboradorService>(ColaboradorService);
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

  describe('criarColaborador', () => {
    it('deve criar um colaborador com sucesso', async () => {
      // Arrange
      const createDto: CreateColaboradorDto = {
        nomeCompleto: 'Novo Colaborador',
        email: 'novo@teste.com',
        senha: 'senha123',
        colaboradorComum: true,
      };

      const salt = 'saltTest';
      const hashedPassword = 'hashedPassword123';

      mockPrismaService.colaborador.findUnique.mockResolvedValue(null); // Não existe
      (mockedBcrypt.genSalt as jest.Mock).mockResolvedValue(salt);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrismaService.colaborador.create.mockResolvedValue({
        ...mockColaborador,
        ...createDto,
        senha: hashedPassword,
      });
      mockPrismaService.colaboradorPerfil.create.mockResolvedValue(mockColaboradorPerfil);

      // Act
      const resultado = await service.criarColaborador(createDto);

      // Assert
      expect(resultado).toEqual({
        ...mockColaborador,
        ...createDto,
        senha: hashedPassword,
      });
      expect(mockPrismaService.colaborador.findUnique).toHaveBeenCalledWith({
        where: { email: createDto.email },
      });
      expect(mockedBcrypt.genSalt).toHaveBeenCalled();
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(createDto.senha, salt);
      expect(mockPrismaService.colaborador.create).toHaveBeenCalledWith({
        data: {
          nomeCompleto: createDto.nomeCompleto,
          email: createDto.email,
          senha: hashedPassword,
        },
      });
    });

    it('deve retornar erro quando colaborador já existe', async () => {
      // Arrange
      const createDto: CreateColaboradorDto = {
        nomeCompleto: 'Colaborador Existente',
        email: 'existente@teste.com',
        senha: 'senha123',
      };

      mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);

      // Act
      const resultado = await service.criarColaborador(createDto);

      // Assert
      expect(resultado).toEqual({
        status: 400,
        message: 'Colaborador já existe',
      });
      expect(mockPrismaService.colaborador.create).not.toHaveBeenCalled();
    });

    it('deve criar colaborador com múltiplos perfis válidos', async () => {
      // Arrange
      const createDto: CreateColaboradorDto = {
        nomeCompleto: 'Gestor Teste',
        email: 'gestor@teste.com',
        senha: 'senha123',
        gestor: true,
        lider: true,
      };

      mockPrismaService.colaborador.findUnique.mockResolvedValue(null);
      (mockedBcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrismaService.colaborador.create.mockResolvedValue(mockColaborador);
      mockPrismaService.colaboradorPerfil.create.mockResolvedValue(mockColaboradorPerfil);

      const mockAssociarPerfil = jest.spyOn(service, 'associarPerfilColaborador');
      mockAssociarPerfil
        .mockResolvedValueOnce(mockColaboradorPerfil)
        .mockResolvedValueOnce(mockColaboradorPerfil);

      // Act
      const resultado = await service.criarColaborador(createDto);

      // Assert
      expect(resultado).toEqual(mockColaborador);
      expect(mockAssociarPerfil).toHaveBeenCalledTimes(2); // GESTOR e LIDER
      expect(mockAssociarPerfil).toHaveBeenCalledWith(mockColaborador.idColaborador, 'GESTOR');
      expect(mockAssociarPerfil).toHaveBeenCalledWith(mockColaborador.idColaborador, 'LIDER');
    });

    it('deve retornar erro de validação de perfis', async () => {
      // Arrange
      const createDto: CreateColaboradorDto = {
        nomeCompleto: 'Perfil Inválido',
        email: 'invalido@teste.com',
        senha: 'senha123',
        colaboradorComum: true,
        admin: true, // Combinação inválida
      };

      mockPrismaService.colaborador.findUnique.mockResolvedValue(null);

      // Act
      const resultado = await service.criarColaborador(createDto);

      // Assert
      expect(resultado).toEqual({
        status: 400,
        message: 'COLABORADOR_COMUM não pode ser ADMIN, RH ou MEMBRO_COMITE',
      });
    });
  });

  describe('removerColaborador', () => {
    it('deve remover um colaborador com sucesso', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
      mockPrismaService.colaborador.delete.mockResolvedValue(mockColaborador);

      // Act
      const resultado = await service.removerColaborador(id);

      // Assert
      expect(resultado).toEqual(mockColaborador);
      expect(mockPrismaService.colaborador.delete).toHaveBeenCalledWith({
        where: { idColaborador: id },
      });
    });

    it('deve retornar erro para ID inválido', async () => {
      // Arrange
      const id = 'id-invalido';

      // Act
      const resultado = await service.removerColaborador(id);

      // Assert
      expect(resultado).toEqual({
        status: 400,
        message: 'ID do colaborador inválido',
      });
    });

    it('deve retornar erro quando colaborador não encontrado', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockPrismaService.colaborador.findUnique.mockResolvedValue(null);

      // Act
      const resultado = await service.removerColaborador(id);

      // Assert
      expect(resultado).toEqual({
        status: 404,
        message: 'Colaborador não encontrado',
      });
    });
  });

  describe('getProfile', () => {
    it('deve retornar o perfil do colaborador', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);

      // Act
      const resultado = await service.getProfile(id);

      // Assert
      expect(resultado).toEqual(mockColaborador);
      expect(mockPrismaService.colaborador.findUnique).toHaveBeenCalledWith({
        where: { idColaborador: id },
      });
    });

    it('deve retornar null quando colaborador não encontrado', async () => {
      // Arrange
      const id = 'inexistente';
      mockPrismaService.colaborador.findUnique.mockResolvedValue(null);

      // Act
      const resultado = await service.getProfile(id);

      // Assert
      expect(resultado).toBeNull();
    });
  });

  describe('getGestorColaborador', () => {
    it('deve permitir acesso para ADMIN', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const user = { roles: ['ADMIN'], userId: 'admin-id' };
      mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);

      // Act
      const resultado = await service.getGestorColaborador(id, user);

      // Assert
      expect(resultado).toEqual(mockColaborador);
    });

    it('deve permitir acesso para GESTOR com liderado', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const user = { roles: ['GESTOR'], userId: 'gestor-id' };
      mockPrismaService.gestorColaborador.findFirst.mockResolvedValue({
        idGestor: 'gestor-id',
        idColaborador: id,
      });
      mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);

      // Act
      const resultado = await service.getGestorColaborador(id, user);

      // Assert
      expect(resultado).toEqual(mockColaborador);
    });

    it('deve negar acesso para GESTOR sem relação', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const user = { roles: ['GESTOR'], userId: 'gestor-id' };
      mockPrismaService.gestorColaborador.findFirst.mockResolvedValue(null);

      // Act
      const resultado = await service.getGestorColaborador(id, user);

      // Assert
      expect(resultado).toEqual({
        status: 403,
        message: 'Acesso negado: colaborador não é liderado deste gestor.',
      });
    });

    it('deve negar acesso para outros perfis', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const user = { roles: ['COLABORADOR_COMUM'], userId: 'user-id' };

      // Act
      const resultado = await service.getGestorColaborador(id, user);

      // Assert
      expect(resultado).toEqual({
        status: 403,
        message: 'Acesso negado.',
      });
    });
  });

  describe('updateColaborador', () => {
    it('deve atualizar um colaborador com sucesso', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto: UpdateColaboradorDto = {
        nomeCompleto: 'Nome Atualizado',
        cargo: 'DESENVOLVEDOR',
      };

      // Como não há email no updateDto, só há uma chamada findUnique
      mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);

      const colaboradorAtualizado = { ...mockColaborador, ...updateDto };
      mockPrismaService.colaborador.update.mockResolvedValue(colaboradorAtualizado);

      // Act
      const resultado = await service.updateColaborador(id, updateDto);

      // Assert
      expect(resultado).toEqual(colaboradorAtualizado);
      expect(mockPrismaService.colaborador.update).toHaveBeenCalledWith({
        where: { idColaborador: id },
        data: updateDto,
      });
    });

    it('deve hash da senha quando fornecida', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto: UpdateColaboradorDto = {
        senha: 'novaSenha123',
      };

      // Como não há email no updateDto, só precisa da chamada para buscar o colaborador pelo ID
      mockPrismaService.colaborador.findUnique.mockResolvedValueOnce(mockColaborador);

      (mockedBcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('novaSenhaHashed');

      const colaboradorAtualizado = { ...mockColaborador, senha: 'novaSenhaHashed' };
      mockPrismaService.colaborador.update.mockResolvedValue(colaboradorAtualizado);

      // Act
      const resultado = await service.updateColaborador(id, updateDto);

      // Assert
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('novaSenha123', 'salt');
      expect(resultado).toEqual(colaboradorAtualizado);
    });

    it('deve retornar erro para ID inválido', async () => {
      // Arrange
      const id = 'id-invalido';
      const updateDto: UpdateColaboradorDto = {};

      // Act
      const resultado = await service.updateColaborador(id, updateDto);

      // Assert
      expect(resultado).toEqual({
        status: 400,
        message: 'ID do colaborador inválido',
      });
    });

    it('deve retornar erro quando email já existe', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto: UpdateColaboradorDto = {
        email: 'existente@teste.com',
      };

      // Mock para email já existir (com ID diferente)
      const colaboradorExistente = {
        ...mockColaborador,
        idColaborador: 'outro-id-diferente',
        email: 'existente@teste.com',
      };

      // Primeira chamada: verificar se o email já existe
      mockPrismaService.colaborador.findUnique.mockResolvedValueOnce(colaboradorExistente);

      // Act
      const resultado = await service.updateColaborador(id, updateDto);

      // Assert
      expect(resultado).toEqual({
        status: 400,
        message: 'Email já cadastrado',
      });
    });
  });

  describe('associarPerfilColaborador', () => {
    it('deve associar perfil com sucesso', async () => {
      // Arrange
      const idColaborador = '123e4567-e89b-12d3-a456-426614174000';
      const tipoPerfil = 'COLABORADOR_COMUM';

      mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
      mockPrismaService.colaboradorPerfil.findUnique.mockResolvedValue(null); // Não existe
      mockPrismaService.colaboradorPerfil.create.mockResolvedValue(mockColaboradorPerfil);

      // Act
      const resultado = await service.associarPerfilColaborador(idColaborador, tipoPerfil);

      // Assert
      expect(resultado).toEqual(mockColaboradorPerfil);
      expect(mockPrismaService.colaboradorPerfil.create).toHaveBeenCalledWith({
        data: {
          idColaborador,
          tipoPerfil: perfilTipo.COLABORADOR_COMUM,
        },
      });
    });

    it('deve retornar erro para ID inválido', async () => {
      // Arrange
      const idColaborador = 'id-invalido';
      const tipoPerfil = 'COLABORADOR_COMUM';

      // Act
      const resultado = await service.associarPerfilColaborador(idColaborador, tipoPerfil);

      // Assert
      expect(resultado).toEqual({
        status: 400,
        message: 'ID do colaborador inválido',
      });
    });

    it('deve retornar erro quando colaborador não existe', async () => {
      // Arrange
      const idColaborador = '123e4567-e89b-12d3-a456-426614174000';
      const tipoPerfil = 'COLABORADOR_COMUM';

      mockPrismaService.colaborador.findUnique.mockResolvedValue(null);

      // Act
      const resultado = await service.associarPerfilColaborador(idColaborador, tipoPerfil);

      // Assert
      expect(resultado).toEqual({
        status: 404,
        message: 'Colaborador não encontrado',
      });
    });

    it('deve retornar erro para tipo de perfil inválido', async () => {
      // Arrange
      const idColaborador = '123e4567-e89b-12d3-a456-426614174000';
      const tipoPerfil = 'PERFIL_INEXISTENTE';

      mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);

      // Act
      const resultado = await service.associarPerfilColaborador(idColaborador, tipoPerfil);

      // Assert
      expect(resultado).toEqual({
        status: 400,
        message: 'Tipo de perfil inválido',
      });
    });

    it('deve retornar erro quando perfil já associado', async () => {
      // Arrange
      const idColaborador = '123e4567-e89b-12d3-a456-426614174000';
      const tipoPerfil = 'COLABORADOR_COMUM';

      mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
      mockPrismaService.colaboradorPerfil.findUnique.mockResolvedValue(mockColaboradorPerfil);

      // Act
      const resultado = await service.associarPerfilColaborador(idColaborador, tipoPerfil);

      // Assert
      expect(resultado).toEqual({
        status: 400,
        message: 'Perfil já associado ao colaborador',
      });
    });
  });

  describe('associarColaboradorCiclo', () => {
    it('deve associar colaborador ao ciclo com sucesso', async () => {
      // Arrange
      const idColaborador = '123e4567-e89b-12d3-a456-426614174000';
      const idCiclo = '456e7890-e89b-12d3-a456-426614174001';

      const mockColaboradorCiclo = { idColaborador, idCiclo };

      mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.colaboradorCiclo.findFirst.mockResolvedValue(null);
      mockPrismaService.colaboradorCiclo.create.mockResolvedValue(mockColaboradorCiclo);

      // Act
      const resultado = await service.associarColaboradorCiclo(idColaborador, idCiclo);

      // Assert
      expect(resultado).toEqual(mockColaboradorCiclo);
      expect(mockPrismaService.colaboradorCiclo.create).toHaveBeenCalledWith({
        data: { idColaborador, idCiclo },
      });
    });

    it('deve retornar erro para IDs inválidos', async () => {
      // Arrange
      const idColaborador = 'id-invalido';
      const idCiclo = 'id-invalido';

      // Act
      const resultado = await service.associarColaboradorCiclo(idColaborador, idCiclo);

      // Assert
      expect(resultado).toEqual({
        status: 400,
        message: 'ID do colaborador ou ciclo inválido',
      });
    });

    it('deve retornar erro quando colaborador não existe', async () => {
      // Arrange
      const idColaborador = '123e4567-e89b-12d3-a456-426614174000';
      const idCiclo = '456e7890-e89b-12d3-a456-426614174001';

      mockPrismaService.colaborador.findUnique.mockResolvedValue(null);

      // Act
      const resultado = await service.associarColaboradorCiclo(idColaborador, idCiclo);

      // Assert
      expect(resultado).toEqual({
        status: 404,
        message: 'Colaborador não encontrado',
      });
    });

    it('deve retornar erro quando ciclo não existe', async () => {
      // Arrange
      const idColaborador = '123e4567-e89b-12d3-a456-426614174000';
      const idCiclo = '456e7890-e89b-12d3-a456-426614174001';

      mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(null);

      // Act
      const resultado = await service.associarColaboradorCiclo(idColaborador, idCiclo);

      // Assert
      expect(resultado).toEqual({
        status: 404,
        message: 'Ciclo não encontrado',
      });
    });

    it('deve retornar erro quando associação já existe', async () => {
      // Arrange
      const idColaborador = '123e4567-e89b-12d3-a456-426614174000';
      const idCiclo = '456e7890-e89b-12d3-a456-426614174001';

      mockPrismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.colaboradorCiclo.findFirst.mockResolvedValue({ idColaborador, idCiclo });

      // Act
      const resultado = await service.associarColaboradorCiclo(idColaborador, idCiclo);

      // Assert
      expect(resultado).toEqual({
        status: 400,
        message: 'Colaborador já está associado a este ciclo',
      });
    });
  });

  describe('getAvaliacoesRecebidas', () => {
    it('deve retornar quantidade de avaliações recebidas', async () => {
      // Arrange
      const idColaborador = '123e4567-e89b-12d3-a456-426614174000';
      const quantidadeEsperada = 5;

      mockPrismaService.avaliacao.count.mockResolvedValue(quantidadeEsperada);

      // Act
      const resultado = await service.getAvaliacoesRecebidas(idColaborador);

      // Assert
      expect(resultado).toEqual({ quantidadeAvaliacoes: quantidadeEsperada });
      expect(mockPrismaService.avaliacao.count).toHaveBeenCalledWith({
        where: { idAvaliado: idColaborador },
      });
    });
  });

  describe('getAllColaborador', () => {
    it('deve retornar todos os colaboradores comuns', async () => {
      // Arrange
      const mockPerfis = [
        { idColaborador: 'id1' },
        { idColaborador: 'id2' },
      ];

      const mockColaboradores = [
        {
          idColaborador: 'id1',
          nomeCompleto: 'Colaborador 1',
          email: 'collab1@teste.com',
          trilhaCarreira: 'DESENVOLVIMENTO',
          cargo: 'DESENVOLVEDOR',
          unidade: 'RECIFE',
        },
        {
          idColaborador: 'id2',
          nomeCompleto: 'Colaborador 2',
          email: 'collab2@teste.com',
          trilhaCarreira: 'QA',
          cargo: 'QA',
          unidade: 'SAO PAULO',
        },
      ];

      mockPrismaService.colaboradorPerfil.findMany.mockResolvedValue(mockPerfis);
      mockPrismaService.colaborador.findMany.mockResolvedValue(mockColaboradores);

      // Act
      const resultado = await service.getAllColaborador();

      // Assert
      expect(resultado).toEqual(mockColaboradores);
      expect(mockPrismaService.colaboradorPerfil.findMany).toHaveBeenCalledWith({
        where: { tipoPerfil: 'COLABORADOR_COMUM' },
        select: { idColaborador: true },
      });
      expect(mockPrismaService.colaborador.findMany).toHaveBeenCalledWith({
        where: { idColaborador: { in: ['id1', 'id2'] } },
        select: {
          idColaborador: true,
          nomeCompleto: true,
          email: true,
          trilhaCarreira: true,
          cargo: true,
          unidade: true,
        },
      });
    });
  });

  describe('Métodos de verificação de perfil', () => {
    const idColaborador = '123e4567-e89b-12d3-a456-426614174000';

    describe('isColaborador', () => {
      it('deve retornar true quando é colaborador comum', async () => {
        // Arrange
        mockPrismaService.colaboradorPerfil.findUnique.mockResolvedValue(mockColaboradorPerfil);

        // Act
        const resultado = await service.isColaborador(idColaborador);

        // Assert
        expect(resultado).toBe(true);
      });

      it('deve retornar false quando não é colaborador comum', async () => {
        // Arrange
        mockPrismaService.colaboradorPerfil.findUnique.mockResolvedValue(null);

        // Act
        const resultado = await service.isColaborador(idColaborador);

        // Assert
        expect(resultado).toBe(false);
      });
    });

    describe('isGestor', () => {
      it('deve retornar true quando é gestor', async () => {
        // Arrange
        mockPrismaService.colaboradorPerfil.findUnique.mockResolvedValue({
          ...mockColaboradorPerfil,
          tipoPerfil: perfilTipo.GESTOR,
        });

        // Act
        const resultado = await service.isGestor(idColaborador);

        // Assert
        expect(resultado).toBe(true);
      });

      it('deve retornar false para ID inválido', async () => {
        // Act
        const resultado = await service.isGestor('id-invalido');

        // Assert
        expect(resultado).toBe(false);
      });
    });

    describe('isRh', () => {
      it('deve retornar true quando é RH', async () => {
        // Arrange
        mockPrismaService.colaboradorPerfil.findUnique.mockResolvedValue({
          ...mockColaboradorPerfil,
          tipoPerfil: perfilTipo.RH,
        });

        // Act
        const resultado = await service.isRh(idColaborador);

        // Assert
        expect(resultado).toBe(true);
      });
    });

    describe('isMembroComite', () => {
      it('deve retornar true quando é membro do comitê', async () => {
        // Arrange
        mockPrismaService.colaboradorPerfil.findUnique.mockResolvedValue({
          ...mockColaboradorPerfil,
          tipoPerfil: perfilTipo.MEMBRO_COMITE,
        });

        // Act
        const resultado = await service.isMembroComite(idColaborador);

        // Assert
        expect(resultado).toBe(true);
      });
    });

    describe('isAdmin', () => {
      it('deve retornar true quando é admin', async () => {
        // Arrange
        mockPrismaService.colaboradorPerfil.findUnique.mockResolvedValue({
          ...mockColaboradorPerfil,
          tipoPerfil: perfilTipo.ADMIN,
        });

        // Act
        const resultado = await service.isAdmin(idColaborador);

        // Assert
        expect(resultado).toBe(true);
      });
    });
  });

  describe('trocarSenhaPrimeiroLogin', () => {
    it('deve trocar senha com sucesso', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const dto: TrocarSenhaDto = {
        senhaAtual: 'senhaAtual123',
        novaSenha: 'novaSenha123',
      };

      const colaboradorComSenha = {
        senha: 'senhaAtualHashed',
        primeiroLogin: true,
      };

      mockPrismaService.colaborador.findUnique.mockResolvedValue(colaboradorComSenha);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('novaSenhaHashed');
      mockPrismaService.colaborador.update.mockResolvedValue({
        ...mockColaborador,
        senha: 'novaSenhaHashed',
        primeiroLogin: false,
      });

      // Act
      const resultado = await service.trocarSenhaPrimeiroLogin(id, dto);

      // Assert
      expect(resultado).toEqual({ message: 'Senha alterada com sucesso' });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(dto.senhaAtual, colaboradorComSenha.senha);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(dto.novaSenha, 10);
      expect(mockPrismaService.colaborador.update).toHaveBeenCalledWith({
        where: { idColaborador: id },
        data: { senha: 'novaSenhaHashed', primeiroLogin: false },
      });
    });

    it('deve lançar erro quando usuário não está em primeiro login', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const dto: TrocarSenhaDto = {
        senhaAtual: 'senhaAtual123',
        novaSenha: 'novaSenha123',
      };

      mockPrismaService.colaborador.findUnique.mockResolvedValue({
        senha: 'senhaHashed',
        primeiroLogin: false, // Não é primeiro login
      });

      // Act & Assert
      await expect(service.trocarSenhaPrimeiroLogin(id, dto)).rejects.toThrow(
        'Usuário não está em primeiro login ou não existe'
      );
    });

    it('deve lançar erro quando senha atual está incorreta', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const dto: TrocarSenhaDto = {
        senhaAtual: 'senhaErrada',
        novaSenha: 'novaSenha123',
      };

      mockPrismaService.colaborador.findUnique.mockResolvedValue({
        senha: 'senhaCorretaHashed',
        primeiroLogin: true,
      });
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(service.trocarSenhaPrimeiroLogin(id, dto)).rejects.toThrow(
        'Senha atual incorreta'
      );
    });
  });

  describe('getProgressoAtual', () => {
    it('deve retornar progresso atual do colaborador', async () => {
      // Arrange
      const idColaborador = '123e4567-e89b-12d3-a456-426614174000';

      const mockColaboradorCiclos = [
        {
          idColaborador,
          idCiclo: mockCiclo.idCiclo,
          ciclo: mockCiclo,
        },
      ];

      const mockAvaliacoes = [
        { status: 'CONCLUIDA', tipoAvaliacao: 'AUTOAVALIACAO' },
        { status: 'PENDENTE', tipoAvaliacao: 'AUTOAVALIACAO' },
        { status: 'CONCLUIDA', tipoAvaliacao: 'AVALIACAO_PARES' },
        { status: 'CONCLUIDA', tipoAvaliacao: 'LIDER_COLABORADOR' },
      ];

      mockPrismaService.colaboradorCiclo.findMany.mockResolvedValue(mockColaboradorCiclos);
      mockPrismaService.avaliacao.findMany
        .mockResolvedValueOnce([mockAvaliacoes[0], mockAvaliacoes[1]]) // Auto
        .mockResolvedValueOnce([mockAvaliacoes[2]]) // Pares
        .mockResolvedValueOnce([mockAvaliacoes[3]]) // Lider
        .mockResolvedValueOnce([]); // Mentor

      // Act
      const resultado = await service.getProgressoAtual(idColaborador);

      // Assert
      expect(resultado).toEqual([
        { TipoAvaliacao: 'auto', porcentagemPreenchimento: 50 }, // 1/2 = 50%
        { TipoAvaliacao: '360', porcentagemPreenchimento: 100 }, // 1/1 = 100%
        { TipoAvaliacao: 'Lider/mentor', porcentagemPreenchimento: 100 }, // 1/1 = 100%
      ]);
    });

    it('deve retornar array vazio quando não há ciclo em andamento', async () => {
      // Arrange
      const idColaborador = '123e4567-e89b-12d3-a456-426614174000';

      mockPrismaService.colaboradorCiclo.findMany.mockResolvedValue([
        {
          idColaborador,
          idCiclo: 'outro-ciclo',
          ciclo: { ...mockCiclo, status: 'FINALIZADO' },
        },
      ]);

      // Act
      const resultado = await service.getProgressoAtual(idColaborador);

      // Assert
      expect(resultado).toEqual([]);
    });
  });

  describe('Integração entre métodos', () => {
    it('deve criar colaborador e depois buscar perfil', async () => {
      // Arrange
      const createDto: CreateColaboradorDto = {
        nomeCompleto: 'Teste Integração',
        email: 'integracao@teste.com',
        senha: 'senha123',
        colaboradorComum: true,
      };

      mockPrismaService.colaborador.findUnique
        .mockResolvedValueOnce(null) // 1ª chamada: verificar se email existe (deve retornar null)
        .mockResolvedValueOnce({     // 2ª chamada: getProfile (deve retornar o colaborador)
          ...mockColaborador,
          ...createDto,
        });


      (mockedBcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrismaService.colaborador.create.mockResolvedValue({
        ...mockColaborador,
        ...createDto,
      });
      mockPrismaService.colaboradorPerfil.create.mockResolvedValue(mockColaboradorPerfil);

      // Para o getProfile
      mockPrismaService.colaborador.findUnique.mockResolvedValue({
        ...mockColaborador,
        ...createDto,
      });

      // Act
      const criado = await service.criarColaborador(createDto);

      expect(criado).toBeDefined();
      
      // Verificar se não é um objeto de erro
      if ('status' in criado) {
        throw new Error(`Esperado sucesso na criação, mas recebeu erro: ${criado.message}`);
      }

      // Agora TypeScript sabe que criado tem idColaborador
      expect(criado.idColaborador).toBeDefined();
      expect(criado.email).toBe(createDto.email);

      const perfil = await service.getProfile(criado.idColaborador);

      // Assert
      expect(perfil).toBeDefined();
      expect(perfil).not.toBeNull();
      if (perfil) {
        expect(perfil.email).toBe(createDto.email);
        expect(perfil.idColaborador).toBe(criado.idColaborador);
      } else {
        fail('Profile should not be null after successful creation');
      }
    });

    it('deve retornar null quando colaborador não existe', async () => {
      // Arrange
      const idInexistente = '00000000-0000-0000-0000-000000000000';
      
      mockPrismaService.colaborador.findUnique.mockResolvedValue(null);

      // Act
      const perfil = await service.getProfile(idInexistente);

      // Assert
      expect(perfil).toBeNull();
    });
    
  });
});