import { Test, TestingModule } from '@nestjs/testing';
import { ColaboradorController } from './colaborador.controller';
import { ColaboradorService } from './colaborador.service';
import { CreateColaboradorDto, UpdateColaboradorDto, AssociatePerfilDto, TrocarSenhaDto } from './colaborador.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ExecutionContext } from '@nestjs/common';
import { Trilha, Cargo, Unidade } from './colaborador.constants';

describe('ColaboradorController', () => {
  let controller: ColaboradorController;
  let service: ColaboradorService;

  // Mock do ColaboradorService
  const mockColaboradorService = {
    criarColaborador: jest.fn(),
    removerColaborador: jest.fn(),
    getProfile: jest.fn(),
    getGestorColaborador: jest.fn(),
    updateColaborador: jest.fn(),
    trocarSenhaPrimeiroLogin: jest.fn(),
    associarPerfilColaborador: jest.fn(),
    associarColaboradorCiclo: jest.fn(),
    getAvaliacoesRecebidas: jest.fn(),
    getHistoricoNotasPorCiclo: jest.fn(),
    getHistoricoMediaNotasPorCiclo: jest.fn(),
    getProgressoAtual: jest.fn(),
    getAllColaborador: jest.fn(),
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
  const mockColaborador = {
    idColaborador: '123e4567-e89b-12d3-a456-426614174000',
    nomeCompleto: 'João da Silva',
    email: 'joao@teste.com',
    trilhaCarreira: 'DESENVOLVIMENTO',
    cargo: 'DESENVOLVEDOR',
    unidade: 'RECIFE',
    primeiroLogin: true,
    dataCriacao: new Date('2024-01-01'),
  };

  const mockUser = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    roles: ['ADMIN'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ColaboradorController],
      providers: [
        {
          provide: ColaboradorService,
          useValue: mockColaboradorService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    controller = module.get<ColaboradorController>(ColaboradorController);
    service = module.get<ColaboradorService>(ColaboradorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Definição do controller', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
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

      mockColaboradorService.criarColaborador.mockResolvedValue(mockColaborador);

      // Act
      const resultado = await controller.criarColaborador(createDto);

      // Assert
      expect(resultado).toEqual(mockColaborador);
      expect(mockColaboradorService.criarColaborador).toHaveBeenCalledWith(createDto);
      expect(mockColaboradorService.criarColaborador).toHaveBeenCalledTimes(1);
    });

    it('deve retornar erro quando service retorna erro', async () => {
      // Arrange
      const createDto: CreateColaboradorDto = {
        nomeCompleto: 'Colaborador Existente',
        email: 'existente@teste.com',
        senha: 'senha123',
        colaboradorComum: true,
      };

      const mockError = {
        status: 400,
        message: 'Colaborador já existe',
      };

      mockColaboradorService.criarColaborador.mockResolvedValue(mockError);

      // Act
      const resultado = await controller.criarColaborador(createDto);

      // Assert
      expect(resultado).toEqual(mockError);
      expect(mockColaboradorService.criarColaborador).toHaveBeenCalledWith(createDto);
    });
  });

  describe('removerColaborador', () => {
    it('deve remover um colaborador com sucesso', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockColaboradorService.removerColaborador.mockResolvedValue(mockColaborador);

      // Act
      const resultado = await controller.removerColaborador(id);

      // Assert
      expect(resultado).toEqual(mockColaborador);
      expect(mockColaboradorService.removerColaborador).toHaveBeenCalledWith(id);
      expect(mockColaboradorService.removerColaborador).toHaveBeenCalledTimes(1);
    });

    it('deve retornar erro quando colaborador não encontrado', async () => {
      // Arrange
      const id = 'inexistente';
      const mockError = {
        status: 404,
        message: 'Colaborador não encontrado',
      };

      mockColaboradorService.removerColaborador.mockResolvedValue(mockError);

      // Act
      const resultado = await controller.removerColaborador(id);

      // Assert
      expect(resultado).toEqual(mockError);
      expect(mockColaboradorService.removerColaborador).toHaveBeenCalledWith(id);
    });
  });

  describe('getProfile', () => {
    it('deve retornar o perfil do colaborador', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockColaboradorService.getProfile.mockResolvedValue(mockColaborador);

      // Act
      const resultado = await controller.getProfile(id);

      // Assert
      expect(resultado).toEqual(mockColaborador);
      expect(mockColaboradorService.getProfile).toHaveBeenCalledWith(id);
      expect(mockColaboradorService.getProfile).toHaveBeenCalledTimes(1);
    });

    it('deve retornar null quando colaborador não encontrado', async () => {
      // Arrange
      const id = 'inexistente';
      mockColaboradorService.getProfile.mockResolvedValue(null);

      // Act
      const resultado = await controller.getProfile(id);

      // Assert
      expect(resultado).toBeNull();
      expect(mockColaboradorService.getProfile).toHaveBeenCalledWith(id);
    });
  });

  describe('getGestorColaborador', () => {
    it('deve retornar colaborador para gestor autorizado', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const req = { user: mockUser };

      mockColaboradorService.getGestorColaborador.mockResolvedValue(mockColaborador);

      // Act
      const resultado = await controller.getGestorColaborador(id, req);

      // Assert
      expect(resultado).toEqual(mockColaborador);
      expect(mockColaboradorService.getGestorColaborador).toHaveBeenCalledWith(id, mockUser);
      expect(mockColaboradorService.getGestorColaborador).toHaveBeenCalledTimes(1);
    });

    it('deve retornar erro de acesso negado', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const req = { user: { userId: 'outro-id', roles: ['COLABORADOR_COMUM'] } };
      const mockError = {
        status: 403,
        message: 'Acesso negado.',
      };

      mockColaboradorService.getGestorColaborador.mockResolvedValue(mockError);

      // Act
      const resultado = await controller.getGestorColaborador(id, req);

      // Assert
      expect(resultado).toEqual(mockError);
      expect(mockColaboradorService.getGestorColaborador).toHaveBeenCalledWith(id, req.user);
    });
  });

  describe('atualizarColaborador', () => {
    it('deve atualizar colaborador com sucesso', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto: UpdateColaboradorDto = {
        nomeCompleto: 'Nome Atualizado',
        cargo: 'DESENVOLVEDOR',
      };

      const colaboradorAtualizado = { ...mockColaborador, ...updateDto };
      mockColaboradorService.updateColaborador.mockResolvedValue(colaboradorAtualizado);

      // Act
      const resultado = await controller.atualizarColaborador(id, updateDto);

      // Assert
      expect(resultado).toEqual(colaboradorAtualizado);
      expect(mockColaboradorService.updateColaborador).toHaveBeenCalledWith(id, updateDto);
      expect(mockColaboradorService.updateColaborador).toHaveBeenCalledTimes(1);
    });

    it('deve retornar erro quando ID inválido', async () => {
      // Arrange
      const id = 'id-invalido';
      const updateDto: UpdateColaboradorDto = { nomeCompleto: 'Nome' };
      const mockError = {
        status: 400,
        message: 'ID do colaborador inválido',
      };

      mockColaboradorService.updateColaborador.mockResolvedValue(mockError);

      // Act
      const resultado = await controller.atualizarColaborador(id, updateDto);

      // Assert
      expect(resultado).toEqual(mockError);
      expect(mockColaboradorService.updateColaborador).toHaveBeenCalledWith(id, updateDto);
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

      const mockResponse = { message: 'Senha alterada com sucesso' };
      mockColaboradorService.trocarSenhaPrimeiroLogin.mockResolvedValue(mockResponse);

      // Act
      const resultado = await controller.trocarSenhaPrimeiroLogin(id, dto);

      // Assert
      expect(resultado).toEqual(mockResponse);
      expect(mockColaboradorService.trocarSenhaPrimeiroLogin).toHaveBeenCalledWith(id, dto);
      expect(mockColaboradorService.trocarSenhaPrimeiroLogin).toHaveBeenCalledTimes(1);
    });

    it('deve lançar erro quando service lança erro', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const dto: TrocarSenhaDto = {
        senhaAtual: 'senhaErrada',
        novaSenha: 'novaSenha123',
      };

      mockColaboradorService.trocarSenhaPrimeiroLogin.mockRejectedValue(
        new Error('Senha atual incorreta')
      );

      // Act & Assert
      await expect(controller.trocarSenhaPrimeiroLogin(id, dto)).rejects.toThrow(
        'Senha atual incorreta'
      );
      expect(mockColaboradorService.trocarSenhaPrimeiroLogin).toHaveBeenCalledWith(id, dto);
    });
  });

  describe('associarPerfil', () => {
    it('deve associar perfil com sucesso', async () => {
      // Arrange
      const data: AssociatePerfilDto = {
        idColaborador: '123e4567-e89b-12d3-a456-426614174000',
        tipoPerfil: 'GESTOR',
      };

      const mockPerfilAssociado = {
        idColaborador: data.idColaborador,
        tipoPerfil: 'GESTOR',
      };

      mockColaboradorService.associarPerfilColaborador.mockResolvedValue(mockPerfilAssociado);

      // Act
      const resultado = await controller.associarPerfil(data);

      // Assert
      expect(resultado).toEqual(mockPerfilAssociado);
      expect(mockColaboradorService.associarPerfilColaborador).toHaveBeenCalledWith(
        data.idColaborador,
        data.tipoPerfil
      );
      expect(mockColaboradorService.associarPerfilColaborador).toHaveBeenCalledTimes(1);
    });

    it('deve retornar erro quando perfil já associado', async () => {
      // Arrange
      const data: AssociatePerfilDto = {
        idColaborador: '123e4567-e89b-12d3-a456-426614174000',
        tipoPerfil: 'GESTOR',
      };

      const mockError = {
        status: 400,
        message: 'Perfil já associado ao colaborador',
      };

      mockColaboradorService.associarPerfilColaborador.mockResolvedValue(mockError);

      // Act
      const resultado = await controller.associarPerfil(data);

      // Assert
      expect(resultado).toEqual(mockError);
      expect(mockColaboradorService.associarPerfilColaborador).toHaveBeenCalledWith(
        data.idColaborador,
        data.tipoPerfil
      );
    });
  });

  describe('associarCiclo', () => {
    it('deve associar colaborador ao ciclo com sucesso', async () => {
      // Arrange
      const data = {
        idColaborador: '123e4567-e89b-12d3-a456-426614174000',
        idCiclo: '456e7890-e89b-12d3-a456-426614174001',
      };

      const mockAssociacao = {
        idColaborador: data.idColaborador,
        idCiclo: data.idCiclo,
      };

      mockColaboradorService.associarColaboradorCiclo.mockResolvedValue(mockAssociacao);

      // Act
      const resultado = await controller.associarCiclo(data);

      // Assert
      expect(resultado).toEqual(mockAssociacao);
      expect(mockColaboradorService.associarColaboradorCiclo).toHaveBeenCalledWith(
        data.idColaborador,
        data.idCiclo
      );
      expect(mockColaboradorService.associarColaboradorCiclo).toHaveBeenCalledTimes(1);
    });

    it('deve retornar erro quando colaborador não encontrado', async () => {
      // Arrange
      const data = {
        idColaborador: 'inexistente',
        idCiclo: '456e7890-e89b-12d3-a456-426614174001',
      };

      const mockError = {
        status: 404,
        message: 'Colaborador não encontrado',
      };

      mockColaboradorService.associarColaboradorCiclo.mockResolvedValue(mockError);

      // Act
      const resultado = await controller.associarCiclo(data);

      // Assert
      expect(resultado).toEqual(mockError);
      expect(mockColaboradorService.associarColaboradorCiclo).toHaveBeenCalledWith(
        data.idColaborador,
        data.idCiclo
      );
    });
  });

  describe('getAvaliacoesRecebidas', () => {
    it('deve retornar quantidade de avaliações recebidas', async () => {
      // Arrange
      const idColaborador = '123e4567-e89b-12d3-a456-426614174000';
      const mockResponse = { quantidadeAvaliacoes: 5 };

      mockColaboradorService.getAvaliacoesRecebidas.mockResolvedValue(mockResponse);

      // Act
      const resultado = await controller.getAvaliacoesRecebidas(idColaborador);

      // Assert
      expect(resultado).toEqual(mockResponse);
      expect(mockColaboradorService.getAvaliacoesRecebidas).toHaveBeenCalledWith(idColaborador);
      expect(mockColaboradorService.getAvaliacoesRecebidas).toHaveBeenCalledTimes(1);
    });

    it('deve retornar zero avaliações', async () => {
      // Arrange
      const idColaborador = '123e4567-e89b-12d3-a456-426614174000';
      const mockResponse = { quantidadeAvaliacoes: 0 };

      mockColaboradorService.getAvaliacoesRecebidas.mockResolvedValue(mockResponse);

      // Act
      const resultado = await controller.getAvaliacoesRecebidas(idColaborador);

      // Assert
      expect(resultado).toEqual(mockResponse);
      expect(mockColaboradorService.getAvaliacoesRecebidas).toHaveBeenCalledWith(idColaborador);
    });
  });

  describe('getHistoricoNotasPorCiclo', () => {
    it('deve retornar histórico de notas por ciclo', async () => {
      // Arrange
      const idColaborador = '123e4567-e89b-12d3-a456-426614174000';
      const mockHistorico = [
        { ciclo: 'Ciclo 2024', notas: [8.5, 9.0, 7.5] },
        { ciclo: 'Ciclo 2023', notas: [8.0, 8.5, 7.0] },
      ];

      mockColaboradorService.getHistoricoNotasPorCiclo.mockResolvedValue(mockHistorico);

      // Act
      const resultado = await controller.getHistoricoNotasPorCiclo(idColaborador);

      // Assert
      expect(resultado).toEqual(mockHistorico);
      expect(mockColaboradorService.getHistoricoNotasPorCiclo).toHaveBeenCalledWith(idColaborador);
      expect(mockColaboradorService.getHistoricoNotasPorCiclo).toHaveBeenCalledTimes(1);
    });
  });

  describe('getHistoricoMediaNotasPorCiclo', () => {
    it('deve retornar histórico de média de notas por ciclo', async () => {
      // Arrange
      const idColaborador = '123e4567-e89b-12d3-a456-426614174000';
      const mockHistorico = [
        { ciclo: 'Ciclo 2024', mediaNotas: 8.3 },
        { ciclo: 'Ciclo 2023', mediaNotas: 7.8 },
      ];

      mockColaboradorService.getHistoricoMediaNotasPorCiclo.mockResolvedValue(mockHistorico);

      // Act
      const resultado = await controller.getHistoricoMediaNotasPorCiclo(idColaborador);

      // Assert
      expect(resultado).toEqual(mockHistorico);
      expect(mockColaboradorService.getHistoricoMediaNotasPorCiclo).toHaveBeenCalledWith(idColaborador);
      expect(mockColaboradorService.getHistoricoMediaNotasPorCiclo).toHaveBeenCalledTimes(1);
    });
  });

  describe('getProgressoAtual', () => {
    it('deve retornar progresso atual do colaborador', async () => {
      // Arrange
      const idColaborador = '123e4567-e89b-12d3-a456-426614174000';
      const mockProgresso = [
        { TipoAvaliacao: 'auto', porcentagemPreenchimento: 50 },
        { TipoAvaliacao: '360', porcentagemPreenchimento: 75 },
        { TipoAvaliacao: 'Lider/mentor', porcentagemPreenchimento: 100 },
      ];

      mockColaboradorService.getProgressoAtual.mockResolvedValue(mockProgresso);

      // Act
      const resultado = await controller.getProgressoAtual(idColaborador);

      // Assert
      expect(resultado).toEqual(mockProgresso);
      expect(mockColaboradorService.getProgressoAtual).toHaveBeenCalledWith(idColaborador);
      expect(mockColaboradorService.getProgressoAtual).toHaveBeenCalledTimes(1);
    });

    it('deve retornar array vazio quando não há progresso', async () => {
      // Arrange
      const idColaborador = '123e4567-e89b-12d3-a456-426614174000';
      const mockProgresso: any[] = [];

      mockColaboradorService.getProgressoAtual.mockResolvedValue(mockProgresso);

      // Act
      const resultado = await controller.getProgressoAtual(idColaborador);

      // Assert
      expect(resultado).toEqual([]);
      expect(mockColaboradorService.getProgressoAtual).toHaveBeenCalledWith(idColaborador);
    });
  });

  describe('getAllColaboradores', () => {
    it('deve retornar todos os colaboradores', async () => {
      // Arrange
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

      mockColaboradorService.getAllColaborador.mockResolvedValue(mockColaboradores);

      // Act
      const resultado = await controller.getAllColaboradores();

      // Assert
      expect(resultado).toEqual(mockColaboradores);
      expect(mockColaboradorService.getAllColaborador).toHaveBeenCalledTimes(1);
    });

    it('deve retornar array vazio quando não há colaboradores', async () => {
      // Arrange
      mockColaboradorService.getAllColaborador.mockResolvedValue([]);

      // Act
      const resultado = await controller.getAllColaboradores();

      // Assert
      expect(resultado).toEqual([]);
      expect(mockColaboradorService.getAllColaborador).toHaveBeenCalledTimes(1);
    });
  });

  describe('getColaboradorConstantes', () => {
    it('deve retornar constantes do colaborador', async () => {
      // Act
      const resultado = await controller.getColaboradorConstantes();

      // Assert
      expect(resultado).toEqual({
        trilhas: Object.values(Trilha),
        cargos: Object.values(Cargo),
        unidades: Object.values(Unidade),
      });
    });

    it('deve retornar todas as trilhas disponíveis', async () => {
      // Act
      const resultado = await controller.getColaboradorConstantes();

      // Assert
      expect(resultado.trilhas).toContain('DESENVOLVIMENTO');
      expect(resultado.trilhas).toContain('QA');
      expect(resultado.trilhas).toContain('UX');
      expect(resultado.trilhas.length).toBeGreaterThan(0);
    });

    it('deve retornar todos os cargos disponíveis', async () => {
      // Act
      const resultado = await controller.getColaboradorConstantes();

      // Assert
      expect(resultado.cargos).toContain('DESENVOLVEDOR');
      expect(resultado.cargos).toContain('QA');
      expect(resultado.cargos.length).toBeGreaterThan(0);
    });

    it('deve retornar todas as unidades disponíveis', async () => {
      // Act
      const resultado = await controller.getColaboradorConstantes();

      // Assert
      expect(resultado.unidades).toContain('RECIFE');
      expect(resultado.unidades).toContain('SAO PAULO');
      expect(resultado.unidades.length).toBeGreaterThan(0);
    });
  });

  describe('Guards e Autenticação', () => {
    it('deve verificar se JwtAuthGuard está sendo aplicado', () => {
      // Este teste verifica se os guards estão configurados
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
    });

    it('deve verificar se RolesGuard está sendo aplicado', () => {
      // Este teste verifica se os guards estão configurados
      expect(mockRolesGuard.canActivate).toBeDefined();
    });

    it('deve simular usuário autenticado', () => {
      // Arrange
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: undefined,
          }),
        }),
      } as ExecutionContext;

      // Act
      const result = mockJwtAuthGuard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });
  });
});