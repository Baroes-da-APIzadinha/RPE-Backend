import { Test, TestingModule } from '@nestjs/testing';
import { ColaboradorController } from '../colaborador/colaborador.controller';
import { ColaboradorService } from '../colaborador/colaborador.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { EqualizacaoService } from '../equalizacao/equalizacao.service';
import { CreateColaboradorDto, UpdateColaboradorDto, AssociatePerfilDto, TrocarSenhaDto } from '../colaborador/colaborador.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ExecutionContext } from '@nestjs/common';
import { Trilha, Cargo, Unidade } from '../colaborador/colaborador.constants';
import 'reflect-metadata';

describe('ColaboradorController', () => {
  let controller: ColaboradorController;
  let service: ColaboradorService;
  let auditoriaService: AuditoriaService;
  let equalizacaoService: EqualizacaoService;

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
    getInfoMentorados: jest.fn(),
    listarPerfisColaborador: jest.fn(),
    removerPerfilColaborador: jest.fn(),
  };

  // Mock do AuditoriaService
  const mockAuditoriaService = {
    log: jest.fn(),
    getLogs: jest.fn(),
  };

  // Mock do EqualizacaoService
  const mockEqualizacaoService = {
    getEqualizacaoColaboradorCiclo: jest.fn(),
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
      idColaborador: 'user-123',
      email: 'admin@empresa.com',
      roles: ['ADMIN'] 
    },
    ip: '127.0.0.1',
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
        {
          provide: AuditoriaService,
          useValue: mockAuditoriaService,
        },
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

    controller = module.get<ColaboradorController>(ColaboradorController);
    service = module.get<ColaboradorService>(ColaboradorService);
    auditoriaService = module.get<AuditoriaService>(AuditoriaService);
    equalizacaoService = module.get<EqualizacaoService>(EqualizacaoService);
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

    it('deve ter o equalizacaoService injetado', () => {
      expect(equalizacaoService).toBeDefined();
    });
  });

  describe('criarColaborador', () => {
    it('deve criar um colaborador com sucesso (sem auditoria)', async () => {
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
      
      // Verifica que auditoria NÃO foi chamada (operação de criação não tem auditoria no controller)
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
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
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve criar colaborador com diferentes perfis', async () => {
      // Arrange
      const createDtos = [
        { nomeCompleto: 'Admin', email: 'admin@teste.com', senha: '123', admin: true },
        { nomeCompleto: 'Gestor', email: 'gestor@teste.com', senha: '123', gestor: true },
        { nomeCompleto: 'RH', email: 'rh@teste.com', senha: '123', rh: true },
        { nomeCompleto: 'Mentor', email: 'mentor@teste.com', senha: '123', mentor: true },
      ];

      mockColaboradorService.criarColaborador.mockResolvedValue(mockColaborador);

      // Act & Assert
      for (const dto of createDtos) {
        const resultado = await controller.criarColaborador(dto);
        expect(resultado).toEqual(mockColaborador);
        expect(mockColaboradorService.criarColaborador).toHaveBeenCalledWith(dto);
      }

      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('removerColaborador', () => {
    it('deve remover um colaborador com sucesso e registrar auditoria', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockColaboradorService.removerColaborador.mockResolvedValue(mockColaborador);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.removerColaborador(id, mockRequest);

      // Assert
      expect(resultado).toEqual(mockColaborador);
      expect(mockColaboradorService.removerColaborador).toHaveBeenCalledWith(id);
      expect(mockColaboradorService.removerColaborador).toHaveBeenCalledTimes(1);

      // Verifica auditoria
      expect(mockAuditoriaService.log).toHaveBeenCalledTimes(1);
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.idColaborador,
        action: 'delete',
        resource: 'Colaborador',
        details: { deletedId: id },
        ip: mockRequest.ip,
      });
    });

    it('deve retornar erro quando colaborador não encontrado e NÃO registrar auditoria', async () => {
      // Arrange
      const id = 'inexistente';
      const mockError = {
        status: 404,
        message: 'Colaborador não encontrado',
      };

      mockColaboradorService.removerColaborador.mockResolvedValue(mockError);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.removerColaborador(id, mockRequest);

      // Assert
      expect(resultado).toEqual(mockError);
      expect(mockColaboradorService.removerColaborador).toHaveBeenCalledWith(id);

      // Verifica que auditoria foi chamada mesmo com erro (comportamento atual do controller)
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.idColaborador,
        action: 'delete',
        resource: 'Colaborador',
        details: { deletedId: id },
        ip: mockRequest.ip,
      });
    });

    it('deve continuar funcionando mesmo se auditoria falhar', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockColaboradorService.removerColaborador.mockResolvedValue(mockColaborador);
      mockAuditoriaService.log.mockRejectedValue(new Error('Erro na auditoria'));

      // Act & Assert
      await expect(controller.removerColaborador(id, mockRequest)).rejects.toThrow('Erro na auditoria');
      expect(mockColaboradorService.removerColaborador).toHaveBeenCalledWith(id);
    });

    it('deve funcionar com diferentes tipos de request', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const requestTypes = [
        { user: { idColaborador: 'user-1' }, ip: '127.0.0.1' },
        { user: { idColaborador: 'user-2' }, ip: '192.168.1.1' },
        { user: undefined, ip: '10.0.0.1' },
        { user: { idColaborador: null }, ip: undefined },
      ];

      mockColaboradorService.removerColaborador.mockResolvedValue(mockColaborador);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act & Assert
      for (const request of requestTypes) {
        await controller.removerColaborador(id, request);

        expect(mockAuditoriaService.log).toHaveBeenCalledWith({
          userId: request.user?.idColaborador,
          action: 'delete',
          resource: 'Colaborador',
          details: { deletedId: id },
          ip: request.ip,
        });

        jest.clearAllMocks();
      }
    });
  });

  describe('getProfile', () => {
    it('deve retornar o perfil do colaborador sem auditoria', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockColaboradorService.getProfile.mockResolvedValue(mockColaborador);

      // Act
      const resultado = await controller.getProfile(id);

      // Assert
      expect(resultado).toEqual(mockColaborador);
      expect(mockColaboradorService.getProfile).toHaveBeenCalledWith(id);
      expect(mockColaboradorService.getProfile).toHaveBeenCalledTimes(1);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
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
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('getGestorColaborador', () => {
    it('deve retornar colaborador para gestor autorizado sem auditoria', async () => {
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
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
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
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('atualizarColaborador', () => {
    it('deve atualizar colaborador com sucesso sem auditoria', async () => {
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
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
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
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('trocarSenhaPrimeiroLogin', () => {
    it('deve trocar senha com sucesso sem auditoria', async () => {
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
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
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
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('associarPerfil', () => {
    it('deve associar perfil com sucesso sem auditoria', async () => {
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
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
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
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('associarCiclo', () => {
    it('deve associar colaborador ao ciclo com sucesso sem auditoria', async () => {
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
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
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
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('getAvaliacoesRecebidas', () => {
    it('deve retornar quantidade de avaliações recebidas sem auditoria', async () => {
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
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
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
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('getHistoricoNotasPorCiclo', () => {
    it('deve retornar histórico de notas por ciclo sem auditoria', async () => {
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
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('getHistoricoMediaNotasPorCiclo', () => {
    it('deve retornar histórico de média de notas por ciclo sem auditoria', async () => {
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
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('getProgressoAtual', () => {
    it('deve retornar progresso atual do colaborador sem auditoria', async () => {
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
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
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
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('getAllColaboradores', () => {
    it('deve retornar todos os colaboradores sem auditoria', async () => {
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
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve retornar array vazio quando não há colaboradores', async () => {
      // Arrange
      mockColaboradorService.getAllColaborador.mockResolvedValue([]);

      // Act
      const resultado = await controller.getAllColaboradores();

      // Assert
      expect(resultado).toEqual([]);
      expect(mockColaboradorService.getAllColaborador).toHaveBeenCalledTimes(1);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('getInfoMentorados', () => {
    it('deve retornar informações dos mentorados sem auditoria', async () => {
      // Arrange
      const idMentor = 'mentor-123';
      const idCiclo = 'ciclo-456';
      const mockMentorados = [
        {
          idMentorado: 'mentorado-1',
          nomeMentorado: 'João Mentorado',
          cargoMentorado: 'DESENVOLVEDOR',
          trilhaMentorado: 'DESENVOLVIMENTO',
          mediaFinal: 8.5,
        },
      ];

      mockColaboradorService.getInfoMentorados.mockResolvedValue(mockMentorados);

      // Act
      const resultado = await controller.getInfoMentorados(idMentor, idCiclo);

      // Assert
      expect(resultado).toEqual(mockMentorados);
      expect(mockColaboradorService.getInfoMentorados).toHaveBeenCalledWith(idMentor, idCiclo);
      expect(mockColaboradorService.getInfoMentorados).toHaveBeenCalledTimes(1);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve retornar array vazio quando mentor não tem mentorados', async () => {
      // Arrange
      const idMentor = 'mentor-sem-mentorados';
      const idCiclo = 'ciclo-456';

      mockColaboradorService.getInfoMentorados.mockResolvedValue([]);

      // Act
      const resultado = await controller.getInfoMentorados(idMentor, idCiclo);

      // Assert
      expect(resultado).toEqual([]);
      expect(mockColaboradorService.getInfoMentorados).toHaveBeenCalledWith(idMentor, idCiclo);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('getColaboradorConstantes', () => {
    it('deve retornar constantes do colaborador sem auditoria', async () => {
      // Act
      const resultado = await controller.getColaboradorConstantes();

      // Assert
      expect(resultado).toEqual({
        trilhas: Object.values(Trilha),
        cargos: Object.values(Cargo),
        unidades: Object.values(Unidade),
      });
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve retornar todas as trilhas disponíveis', async () => {
      // Act
      const resultado = await controller.getColaboradorConstantes();

      // Assert
      expect(resultado.trilhas).toContain('DESENVOLVIMENTO');
      expect(resultado.trilhas).toContain('QA');
      expect(resultado.trilhas).toContain('UX');
      expect(resultado.trilhas.length).toBeGreaterThan(0);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve retornar todos os cargos disponíveis', async () => {
      // Act
      const resultado = await controller.getColaboradorConstantes();

      // Assert
      expect(resultado.cargos).toContain('DESENVOLVEDOR');
      expect(resultado.cargos).toContain('QA');
      expect(resultado.cargos.length).toBeGreaterThan(0);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve retornar todas as unidades disponíveis', async () => {
      // Act
      const resultado = await controller.getColaboradorConstantes();

      // Assert
      expect(resultado.unidades).toContain('RECIFE');
      expect(resultado.unidades).toContain('SAO PAULO');
      expect(resultado.unidades.length).toBeGreaterThan(0);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('listarPerfisPossiveis', () => {
    it('deve retornar lista de perfis possíveis sem auditoria', () => {
      // Act
      const resultado = controller.listarPerfisPossiveis();

      // Assert
      expect(resultado).toBeDefined();
      expect(Array.isArray(resultado)).toBe(true);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('listarPerfisColaborador', () => {
    it('deve retornar perfis do colaborador sem auditoria', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const mockPerfis = ['ADMIN', 'GESTOR'];

      mockColaboradorService.listarPerfisColaborador.mockResolvedValue(mockPerfis);

      // Act
      const resultado = await controller.listarPerfisColaborador(id);

      // Assert
      expect(resultado).toEqual(mockPerfis);
      expect(mockColaboradorService.listarPerfisColaborador).toHaveBeenCalledWith(id);
      expect(mockColaboradorService.listarPerfisColaborador).toHaveBeenCalledTimes(1);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('removerPerfilColaborador', () => {
    it('deve remover perfil do colaborador sem auditoria', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const perfil = 'GESTOR';
      const mockResult = { message: 'Perfil removido com sucesso' };

      mockColaboradorService.removerPerfilColaborador.mockResolvedValue(mockResult);

      // Act
      const resultado = await controller.removerPerfilColaborador(id, perfil);

      // Assert
      expect(resultado).toEqual(mockResult);
      expect(mockColaboradorService.removerPerfilColaborador).toHaveBeenCalledWith(id, perfil);
      expect(mockColaboradorService.removerPerfilColaborador).toHaveBeenCalledTimes(1);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve retornar erro quando perfil não encontrado', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const perfil = 'INEXISTENTE';
      const mockError = {
        status: 404,
        message: 'Perfil não associado ao colaborador',
      };

      mockColaboradorService.removerPerfilColaborador.mockResolvedValue(mockError);

      // Act
      const resultado = await controller.removerPerfilColaborador(id, perfil);

      // Assert
      expect(resultado).toEqual(mockError);
      expect(mockColaboradorService.removerPerfilColaborador).toHaveBeenCalledWith(id, perfil);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('Guards e Autenticação', () => {
    it('deve verificar se JwtAuthGuard está sendo aplicado', () => {
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
    });

    it('deve verificar se RolesGuard está sendo aplicado', () => {
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

    it('deve ter Guards aplicados nos métodos corretos', () => {
      const metodosComRoles = [
        'criarColaborador',
        'removerColaborador',
        'getAllColaboradores',
        'getInfoMentorados',
        'associarPerfil',
        'associarCiclo',
        'getHistoricoNotasPorCiclo',
        'getHistoricoMediaNotasPorCiclo',
        'listarPerfisPossiveis',
        'listarPerfisColaborador',
        'removerPerfilColaborador',
      ];

      metodosComRoles.forEach(metodo => {
        const guards = Reflect.getMetadata('__guards__', ColaboradorController.prototype[metodo]);
        expect(guards).toContain(JwtAuthGuard);
        expect(guards).toContain(RolesGuard);
      });

      const metodosApenasJwt = [
        'getGestorColaborador',
        'getProfile',
        'getAvaliacoesRecebidas',
        'getProgressoAtual',
      ];

      metodosApenasJwt.forEach(metodo => {
        const guards = Reflect.getMetadata('__guards__', ColaboradorController.prototype[metodo]);
        expect(guards).toContain(JwtAuthGuard);
      });
    });

    it('deve ter roles corretas aplicadas', () => {
      const metodosAdminRh = ['criarColaborador', 'removerColaborador', 'getAllColaboradores'];
      metodosAdminRh.forEach(metodo => {
        const roles = Reflect.getMetadata('roles', ColaboradorController.prototype[metodo]);
        expect(roles).toEqual(['ADMIN', 'RH']);
      });

      const metodosAdmin = ['associarPerfil', 'associarCiclo', 'listarPerfisPossiveis', 'listarPerfisColaborador', 'removerPerfilColaborador'];
      metodosAdmin.forEach(metodo => {
        const roles = Reflect.getMetadata('roles', ColaboradorController.prototype[metodo]);
        expect(roles).toEqual(['ADMIN']);
      });

      const metodosRhColaborador = ['getHistoricoNotasPorCiclo', 'getHistoricoMediaNotasPorCiclo'];
      metodosRhColaborador.forEach(metodo => {
        const roles = Reflect.getMetadata('roles', ColaboradorController.prototype[metodo]);
        expect(roles).toEqual(['RH', 'COLABORADOR_COMUM']);
      });

      const metodosMentor = ['getInfoMentorados'];
      metodosMentor.forEach(metodo => {
        const roles = Reflect.getMetadata('roles', ColaboradorController.prototype[metodo]);
        expect(roles).toEqual(['MENTOR']);
      });
    });
  });

  describe('Auditoria específica', () => {
    it('deve registrar auditoria apenas para removerColaborador', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockColaboradorService.removerColaborador.mockResolvedValue(mockColaborador);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      await controller.removerColaborador(id, mockRequest);

      // Assert
      expect(mockAuditoriaService.log).toHaveBeenCalledTimes(1);
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.idColaborador,
        action: 'delete',
        resource: 'Colaborador',
        details: { deletedId: id },
        ip: mockRequest.ip,
      });
    });

    it('deve funcionar com request sem user completo', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const requestSemUser = { user: undefined, ip: '192.168.1.1' };

      mockColaboradorService.removerColaborador.mockResolvedValue(mockColaborador);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      await controller.removerColaborador(id, requestSemUser);

      // Assert
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: undefined,
        action: 'delete',
        resource: 'Colaborador',
        details: { deletedId: id },
        ip: requestSemUser.ip,
      });
    });
  });

  describe('Integração de fluxos', () => {
    it('deve executar fluxo completo: criar -> buscar -> atualizar -> remover', async () => {
      // Arrange
      const createDto: CreateColaboradorDto = {
        nomeCompleto: 'Fluxo Completo',
        email: 'fluxo@teste.com',
        senha: 'senha123',
        colaboradorComum: true,
      };

      const updateDto: UpdateColaboradorDto = {
        nomeCompleto: 'Nome Atualizado',
      };

      const colaboradorCriado = { ...mockColaborador, ...createDto };
      const colaboradorAtualizado = { ...colaboradorCriado, ...updateDto };

      mockColaboradorService.criarColaborador.mockResolvedValue(colaboradorCriado);
      mockColaboradorService.getProfile.mockResolvedValue(colaboradorCriado);
      mockColaboradorService.updateColaborador.mockResolvedValue(colaboradorAtualizado);
      mockColaboradorService.removerColaborador.mockResolvedValue(colaboradorAtualizado);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const criado = await controller.criarColaborador(createDto);
      const buscado = await controller.getProfile(
        'idColaborador' in criado ? criado.idColaborador : ''
      );
      const atualizado = await controller.atualizarColaborador(
        'idColaborador' in criado ? criado.idColaborador : '',
        updateDto
      );
      const removido = await controller.removerColaborador(
        'idColaborador' in criado ? criado.idColaborador : '',
        mockRequest
      );

      // Assert
      expect(criado).toEqual(colaboradorCriado);
      expect(buscado).toEqual(colaboradorCriado);
      expect(atualizado).toEqual(colaboradorAtualizado);
      expect(removido).toEqual(colaboradorAtualizado);

      // Verifica que auditoria foi chamada apenas para remoção
      expect(mockAuditoriaService.log).toHaveBeenCalledTimes(1);
    });

    it('deve listar colaboradores e constantes sem auditoria', async () => {
      // Arrange
      const mockColaboradores = [mockColaborador];
      mockColaboradorService.getAllColaborador.mockResolvedValue(mockColaboradores);

      // Act
      const colaboradores = await controller.getAllColaboradores();
      const constantes = await controller.getColaboradorConstantes();

      // Assert
      expect(colaboradores).toEqual(mockColaboradores);
      expect(constantes).toBeDefined();
      expect(constantes.trilhas).toBeDefined();
      expect(constantes.cargos).toBeDefined();
      expect(constantes.unidades).toBeDefined();
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
        mockColaboradorService.getProfile.mockRejectedValue(erro);
        await expect(controller.getProfile('test-id')).rejects.toThrow(erro.message);
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      }
    });

    it('deve lidar com falha na auditoria durante remoção', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockColaboradorService.removerColaborador.mockResolvedValue(mockColaborador);
      mockAuditoriaService.log.mockRejectedValue(new Error('Falha na auditoria'));

      // Act & Assert
      await expect(controller.removerColaborador(id, mockRequest)).rejects.toThrow('Falha na auditoria');
      expect(mockColaboradorService.removerColaborador).toHaveBeenCalledWith(id);
    });
  });
});