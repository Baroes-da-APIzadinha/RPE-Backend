import { Test, TestingModule } from '@nestjs/testing';
import { CriteriosController } from './criterios.controller';
import { CriteriosService } from './criterios.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { pilarCriterio } from '@prisma/client';
import { CreateCriterioDto, UpdateCriterioDto } from './criterios.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import 'reflect-metadata';

// Mock do CriteriosService
const mockCriteriosService = {
  getCriterios: jest.fn(),
  getCriterio: jest.fn(),
  getCriterioPorPilar: jest.fn(),
  createCriterio: jest.fn(),
  updateCriterio: jest.fn(),
  deleteCriterio: jest.fn(),
};

// Mock do AuditoriaService
const mockAuditoriaService = {
  log: jest.fn(),
  getLogs: jest.fn(),
};

// Mock dos Guards
const mockJwtAuthGuard = {
  canActivate: jest.fn(() => true),
};

const mockRolesGuard = {
  canActivate: jest.fn(() => true),
};

describe('CriteriosController', () => {
  let controller: CriteriosController;
  let service: CriteriosService;
  let auditoriaService: AuditoriaService;

  // Mock do request com dados de usuário
  const mockRequest = {
    user: { 
      userId: 'user-123',
      email: 'admin@empresa.com',
      roles: ['ADMIN'] 
    },
    ip: '127.0.0.1',
  };

  // Dados de teste
  const mockCriterio = {
    idCriterio: '123e4567-e89b-12d3-a456-426614174000',
    nomeCriterio: 'Comunicação',
    descricao: 'Capacidade de comunicação eficaz',
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

  // DTOs de teste
  const createCriterioDto: CreateCriterioDto = {
    nomeCriterio: 'Novo Critério',
    descricao: 'Descrição do novo critério',
    peso: 1.0,
    obrigatorio: true,
    pilar: pilarCriterio.Execucao,
  };

  const updateCriterioDto: UpdateCriterioDto = {
    nomeCriterio: 'Critério Atualizado',
    peso: 2.5,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CriteriosController],
      providers: [
        {
          provide: CriteriosService,
          useValue: mockCriteriosService,
        },
        {
          provide: AuditoriaService,
          useValue: mockAuditoriaService,
        },
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue(mockJwtAuthGuard)
    .overrideGuard(RolesGuard)
    .useValue(mockRolesGuard)
    .compile();

    controller = module.get<CriteriosController>(CriteriosController);
    service = module.get<CriteriosService>(CriteriosService);
    auditoriaService = module.get<AuditoriaService>(AuditoriaService);
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
  });

  describe('getCriterios', () => {
    it('deve retornar todos os critérios com sucesso', async () => {
      // Arrange
      mockCriteriosService.getCriterios.mockResolvedValue(mockCriterios);

      // Act
      const resultado = await controller.getCriterios();

      // Assert
      expect(resultado).toEqual(mockCriterios);
      expect(mockCriteriosService.getCriterios).toHaveBeenCalledWith();
      expect(mockCriteriosService.getCriterios).toHaveBeenCalledTimes(1);
      
      // Verifica que auditoria NÃO foi chamada para operação de leitura
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve retornar array vazio quando não há critérios', async () => {
      // Arrange
      mockCriteriosService.getCriterios.mockResolvedValue([]);

      // Act
      const resultado = await controller.getCriterios();

      // Assert
      expect(resultado).toEqual([]);
      expect(mockCriteriosService.getCriterios).toHaveBeenCalledTimes(1);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve propagar erros do service', async () => {
      // Arrange
      const erro = new Error('Erro interno do servidor');
      mockCriteriosService.getCriterios.mockRejectedValue(erro);

      // Act & Assert
      await expect(controller.getCriterios()).rejects.toThrow('Erro interno do servidor');
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('getCriterio', () => {
    it('deve retornar um critério específico por ID', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockCriteriosService.getCriterio.mockResolvedValue(mockCriterio);

      // Act
      const resultado = await controller.getCriterio(id);

      // Assert
      expect(resultado).toEqual(mockCriterio);
      expect(mockCriteriosService.getCriterio).toHaveBeenCalledWith(id);
      expect(mockCriteriosService.getCriterio).toHaveBeenCalledTimes(1);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve retornar null quando critério não encontrado', async () => {
      // Arrange
      const id = 'inexistente';
      mockCriteriosService.getCriterio.mockResolvedValue(null);

      // Act
      const resultado = await controller.getCriterio(id);

      // Assert
      expect(resultado).toBeNull();
      expect(mockCriteriosService.getCriterio).toHaveBeenCalledWith(id);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve aceitar qualquer string como ID', async () => {
      // Arrange
      const ids = ['123', 'abc-def', 'uuid-inválido'];
      mockCriteriosService.getCriterio.mockResolvedValue(null);

      // Act & Assert
      for (const id of ids) {
        await controller.getCriterio(id);
        expect(mockCriteriosService.getCriterio).toHaveBeenCalledWith(id);
      }
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('getCriterioPorPilar', () => {
    it('deve retornar critérios filtrados por pilar Execução', async () => {
      // Arrange
      const pilar = pilarCriterio.Execucao;
      const criteriosFiltrados = [mockCriterio];
      mockCriteriosService.getCriterioPorPilar.mockResolvedValue(criteriosFiltrados);

      // Act
      const resultado = await controller.getCriterioPorPilar(pilar);

      // Assert
      expect(resultado).toEqual(criteriosFiltrados);
      expect(mockCriteriosService.getCriterioPorPilar).toHaveBeenCalledWith(pilar);
      expect(mockCriteriosService.getCriterioPorPilar).toHaveBeenCalledTimes(1);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve retornar critérios filtrados por pilar Gestão e Liderança', async () => {
      // Arrange
      const pilar = pilarCriterio.Gestao_e_Lideranca;
      const criteriosFiltrados = [mockCriterios[1]];
      mockCriteriosService.getCriterioPorPilar.mockResolvedValue(criteriosFiltrados);

      // Act
      const resultado = await controller.getCriterioPorPilar(pilar);

      // Assert
      expect(resultado).toEqual(criteriosFiltrados);
      expect(mockCriteriosService.getCriterioPorPilar).toHaveBeenCalledWith(pilar);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve retornar array vazio quando não há critérios para o pilar', async () => {
      // Arrange
      const pilar = pilarCriterio.Execucao;
      mockCriteriosService.getCriterioPorPilar.mockResolvedValue([]);

      // Act
      const resultado = await controller.getCriterioPorPilar(pilar);

      // Assert
      expect(resultado).toEqual([]);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve testar todos os pilares disponíveis', async () => {
      // Arrange
      const pilares = Object.values(pilarCriterio);
      mockCriteriosService.getCriterioPorPilar.mockResolvedValue([]);

      // Act & Assert
      for (const pilar of pilares) {
        await controller.getCriterioPorPilar(pilar);
        expect(mockCriteriosService.getCriterioPorPilar).toHaveBeenCalledWith(pilar);
      }
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('createCriterio', () => {
    it('deve criar um novo critério com sucesso e registrar auditoria', async () => {
      // Arrange
      const criterioCreated = {
        ...mockCriterio,
        ...createCriterioDto,
        idCriterio: 'novo-id',
      };

      mockCriteriosService.createCriterio.mockResolvedValue(criterioCreated);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.createCriterio(createCriterioDto, mockRequest);

      // Assert
      expect(resultado).toEqual(criterioCreated);
      expect(mockCriteriosService.createCriterio).toHaveBeenCalledWith(createCriterioDto);
      expect(mockCriteriosService.createCriterio).toHaveBeenCalledTimes(1);

      // Verifica se auditoria foi registrada corretamente
      expect(mockAuditoriaService.log).toHaveBeenCalledTimes(1);
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.userId,
        action: 'criar_criterio',
        resource: 'Criterio',
        details: { ...createCriterioDto, result: criterioCreated },
        ip: mockRequest.ip,
      });
    });

    it('deve criar critério com dados mínimos e registrar auditoria', async () => {
      // Arrange
      const createDtoMinimo: CreateCriterioDto = {
        nomeCriterio: 'Critério Mínimo',
      };

      const criterioCreated = {
        ...mockCriterio,
        nomeCriterio: createDtoMinimo.nomeCriterio,
      };

      mockCriteriosService.createCriterio.mockResolvedValue(criterioCreated);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.createCriterio(createDtoMinimo, mockRequest);

      // Assert
      expect(resultado).toEqual(criterioCreated);
      expect(mockCriteriosService.createCriterio).toHaveBeenCalledWith(createDtoMinimo);
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.userId,
        action: 'criar_criterio',
        resource: 'Criterio',
        details: { ...createDtoMinimo, result: criterioCreated },
        ip: mockRequest.ip,
      });
    });

    it('deve propagar erros de validação do service sem registrar auditoria', async () => {
      // Arrange
      const createDtoInvalido: CreateCriterioDto = {
        nomeCriterio: '',
      };
      const erro = new Error('Nome do critério é obrigatório');
      mockCriteriosService.createCriterio.mockRejectedValue(erro);

      // Act & Assert
      await expect(controller.createCriterio(createDtoInvalido, mockRequest)).rejects.toThrow('Nome do critério é obrigatório');
      
      // Verifica que auditoria NÃO foi chamada em caso de erro
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve continuar funcionando mesmo se auditoria falhar', async () => {
      // Arrange
      const criterioCreated = {
        ...mockCriterio,
        ...createCriterioDto,
        idCriterio: 'novo-id',
      };

      mockCriteriosService.createCriterio.mockResolvedValue(criterioCreated);
      mockAuditoriaService.log.mockRejectedValue(new Error('Erro na auditoria'));

      // Act & Assert
      await expect(controller.createCriterio(createCriterioDto, mockRequest)).rejects.toThrow('Erro na auditoria');
      
      // Verifica que o service foi chamado normalmente
      expect(mockCriteriosService.createCriterio).toHaveBeenCalledWith(createCriterioDto);
    });

    it('deve funcionar com usuário sem informações completas', async () => {
      // Arrange
      const requestSemUserCompleto = {
        user: undefined,
        ip: '192.168.1.1',
      };

      const criterioCreated = {
        ...mockCriterio,
        ...createCriterioDto,
        idCriterio: 'novo-id',
      };

      mockCriteriosService.createCriterio.mockResolvedValue(criterioCreated);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.createCriterio(createCriterioDto, requestSemUserCompleto);

      // Assert
      expect(resultado).toEqual(criterioCreated);
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: undefined,
        action: 'criar_criterio',
        resource: 'Criterio',
        details: { ...createCriterioDto, result: criterioCreated },
        ip: requestSemUserCompleto.ip,
      });
    });
  });

  describe('updateCriterio', () => {
    it('deve atualizar um critério com sucesso e registrar auditoria', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const criterioUpdated = {
        ...mockCriterio,
        ...updateCriterioDto,
        dataUltimaModificacao: new Date(),
      };

      mockCriteriosService.updateCriterio.mockResolvedValue(criterioUpdated);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.updateCriterio(id, updateCriterioDto, mockRequest);

      // Assert
      expect(resultado).toEqual(criterioUpdated);
      expect(mockCriteriosService.updateCriterio).toHaveBeenCalledWith(id, updateCriterioDto);
      expect(mockCriteriosService.updateCriterio).toHaveBeenCalledTimes(1);

      // Verifica auditoria
      expect(mockAuditoriaService.log).toHaveBeenCalledTimes(1);
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.userId,
        action: 'atualizar_criterio',
        resource: 'Criterio',
        details: { id, ...updateCriterioDto, result: criterioUpdated },
        ip: mockRequest.ip,
      });
    });

    it('deve atualizar apenas campos fornecidos e registrar auditoria', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateDtoParcial: UpdateCriterioDto = {
        peso: 3.0,
      };

      const criterioUpdated = {
        ...mockCriterio,
        peso: 3.0,
      };

      mockCriteriosService.updateCriterio.mockResolvedValue(criterioUpdated);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.updateCriterio(id, updateDtoParcial, mockRequest);

      // Assert
      expect(resultado).toEqual(criterioUpdated);
      expect(mockCriteriosService.updateCriterio).toHaveBeenCalledWith(id, updateDtoParcial);
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.userId,
        action: 'atualizar_criterio',
        resource: 'Criterio',
        details: { id, ...updateDtoParcial, result: criterioUpdated },
        ip: mockRequest.ip,
      });
    });

    it('deve aceitar DTO vazio e registrar auditoria', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateDtoVazio: UpdateCriterioDto = {};

      mockCriteriosService.updateCriterio.mockResolvedValue(mockCriterio);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.updateCriterio(id, updateDtoVazio, mockRequest);

      // Assert
      expect(resultado).toEqual(mockCriterio);
      expect(mockCriteriosService.updateCriterio).toHaveBeenCalledWith(id, updateDtoVazio);
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.userId,
        action: 'atualizar_criterio',
        resource: 'Criterio',
        details: { id, result: mockCriterio },
        ip: mockRequest.ip,
      });
    });

    it('deve propagar erro quando critério não encontrado sem registrar auditoria', async () => {
      // Arrange
      const id = 'inexistente';
      const erro = new Error('Critério não encontrado');
      mockCriteriosService.updateCriterio.mockRejectedValue(erro);

      // Act & Assert
      await expect(controller.updateCriterio(id, updateCriterioDto, mockRequest)).rejects.toThrow('Critério não encontrado');
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('deleteCriterio', () => {
    it('deve deletar um critério com sucesso e registrar auditoria', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockCriteriosService.deleteCriterio.mockResolvedValue(mockCriterio);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.deleteCriterio(id, mockRequest);

      // Assert
      expect(resultado).toEqual(mockCriterio);
      expect(mockCriteriosService.deleteCriterio).toHaveBeenCalledWith(id);
      expect(mockCriteriosService.deleteCriterio).toHaveBeenCalledTimes(1);

      // Verifica auditoria
      expect(mockAuditoriaService.log).toHaveBeenCalledTimes(1);
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.userId,
        action: 'deletar_criterio',
        resource: 'Criterio',
        details: { id, result: mockCriterio },
        ip: mockRequest.ip,
      });
    });

    it('deve propagar erro quando critério não encontrado sem registrar auditoria', async () => {
      // Arrange
      const id = 'inexistente';
      const erro = new Error('Critério não encontrado para exclusão');
      mockCriteriosService.deleteCriterio.mockRejectedValue(erro);

      // Act & Assert
      await expect(controller.deleteCriterio(id, mockRequest)).rejects.toThrow('Critério não encontrado para exclusão');
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve propagar erro de constraint sem registrar auditoria', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const erro = new Error('Não é possível deletar: critério está sendo usado');
      mockCriteriosService.deleteCriterio.mockRejectedValue(erro);

      // Act & Assert
      await expect(controller.deleteCriterio(id, mockRequest)).rejects.toThrow('Não é possível deletar: critério está sendo usado');
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve continuar funcionando mesmo se auditoria falhar', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockCriteriosService.deleteCriterio.mockResolvedValue(mockCriterio);
      mockAuditoriaService.log.mockRejectedValue(new Error('Erro na auditoria'));

      // Act & Assert
      await expect(controller.deleteCriterio(id, mockRequest)).rejects.toThrow('Erro na auditoria');
      expect(mockCriteriosService.deleteCriterio).toHaveBeenCalledWith(id);
    });
  });

  describe('Guards e Autorizações', () => {
    it('deve ter JwtAuthGuard aplicado em todas as rotas', () => {
      const metodos = [
        'getCriterios',
        'getCriterio',
        'getCriterioPorPilar',
        'createCriterio',
        'updateCriterio',
        'deleteCriterio'
      ];

      metodos.forEach(metodo => {
        const guards = Reflect.getMetadata('__guards__', CriteriosController.prototype[metodo]);
        expect(guards).toBeDefined();
        expect(guards).toContain(JwtAuthGuard);
      });
    });

    it('deve ter RolesGuard aplicado nas rotas de modificação', () => {
      const metodosModificacao = ['createCriterio', 'updateCriterio', 'deleteCriterio'];

      metodosModificacao.forEach(metodo => {
        const guards = Reflect.getMetadata('__guards__', CriteriosController.prototype[metodo]);
        expect(guards).toContain(RolesGuard);
      });
    });

    it('deve NOT ter RolesGuard aplicado nas rotas de consulta', () => {
      const metodosConsulta = ['getCriterios', 'getCriterio', 'getCriterioPorPilar'];

      metodosConsulta.forEach(metodo => {
        const guards = Reflect.getMetadata('__guards__', CriteriosController.prototype[metodo]);
        expect(guards).not.toContain(RolesGuard);
      });
    });

    it('deve ter roles ADMIN e RH nas rotas de modificação', () => {
      const metodosModificacao = ['createCriterio', 'updateCriterio', 'deleteCriterio'];

      metodosModificacao.forEach(metodo => {
        const roles = Reflect.getMetadata('roles', CriteriosController.prototype[metodo]);
        expect(roles).toEqual(['ADMIN', 'RH']);
      });
    });

    it('deve NOT ter roles nas rotas de consulta', () => {
      const metodosConsulta = ['getCriterios', 'getCriterio', 'getCriterioPorPilar'];

      metodosConsulta.forEach(metodo => {
        const roles = Reflect.getMetadata('roles', CriteriosController.prototype[metodo]);
        expect(roles).toBeUndefined();
      });
    });
  });

  describe('Integração de fluxos com auditoria', () => {
    it('deve executar fluxo completo: criar -> buscar -> atualizar -> deletar com auditoria', async () => {
      // Arrange
      const criterioCreated = { ...mockCriterio, ...createCriterioDto, idCriterio: 'novo-id' };
      const criterioUpdated = { ...criterioCreated, ...updateCriterioDto };

      mockCriteriosService.createCriterio.mockResolvedValue(criterioCreated);
      mockCriteriosService.getCriterio.mockResolvedValue(criterioCreated);
      mockCriteriosService.updateCriterio.mockResolvedValue(criterioUpdated);
      mockCriteriosService.deleteCriterio.mockResolvedValue(criterioUpdated);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const criado = await controller.createCriterio(createCriterioDto, mockRequest);
      const buscado = await controller.getCriterio(criado.idCriterio);
      const atualizado = await controller.updateCriterio(criado.idCriterio, updateCriterioDto, mockRequest);
      const deletado = await controller.deleteCriterio(criado.idCriterio, mockRequest);

      // Assert
      expect(criado).toEqual(criterioCreated);
      expect(buscado).toEqual(criterioCreated);
      expect(atualizado).toEqual(criterioUpdated);
      expect(deletado).toEqual(criterioUpdated);

      // Verifica chamadas do service
      expect(mockCriteriosService.createCriterio).toHaveBeenCalledWith(createCriterioDto);
      expect(mockCriteriosService.getCriterio).toHaveBeenCalledWith(criado.idCriterio);
      expect(mockCriteriosService.updateCriterio).toHaveBeenCalledWith(criado.idCriterio, updateCriterioDto);
      expect(mockCriteriosService.deleteCriterio).toHaveBeenCalledWith(criado.idCriterio);

      // Verifica que auditoria foi chamada 3 vezes (criar, atualizar, deletar)
      expect(mockAuditoriaService.log).toHaveBeenCalledTimes(3);
    });

    it('deve listar critérios por pilar após criação sem auditoria', async () => {
      // Arrange
      const pilar = pilarCriterio.Execucao;
      const criteriosDoPilar = [mockCriterio];
      mockCriteriosService.getCriterioPorPilar.mockResolvedValue(criteriosDoPilar);

      // Act
      const resultado = await controller.getCriterioPorPilar(pilar);

      // Assert
      expect(resultado).toEqual(criteriosDoPilar);
      expect(mockCriteriosService.getCriterioPorPilar).toHaveBeenCalledWith(pilar);
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
        mockCriteriosService.getCriterios.mockRejectedValue(erro);
        await expect(controller.getCriterios()).rejects.toThrow(erro.message);
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      }
    });
  });

  describe('Auditoria específica', () => {
    it('deve registrar auditoria com dados corretos para cada operação', async () => {
      // Arrange
      const operacoes = [
        {
          metodo: 'createCriterio',
          args: [createCriterioDto, mockRequest],
          expectedAction: 'criar_criterio',
          mockResult: { ...mockCriterio, ...createCriterioDto },
        },
        {
          metodo: 'updateCriterio',
          args: ['test-id', updateCriterioDto, mockRequest],
          expectedAction: 'atualizar_criterio',
          mockResult: { ...mockCriterio, ...updateCriterioDto },
        },
        {
          metodo: 'deleteCriterio',
          args: ['test-id', mockRequest],
          expectedAction: 'deletar_criterio',
          mockResult: mockCriterio,
        },
      ];

      // Act & Assert
      for (const operacao of operacoes) {
        // Setup mock
        if (operacao.metodo === 'createCriterio') {
          mockCriteriosService.createCriterio.mockResolvedValue(operacao.mockResult);
        } else if (operacao.metodo === 'updateCriterio') {
          mockCriteriosService.updateCriterio.mockResolvedValue(operacao.mockResult);
        } else if (operacao.metodo === 'deleteCriterio') {
          mockCriteriosService.deleteCriterio.mockResolvedValue(operacao.mockResult);
        }

        mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

        // Execute
        await controller[operacao.metodo](...operacao.args);

        // Verify
        expect(mockAuditoriaService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: mockRequest.user.userId,
            action: operacao.expectedAction,
            resource: 'Criterio',
            ip: mockRequest.ip,
          })
        );

        // Reset
        jest.clearAllMocks();
      }
    });

    it('deve funcionar com diferentes tipos de request', async () => {
      // Arrange
      const requestTypes = [
        { user: { userId: 'user-1' }, ip: '127.0.0.1' },
        { user: { userId: 'user-2', roles: ['ADMIN'] }, ip: '192.168.1.1' },
        { user: undefined, ip: '10.0.0.1' },
        { user: { userId: null }, ip: undefined },
      ];

      const criterioCreated = { ...mockCriterio, ...createCriterioDto };
      mockCriteriosService.createCriterio.mockResolvedValue(criterioCreated);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act & Assert
      for (const request of requestTypes) {
        await controller.createCriterio(createCriterioDto, request);

        expect(mockAuditoriaService.log).toHaveBeenCalledWith({
          userId: request.user?.userId,
          action: 'criar_criterio',
          resource: 'Criterio',
          details: { ...createCriterioDto, result: criterioCreated },
          ip: request.ip,
        });

        jest.clearAllMocks();
      }
    });
  });
});