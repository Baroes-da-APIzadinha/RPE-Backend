import { Test, TestingModule } from '@nestjs/testing';
import { CriteriosController } from './criterios.controller';
import { CriteriosService } from './criterios.service';
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CriteriosController],
      providers: [
        {
          provide: CriteriosService,
          useValue: mockCriteriosService,
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
    });

    it('deve retornar array vazio quando não há critérios', async () => {
      // Arrange
      mockCriteriosService.getCriterios.mockResolvedValue([]);

      // Act
      const resultado = await controller.getCriterios();

      // Assert
      expect(resultado).toEqual([]);
      expect(mockCriteriosService.getCriterios).toHaveBeenCalledTimes(1);
    });

    it('deve propagar erros do service', async () => {
      // Arrange
      const erro = new Error('Erro interno do servidor');
      mockCriteriosService.getCriterios.mockRejectedValue(erro);

      // Act & Assert
      await expect(controller.getCriterios()).rejects.toThrow('Erro interno do servidor');
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
    });

    it('deve retornar array vazio quando não há critérios para o pilar', async () => {
      // Arrange
      const pilar = pilarCriterio.Execucao;
      mockCriteriosService.getCriterioPorPilar.mockResolvedValue([]);

      // Act
      const resultado = await controller.getCriterioPorPilar(pilar);

      // Assert
      expect(resultado).toEqual([]);
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

      mockCriteriosService.createCriterio.mockResolvedValue(criterioCreated);

      // Spy no console.log
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      const resultado = await controller.createCriterio(createDto);

      // Assert
      expect(resultado).toEqual(criterioCreated);
      expect(mockCriteriosService.createCriterio).toHaveBeenCalledWith(createDto);
      expect(mockCriteriosService.createCriterio).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('Body recebido:', createDto);

      // Cleanup
      consoleSpy.mockRestore();
    });

    it('deve criar critério com dados mínimos', async () => {
      // Arrange
      const createDto: CreateCriterioDto = {
        nomeCriterio: 'Critério Mínimo',
      };

      const criterioCreated = {
        ...mockCriterio,
        nomeCriterio: createDto.nomeCriterio,
      };

      mockCriteriosService.createCriterio.mockResolvedValue(criterioCreated);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      const resultado = await controller.createCriterio(createDto);

      // Assert
      expect(resultado).toEqual(criterioCreated);
      expect(mockCriteriosService.createCriterio).toHaveBeenCalledWith(createDto);
      expect(consoleSpy).toHaveBeenCalledWith('Body recebido:', createDto);

      consoleSpy.mockRestore();
    });

    it('deve propagar erros de validação do service', async () => {
      // Arrange
      const createDto: CreateCriterioDto = {
        nomeCriterio: '',
      };
      const erro = new Error('Nome do critério é obrigatório');
      mockCriteriosService.createCriterio.mockRejectedValue(erro);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act & Assert
      await expect(controller.createCriterio(createDto)).rejects.toThrow('Nome do critério é obrigatório');
      expect(consoleSpy).toHaveBeenCalledWith('Body recebido:', createDto);

      consoleSpy.mockRestore();
    });

    it('deve logar dados recebidos independente do resultado', async () => {
      // Arrange
      const createDto: CreateCriterioDto = {
        nomeCriterio: 'Teste Log',
      };
      mockCriteriosService.createCriterio.mockRejectedValue(new Error('Erro qualquer'));

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      try {
        await controller.createCriterio(createDto);
      } catch (error) {
        // Esperado falhar
      }

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('Body recebido:', createDto);

      consoleSpy.mockRestore();
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

      mockCriteriosService.updateCriterio.mockResolvedValue(criterioUpdated);

      // Act
      const resultado = await controller.updateCriterio(id, updateDto);

      // Assert
      expect(resultado).toEqual(criterioUpdated);
      expect(mockCriteriosService.updateCriterio).toHaveBeenCalledWith(id, updateDto);
      expect(mockCriteriosService.updateCriterio).toHaveBeenCalledTimes(1);
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
      };

      mockCriteriosService.updateCriterio.mockResolvedValue(criterioUpdated);

      // Act
      const resultado = await controller.updateCriterio(id, updateDto);

      // Assert
      expect(resultado).toEqual(criterioUpdated);
      expect(mockCriteriosService.updateCriterio).toHaveBeenCalledWith(id, updateDto);
    });

    it('deve aceitar DTO vazio', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto: UpdateCriterioDto = {};

      mockCriteriosService.updateCriterio.mockResolvedValue(mockCriterio);

      // Act
      const resultado = await controller.updateCriterio(id, updateDto);

      // Assert
      expect(resultado).toEqual(mockCriterio);
      expect(mockCriteriosService.updateCriterio).toHaveBeenCalledWith(id, updateDto);
    });

    it('deve propagar erro quando critério não encontrado', async () => {
      // Arrange
      const id = 'inexistente';
      const updateDto: UpdateCriterioDto = {
        nomeCriterio: 'Teste',
      };
      const erro = new Error('Critério não encontrado');
      mockCriteriosService.updateCriterio.mockRejectedValue(erro);

      // Act & Assert
      await expect(controller.updateCriterio(id, updateDto)).rejects.toThrow('Critério não encontrado');
    });
  });

  describe('deleteCriterio', () => {
    it('deve deletar um critério com sucesso', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockCriteriosService.deleteCriterio.mockResolvedValue(mockCriterio);

      // Act
      const resultado = await controller.deleteCriterio(id);

      // Assert
      expect(resultado).toEqual(mockCriterio);
      expect(mockCriteriosService.deleteCriterio).toHaveBeenCalledWith(id);
      expect(mockCriteriosService.deleteCriterio).toHaveBeenCalledTimes(1);
    });

    it('deve propagar erro quando critério não encontrado', async () => {
      // Arrange
      const id = 'inexistente';
      const erro = new Error('Critério não encontrado para exclusão');
      mockCriteriosService.deleteCriterio.mockRejectedValue(erro);

      // Act & Assert
      await expect(controller.deleteCriterio(id)).rejects.toThrow('Critério não encontrado para exclusão');
    });

    it('deve propagar erro de constraint', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const erro = new Error('Não é possível deletar: critério está sendo usado');
      mockCriteriosService.deleteCriterio.mockRejectedValue(erro);

      // Act & Assert
      await expect(controller.deleteCriterio(id)).rejects.toThrow('Não é possível deletar: critério está sendo usado');
    });
  });

  // ...existing code...

  describe('Guards e Autorizações', () => {
    it('deve ter JwtAuthGuard aplicado em todas as rotas', () => {
      // Verifica cada método individualmente
      const getCriteriosGuards = Reflect.getMetadata('__guards__', CriteriosController.prototype.getCriterios);
      const getCriterioGuards = Reflect.getMetadata('__guards__', CriteriosController.prototype.getCriterio);
      const getCriterioPorPilarGuards = Reflect.getMetadata('__guards__', CriteriosController.prototype.getCriterioPorPilar);
      const createCriterioGuards = Reflect.getMetadata('__guards__', CriteriosController.prototype.createCriterio);
      const updateCriterioGuards = Reflect.getMetadata('__guards__', CriteriosController.prototype.updateCriterio);
      const deleteCriterioGuards = Reflect.getMetadata('__guards__', CriteriosController.prototype.deleteCriterio);

      // Verifica se todos os métodos têm guards
      expect(getCriteriosGuards).toBeDefined();
      expect(getCriterioGuards).toBeDefined();
      expect(getCriterioPorPilarGuards).toBeDefined();
      expect(createCriterioGuards).toBeDefined();
      expect(updateCriterioGuards).toBeDefined();
      expect(deleteCriterioGuards).toBeDefined();

      // Verifica se JwtAuthGuard está presente em todos
      expect(getCriteriosGuards).toContain(JwtAuthGuard);
      expect(getCriterioGuards).toContain(JwtAuthGuard);
      expect(getCriterioPorPilarGuards).toContain(JwtAuthGuard);
      expect(createCriterioGuards).toContain(JwtAuthGuard);
      expect(updateCriterioGuards).toContain(JwtAuthGuard);
      expect(deleteCriterioGuards).toContain(JwtAuthGuard);
    });

    it('deve ter RolesGuard aplicado nas rotas de modificação', () => {
      // Apenas rotas POST, PATCH e DELETE devem ter RolesGuard
      const createCriterioGuards = Reflect.getMetadata('__guards__', CriteriosController.prototype.createCriterio);
      const updateCriterioGuards = Reflect.getMetadata('__guards__', CriteriosController.prototype.updateCriterio);
      const deleteCriterioGuards = Reflect.getMetadata('__guards__', CriteriosController.prototype.deleteCriterio);

      // Verifica se RolesGuard está presente nas rotas de modificação
      expect(createCriterioGuards).toContain(RolesGuard);
      expect(updateCriterioGuards).toContain(RolesGuard);
      expect(deleteCriterioGuards).toContain(RolesGuard);
    });

    it('deve NOT ter RolesGuard aplicado nas rotas de consulta', () => {
      // Rotas GET não devem ter RolesGuard
      const getCriteriosGuards = Reflect.getMetadata('__guards__', CriteriosController.prototype.getCriterios);
      const getCriterioGuards = Reflect.getMetadata('__guards__', CriteriosController.prototype.getCriterio);
      const getCriterioPorPilarGuards = Reflect.getMetadata('__guards__', CriteriosController.prototype.getCriterioPorPilar);

      // Verifica se RolesGuard NÃO está presente nas rotas de consulta
      expect(getCriteriosGuards).not.toContain(RolesGuard);
      expect(getCriterioGuards).not.toContain(RolesGuard);
      expect(getCriterioPorPilarGuards).not.toContain(RolesGuard);
    });

    it('deve ter roles ADMIN e RH nas rotas de modificação', () => {
      // Verifica se @Roles('ADMIN', 'RH') está aplicado
      const createRoles = Reflect.getMetadata('roles', CriteriosController.prototype.createCriterio);
      const updateRoles = Reflect.getMetadata('roles', CriteriosController.prototype.updateCriterio);
      const deleteRoles = Reflect.getMetadata('roles', CriteriosController.prototype.deleteCriterio);

      expect(createRoles).toEqual(['ADMIN', 'RH']);
      expect(updateRoles).toEqual(['ADMIN', 'RH']);
      expect(deleteRoles).toEqual(['ADMIN', 'RH']);
    });

    it('deve NOT ter roles nas rotas de consulta', () => {
      // Rotas GET não devem ter roles definidas
      const getCriteriosRoles = Reflect.getMetadata('roles', CriteriosController.prototype.getCriterios);
      const getCriterioRoles = Reflect.getMetadata('roles', CriteriosController.prototype.getCriterio);
      const getCriterioPorPilarRoles = Reflect.getMetadata('roles', CriteriosController.prototype.getCriterioPorPilar);

      expect(getCriteriosRoles).toBeUndefined();
      expect(getCriterioRoles).toBeUndefined();
      expect(getCriterioPorPilarRoles).toBeUndefined();
    });

    it('deve verificar estrutura específica de guards por método', () => {
      // GET routes: apenas JwtAuthGuard
      const getCriteriosGuards = Reflect.getMetadata('__guards__', CriteriosController.prototype.getCriterios);
      expect(getCriteriosGuards).toHaveLength(1);
      expect(getCriteriosGuards[0]).toBe(JwtAuthGuard);

      // POST/PATCH/DELETE routes: JwtAuthGuard + RolesGuard
      const createGuards = Reflect.getMetadata('__guards__', CriteriosController.prototype.createCriterio);
      expect(createGuards).toHaveLength(2);
      expect(createGuards).toContain(JwtAuthGuard);
      expect(createGuards).toContain(RolesGuard);
    });
  });

// ...existing code...

  describe('Integração de fluxos', () => {
    it('deve executar fluxo completo: criar -> buscar -> atualizar -> deletar', async () => {
      // Arrange
      const createDto: CreateCriterioDto = {
        nomeCriterio: 'Fluxo Teste',
        pilar: pilarCriterio.Execucao,
      };

      const updateDto: UpdateCriterioDto = {
        nomeCriterio: 'Fluxo Teste Atualizado',
      };

      const criterioCreated = { ...mockCriterio, ...createDto, idCriterio: 'novo-id' };
      const criterioUpdated = { ...criterioCreated, ...updateDto };

      mockCriteriosService.createCriterio.mockResolvedValue(criterioCreated);
      mockCriteriosService.getCriterio.mockResolvedValue(criterioCreated);
      mockCriteriosService.updateCriterio.mockResolvedValue(criterioUpdated);
      mockCriteriosService.deleteCriterio.mockResolvedValue(criterioUpdated);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      const criado = await controller.createCriterio(createDto);
      const buscado = await controller.getCriterio(criado.idCriterio);
      const atualizado = await controller.updateCriterio(criado.idCriterio, updateDto);
      const deletado = await controller.deleteCriterio(criado.idCriterio);

      // Assert
      expect(criado).toEqual(criterioCreated);
      expect(buscado).toEqual(criterioCreated);
      expect(atualizado).toEqual(criterioUpdated);
      expect(deletado).toEqual(criterioUpdated);

      expect(mockCriteriosService.createCriterio).toHaveBeenCalledWith(createDto);
      expect(mockCriteriosService.getCriterio).toHaveBeenCalledWith(criado.idCriterio);
      expect(mockCriteriosService.updateCriterio).toHaveBeenCalledWith(criado.idCriterio, updateDto);
      expect(mockCriteriosService.deleteCriterio).toHaveBeenCalledWith(criado.idCriterio);

      consoleSpy.mockRestore();
    });

    it('deve listar critérios por pilar após criação', async () => {
      // Arrange
      const pilar = pilarCriterio.Execucao;
      const criteriosDoPilar = [mockCriterio];
      mockCriteriosService.getCriterioPorPilar.mockResolvedValue(criteriosDoPilar);

      // Act
      const resultado = await controller.getCriterioPorPilar(pilar);

      // Assert
      expect(resultado).toEqual(criteriosDoPilar);
      expect(mockCriteriosService.getCriterioPorPilar).toHaveBeenCalledWith(pilar);
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
      }
    });
  });
});