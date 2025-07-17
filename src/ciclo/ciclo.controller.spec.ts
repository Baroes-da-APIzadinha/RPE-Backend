import { Test, TestingModule } from '@nestjs/testing';
import { CicloController } from './ciclo.controller';
import { CicloService } from './ciclo.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateCicloDto, UpdateCicloDto } from './ciclo.dto';
import { cicloStatus } from '@prisma/client';
import { 
  BadRequestException, 
  NotFoundException, 
  ConflictException 
} from '@nestjs/common';

describe('CicloController', () => {
  let controller: CicloController;
  let service: CicloService;
  let auditoriaService: AuditoriaService;

  // Mock do CicloService
  const mockCicloService = {
    createCiclo: jest.fn(),
    deleteCiclo: jest.fn(),
    updateCiclo: jest.fn(),
    getCiclos: jest.fn(),
    getCiclosAtivos: jest.fn(),
    getHistoricoCiclos: jest.fn(),
    getCiclo: jest.fn(),
  };

  // Mock do AuditoriaService
  const mockAuditoriaService = {
    log: jest.fn(),
    getLogs: jest.fn(),
  };

  // Mock do request com dados de usuário
  const mockRequest = {
    user: { 
      userId: 'user-123',
      email: 'admin@empresa.com',
      roles: ['ADMIN'] 
    },
    ip: '192.168.1.100',
  };

  // Dados de teste
  const mockCiclo = {
    idCiclo: '123e4567-e89b-12d3-a456-426614174000',
    nomeCiclo: '2024.1',
    dataInicio: new Date('2024-07-15T00:00:00.000Z'),
    dataFim: new Date('2024-10-15T00:00:00.000Z'),
    status: cicloStatus.AGENDADO,
    duracaoEmAndamentoDias: 60,
    duracaoEmRevisaoDias: 20,
    duracaoEmEqualizacaoDias: 13,
    updatedAt: new Date(),
  };

  const createCicloDto: CreateCicloDto = {
    nome: '2024.1',
    dataInicioAno: 2024,
    dataInicioMes: 7,
    dataInicioDia: 15,
    dataFimAno: 2024,
    dataFimMes: 10,
    dataFimDia: 15,
    duracaoEmAndamentoDias: 60,
    duracaoEmRevisaoDias: 20,
    duracaoEmEqualizacaoDias: 13,
  };

  // Mock do CiclosStatus
  const mockCiclosStatus = {
    changeStatus: jest.fn(),
  };

  beforeEach(async () => {
    const { CiclosStatus } = require('./cicloStatus.service');
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CicloController],
      providers: [
        {
          provide: CicloService,
          useValue: mockCicloService,
        },
        {
          provide: AuditoriaService,
          useValue: mockAuditoriaService,
        },
        {
          provide: CiclosStatus,
          useValue: mockCiclosStatus,
        },
      ],
    }).compile();

    controller = module.get<CicloController>(CicloController);
    service = module.get<CicloService>(CicloService);
    auditoriaService = module.get<AuditoriaService>(AuditoriaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Definição do controller', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('deve ter CicloService injetado', () => {
      expect(service).toBeDefined();
    });

    it('deve ter AuditoriaService injetado', () => {
      expect(auditoriaService).toBeDefined();
    });
  });

  describe('criarCiclo', () => {
    describe('Casos de sucesso com auditoria', () => {
      it('deve criar um ciclo com sucesso e registrar auditoria', async () => {
        // Arrange
        mockCicloService.createCiclo.mockResolvedValue(mockCiclo);
        mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

        // Act
        const resultado = await controller.criarCiclo(createCicloDto, mockRequest);

        // Assert
        expect(resultado).toEqual(mockCiclo);
        expect(mockCicloService.createCiclo).toHaveBeenCalledWith(createCicloDto);
        expect(mockCicloService.createCiclo).toHaveBeenCalledTimes(1);

        // Verifica auditoria DEPOIS do service
        expect(mockAuditoriaService.log).toHaveBeenCalledTimes(1);
        expect(mockAuditoriaService.log).toHaveBeenCalledWith({
          userId: mockRequest.user.userId,
          action: 'criar_ciclo',
          resource: 'Ciclo',
          details: { ...createCicloDto, result: mockCiclo },
          ip: mockRequest.ip,
        });
      });

      it('deve criar ciclo com diferentes configurações e registrar auditoria', async () => {
        // Arrange
        const ciclosVariados = [
          {
            dto: { ...createCicloDto, nome: '2024.2', duracaoEmAndamentoDias: 70 },
            resultado: { ...mockCiclo, nomeCiclo: '2024.2', duracaoEmAndamentoDias: 70 }
          },
          {
            dto: { ...createCicloDto, nome: '2025.1', duracaoEmRevisaoDias: 30 },
            resultado: { ...mockCiclo, nomeCiclo: '2025.1', duracaoEmRevisaoDias: 30 }
          },
        ];

        for (const { dto, resultado } of ciclosVariados) {
          mockCicloService.createCiclo.mockResolvedValue(resultado);
          mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

          // Act
          const resultadoController = await controller.criarCiclo(dto, mockRequest);

          // Assert
          expect(resultadoController).toEqual(resultado);
          expect(mockCicloService.createCiclo).toHaveBeenCalledWith(dto);
          expect(mockAuditoriaService.log).toHaveBeenCalledWith({
            userId: mockRequest.user.userId,
            action: 'criar_ciclo',
            resource: 'Ciclo',
            details: { ...dto, result: resultado },
            ip: mockRequest.ip,
          });

          jest.clearAllMocks();
        }
      });

      it('deve registrar auditoria DEPOIS de chamar o service', async () => {
        // Arrange
        const callOrder: string[] = [];
        
        mockCicloService.createCiclo.mockImplementation(async () => {
          callOrder.push('service');
          return mockCiclo;
        });

        mockAuditoriaService.log.mockImplementation(async () => {
          callOrder.push('auditoria');
          return { id: 'audit-log-id' };
        });

        // Act
        await controller.criarCiclo(createCicloDto, mockRequest);

        // Assert
        expect(callOrder).toEqual(['service', 'auditoria']);
      });
    });

    describe('Casos de falha com auditoria', () => {
      it('deve NOT registrar auditoria quando service falha', async () => {
        // Arrange
        const error = new BadRequestException('O nome do ciclo deve seguir o padrão AAAA.S (ex: 2024.1).');
        const dtoInvalido = { ...createCicloDto, nome: 'nome-inválido' };
        
        mockCicloService.createCiclo.mockRejectedValue(error);

        // Act & Assert
        await expect(controller.criarCiclo(dtoInvalido, mockRequest)).rejects.toThrow(BadRequestException);
        
        // Service é chamado primeiro
        expect(mockCicloService.createCiclo).toHaveBeenCalledWith(dtoInvalido);
        
        // Auditoria NÃO é registrada quando service falha
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve NOT registrar auditoria quando service falha com diferentes erros', async () => {
        // Arrange
        const tiposErro = [
          new ConflictException('Já existe um ciclo com este nome.'),
          new BadRequestException('Data inválida fornecida'),
          new ConflictException('O período informado sobrepõe o ciclo existente'),
        ];

        for (const error of tiposErro) {
          mockCicloService.createCiclo.mockRejectedValue(error);

          // Act & Assert
          await expect(controller.criarCiclo(createCicloDto, mockRequest)).rejects.toThrow(error);
          expect(mockCicloService.createCiclo).toHaveBeenCalledWith(createCicloDto);
          expect(mockAuditoriaService.log).not.toHaveBeenCalled();

          jest.clearAllMocks();
        }
      });

      it('deve falhar se auditoria falhar DEPOIS do service suceder', async () => {
        // Arrange
        mockCicloService.createCiclo.mockResolvedValue(mockCiclo);
        mockAuditoriaService.log.mockRejectedValue(new Error('Erro na auditoria'));

        // Act & Assert
        await expect(controller.criarCiclo(createCicloDto, mockRequest)).rejects.toThrow('Erro na auditoria');
        
        // Service é chamado normalmente
        expect(mockCicloService.createCiclo).toHaveBeenCalledWith(createCicloDto);
        // Auditoria é tentada mas falha
        expect(mockAuditoriaService.log).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('removerCiclo', () => {
    describe('Casos de sucesso com auditoria', () => {
      it('deve remover um ciclo com sucesso e registrar auditoria', async () => {
        // Arrange
        const id = '123e4567-e89b-12d3-a456-426614174000';
        mockCicloService.deleteCiclo.mockResolvedValue(mockCiclo);
        mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

        // Act
        const resultado = await controller.removerCiclo(id, mockRequest);

        // Assert
        expect(resultado).toEqual(mockCiclo);
        expect(mockCicloService.deleteCiclo).toHaveBeenCalledWith(id);
        expect(mockCicloService.deleteCiclo).toHaveBeenCalledTimes(1);

        // Verifica auditoria DEPOIS do service
        expect(mockAuditoriaService.log).toHaveBeenCalledTimes(1);
        expect(mockAuditoriaService.log).toHaveBeenCalledWith({
          userId: mockRequest.user.userId,
          action: 'remover_ciclo',
          resource: 'Ciclo',
          details: { id, result: mockCiclo },
          ip: mockRequest.ip,
        });
      });

      it('deve registrar auditoria DEPOIS de chamar o service', async () => {
        // Arrange
        const id = '123e4567-e89b-12d3-a456-426614174000';
        const callOrder: string[] = [];
        
        mockCicloService.deleteCiclo.mockImplementation(async () => {
          callOrder.push('service');
          return mockCiclo;
        });

        mockAuditoriaService.log.mockImplementation(async () => {
          callOrder.push('auditoria');
          return { id: 'audit-log-id' };
        });

        // Act
        await controller.removerCiclo(id, mockRequest);

        // Assert
        expect(callOrder).toEqual(['service', 'auditoria']);
      });
    });

    describe('Casos de falha com auditoria', () => {
      it('deve NOT registrar auditoria quando ciclo não encontrado', async () => {
        // Arrange
        const id = 'id-inexistente';
        const error = new NotFoundException('Ciclo não encontrado.');
        
        mockCicloService.deleteCiclo.mockRejectedValue(error);

        // Act & Assert
        await expect(controller.removerCiclo(id, mockRequest)).rejects.toThrow(NotFoundException);
        expect(mockCicloService.deleteCiclo).toHaveBeenCalledWith(id);
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve NOT registrar auditoria quando ID inválido', async () => {
        // Arrange
        const id = 'id-inválido';
        const error = new BadRequestException('ID do ciclo inválido.');
        
        mockCicloService.deleteCiclo.mockRejectedValue(error);

        // Act & Assert
        await expect(controller.removerCiclo(id, mockRequest)).rejects.toThrow(BadRequestException);
        expect(mockCicloService.deleteCiclo).toHaveBeenCalledWith(id);
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });
    });
  });

  describe('atualizarCiclo (PUT)', () => {
    describe('Casos de sucesso com auditoria', () => {
      it('deve atualizar um ciclo completamente com sucesso e registrar auditoria', async () => {
        // Arrange
        const id = '123e4567-e89b-12d3-a456-426614174000';
        const updateDto: UpdateCicloDto = {
          nome: '2024.2',
          dataInicioAno: 2024,
          dataInicioMes: 8,
          dataInicioDia: 1,
          dataFimAno: 2024,
          dataFimMes: 11,
          dataFimDia: 1,
          duracaoEmAndamentoDias: 70,
          duracaoEmRevisaoDias: 20,
          duracaoEmEqualizacaoDias: 3,
        };

        const cicloAtualizado = { ...mockCiclo, ...updateDto };
        mockCicloService.updateCiclo.mockResolvedValue(cicloAtualizado);
        mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

        // Act
        const resultado = await controller.atualizarCiclo(id, updateDto, mockRequest);

        // Assert
        expect(resultado).toEqual(cicloAtualizado);
        expect(mockCicloService.updateCiclo).toHaveBeenCalledWith(id, updateDto);
        expect(mockCicloService.updateCiclo).toHaveBeenCalledTimes(1);

        // Verifica auditoria DEPOIS do service
        expect(mockAuditoriaService.log).toHaveBeenCalledTimes(1);
        expect(mockAuditoriaService.log).toHaveBeenCalledWith({
          userId: mockRequest.user.userId,
          action: 'atualizar_ciclo',
          resource: 'Ciclo',
          details: { id, ...updateDto, result: cicloAtualizado },
          ip: mockRequest.ip,
        });
      });

      it('deve registrar auditoria DEPOIS de chamar o service', async () => {
        // Arrange
        const id = '123e4567-e89b-12d3-a456-426614174000';
        const updateDto: UpdateCicloDto = { nome: '2024.2' };
        const callOrder: string[] = [];
        
        mockCicloService.updateCiclo.mockImplementation(async () => {
          callOrder.push('service');
          return mockCiclo;
        });

        mockAuditoriaService.log.mockImplementation(async () => {
          callOrder.push('auditoria');
          return { id: 'audit-log-id' };
        });

        // Act
        await controller.atualizarCiclo(id, updateDto, mockRequest);

        // Assert
        expect(callOrder).toEqual(['service', 'auditoria']);
      });
    });

    describe('Casos de falha com auditoria', () => {
      it('deve NOT registrar auditoria quando ciclo não encontrado para atualização', async () => {
        // Arrange
        const id = 'id-inexistente';
        const updateDto: UpdateCicloDto = { nome: '2024.2' };
        const error = new NotFoundException('Ciclo não encontrado.');
        
        mockCicloService.updateCiclo.mockRejectedValue(error);

        // Act & Assert
        await expect(controller.atualizarCiclo(id, updateDto, mockRequest)).rejects.toThrow(NotFoundException);
        expect(mockCicloService.updateCiclo).toHaveBeenCalledWith(id, updateDto);
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve NOT registrar auditoria quando dados de atualização são inválidos', async () => {
        // Arrange
        const id = '123e4567-e89b-12d3-a456-426614174000';
        const updateDto: UpdateCicloDto = { nome: 'nome-inválido' };
        const error = new BadRequestException('O nome do ciclo deve seguir o padrão AAAA.S (ex: 2024.1).');
        
        mockCicloService.updateCiclo.mockRejectedValue(error);

        // Act & Assert
        await expect(controller.atualizarCiclo(id, updateDto, mockRequest)).rejects.toThrow(BadRequestException);
        expect(mockCicloService.updateCiclo).toHaveBeenCalledWith(id, updateDto);
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });
    });
  });

  describe('atualizarCicloParcial (PATCH)', () => {
    describe('Casos sem auditoria (comportamento atual)', () => {
      it('deve atualizar parcialmente um ciclo com sucesso sem auditoria', async () => {
        // Arrange
        const id = '123e4567-e89b-12d3-a456-426614174000';
        const updateDto: UpdateCicloDto = {
          duracaoEmAndamentoDias: 65,
        };

        const cicloAtualizado = { ...mockCiclo, duracaoEmAndamentoDias: 65 };
        mockCicloService.updateCiclo.mockResolvedValue(cicloAtualizado);

        // Act
        const resultado = await controller.atualizarCicloParcial(id, updateDto);

        // Assert
        expect(resultado).toEqual(cicloAtualizado);
        expect(mockCicloService.updateCiclo).toHaveBeenCalledWith(id, updateDto);
        expect(mockCicloService.updateCiclo).toHaveBeenCalledTimes(1);

        // Verifica que auditoria NÃO foi chamada (PATCH não tem auditoria)
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve atualizar apenas o status do ciclo sem auditoria', async () => {
        // Arrange
        const id = '123e4567-e89b-12d3-a456-426614174000';
        const updateDto: UpdateCicloDto = {
          status: cicloStatus.EM_ANDAMENTO,
        };

        const cicloAtualizado = { ...mockCiclo, status: cicloStatus.EM_ANDAMENTO };
        mockCicloService.updateCiclo.mockResolvedValue(cicloAtualizado);

        // Act
        const resultado = await controller.atualizarCicloParcial(id, updateDto);

        // Assert
        expect(resultado).toEqual(cicloAtualizado);
        expect(mockCicloService.updateCiclo).toHaveBeenCalledWith(id, updateDto);
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve propagar erro para atualização parcial com dados inválidos sem auditoria', async () => {
        // Arrange
        const id = '123e4567-e89b-12d3-a456-426614174000';
        const updateDto: UpdateCicloDto = {
          duracaoEmAndamentoDias: -5, // Duração inválida
        };
        const error = new BadRequestException('Duração inválida');
        
        mockCicloService.updateCiclo.mockRejectedValue(error);

        // Act & Assert
        await expect(controller.atualizarCicloParcial(id, updateDto)).rejects.toThrow(BadRequestException);
        expect(mockCicloService.updateCiclo).toHaveBeenCalledWith(id, updateDto);
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });

      it('deve funcionar com objetos DTO vazios em atualizações parciais sem auditoria', async () => {
        // Arrange
        const id = '123e4567-e89b-12d3-a456-426614174000';
        const updateDto: UpdateCicloDto = {}; // DTO vazio
        
        mockCicloService.updateCiclo.mockResolvedValue(mockCiclo);

        // Act
        const resultado = await controller.atualizarCicloParcial(id, updateDto);

        // Assert
        expect(resultado).toEqual(mockCiclo);
        expect(mockCicloService.updateCiclo).toHaveBeenCalledWith(id, updateDto);
        expect(mockAuditoriaService.log).not.toHaveBeenCalled();
      });
    });
  });

  describe('getCiclos', () => {
    it('deve retornar todos os ciclos ordenados', async () => {
      // Arrange
      const mockCiclos = [
        { ...mockCiclo, nomeCiclo: '2024.2' },
        { ...mockCiclo, nomeCiclo: '2024.1' },
        { ...mockCiclo, nomeCiclo: '2023.2' },
      ];
      
      mockCicloService.getCiclos.mockResolvedValue(mockCiclos);

      // Act
      const resultado = await controller.getCiclos();

      // Assert
      expect(resultado).toEqual(mockCiclos);
      expect(mockCicloService.getCiclos).toHaveBeenCalledTimes(1);
      expect(Array.isArray(resultado)).toBe(true);
      expect(resultado).toHaveLength(3);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve retornar array vazio quando não há ciclos', async () => {
      // Arrange
      mockCicloService.getCiclos.mockResolvedValue([]);

      // Act
      const resultado = await controller.getCiclos();

      // Assert
      expect(resultado).toEqual([]);
      expect(mockCicloService.getCiclos).toHaveBeenCalledTimes(1);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve retornar ciclos com estrutura correta', async () => {
      // Arrange
      const mockCiclos = [mockCiclo];
      mockCicloService.getCiclos.mockResolvedValue(mockCiclos);

      // Act
      const resultado = await controller.getCiclos();

      // Assert
      expect(resultado[0]).toHaveProperty('idCiclo');
      expect(resultado[0]).toHaveProperty('nomeCiclo');
      expect(resultado[0]).toHaveProperty('dataInicio');
      expect(resultado[0]).toHaveProperty('dataFim');
      expect(resultado[0]).toHaveProperty('status');
      expect(resultado[0]).toHaveProperty('duracaoEmAndamentoDias');
      expect(resultado[0]).toHaveProperty('duracaoEmRevisaoDias');
      expect(resultado[0]).toHaveProperty('duracaoEmEqualizacaoDias');
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('getCiclosAtivos', () => {
    it('deve retornar ciclos ativos com tempo restante', async () => {
      // Arrange
      const mockCiclosAtivos = [
        {
          id: 'id1',
          nome: '2024.1',
          status: cicloStatus.EM_ANDAMENTO,
          dataFim: new Date('2025-12-31T00:00:00.000Z'),
          tempoRestante: '5 meses e 15 dias',
        },
        {
          id: 'id2',
          nome: '2024.2',
          status: cicloStatus.AGENDADO,
          dataFim: new Date('2025-06-30T00:00:00.000Z'),
          tempoRestante: '11 meses e 15 dias',
        },
      ];

      mockCicloService.getCiclosAtivos.mockResolvedValue(mockCiclosAtivos);

      // Act
      const resultado = await controller.getCiclosAtivos();

      // Assert
      expect(resultado).toEqual(mockCiclosAtivos);
      expect(mockCicloService.getCiclosAtivos).toHaveBeenCalledTimes(1);
      expect(resultado).toHaveLength(2);
      expect(resultado[0]).toHaveProperty('tempoRestante');
      expect(typeof resultado[0].tempoRestante).toBe('string');
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve retornar array vazio quando não há ciclos ativos', async () => {
      // Arrange
      mockCicloService.getCiclosAtivos.mockResolvedValue([]);

      // Act
      const resultado = await controller.getCiclosAtivos();

      // Assert
      expect(resultado).toEqual([]);
      expect(mockCicloService.getCiclosAtivos).toHaveBeenCalledTimes(1);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve retornar apenas ciclos com status ativo', async () => {
      // Arrange
      const mockCiclosAtivos = [
        {
          id: 'id1',
          nome: '2024.1',
          status: cicloStatus.EM_ANDAMENTO,
          dataFim: new Date('2025-12-31T00:00:00.000Z'),
          tempoRestante: '5 meses e 15 dias',
        },
      ];

      mockCicloService.getCiclosAtivos.mockResolvedValue(mockCiclosAtivos);

      // Act
      const resultado = await controller.getCiclosAtivos();

      // Assert
      expect(resultado[0].status).not.toBe(cicloStatus.FECHADO);
      expect([
        cicloStatus.AGENDADO,
        cicloStatus.EM_ANDAMENTO,
        cicloStatus.EM_REVISAO,
        cicloStatus.EM_EQUALIZAÇÃO,
      ]).toContain(resultado[0].status);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('getHistoricoCiclos', () => {
    it('deve retornar histórico de ciclos fechados', async () => {
      // Arrange
      const mockHistorico = [
        {
          id: 'id1',
          nome: '2023.2',
          dataEncerramento: new Date('2023-12-31T00:00:00.000Z'),
          status: cicloStatus.FECHADO,
        },
        {
          id: 'id2',
          nome: '2023.1',
          dataEncerramento: new Date('2023-06-30T00:00:00.000Z'),
          status: cicloStatus.FECHADO,
        },
      ];

      mockCicloService.getHistoricoCiclos.mockResolvedValue(mockHistorico);

      // Act
      const resultado = await controller.getHistoricoCiclos();

      // Assert
      expect(resultado).toEqual(mockHistorico);
      expect(mockCicloService.getHistoricoCiclos).toHaveBeenCalledTimes(1);
      expect(resultado).toHaveLength(2);
      expect(resultado[0].status).toBe(cicloStatus.FECHADO);
      expect(resultado[1].status).toBe(cicloStatus.FECHADO);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve retornar array vazio quando não há histórico', async () => {
      // Arrange
      mockCicloService.getHistoricoCiclos.mockResolvedValue([]);

      // Act
      const resultado = await controller.getHistoricoCiclos();

      // Assert
      expect(resultado).toEqual([]);
      expect(mockCicloService.getHistoricoCiclos).toHaveBeenCalledTimes(1);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve retornar histórico com estrutura correta', async () => {
      // Arrange
      const mockHistorico = [
        {
          id: 'id1',
          nome: '2023.2',
          dataEncerramento: new Date('2023-12-31T00:00:00.000Z'),
          status: cicloStatus.FECHADO,
        },
      ];

      mockCicloService.getHistoricoCiclos.mockResolvedValue(mockHistorico);

      // Act
      const resultado = await controller.getHistoricoCiclos();

      // Assert
      expect(resultado[0]).toHaveProperty('id');
      expect(resultado[0]).toHaveProperty('nome');
      expect(resultado[0]).toHaveProperty('dataEncerramento');
      expect(resultado[0]).toHaveProperty('status');
      expect(resultado[0].dataEncerramento).toBeInstanceOf(Date);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('getCiclo', () => {
    it('deve retornar um ciclo específico por ID', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockCicloService.getCiclo.mockResolvedValue(mockCiclo);

      // Act
      const resultado = await controller.getCiclo(id);

      // Assert
      expect(resultado).toEqual(mockCiclo);
      expect(mockCicloService.getCiclo).toHaveBeenCalledWith(id);
      expect(mockCicloService.getCiclo).toHaveBeenCalledTimes(1);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve retornar erro quando ciclo não encontrado', async () => {
      // Arrange
      const id = 'id-inexistente';
      const error = new NotFoundException('Ciclo não encontrado.');
      
      mockCicloService.getCiclo.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getCiclo(id)).rejects.toThrow(NotFoundException);
      expect(mockCicloService.getCiclo).toHaveBeenCalledWith(id);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve retornar erro para ID inválido', async () => {
      // Arrange
      const id = 'id-inválido';
      const error = new BadRequestException('ID do ciclo inválido.');
      
      mockCicloService.getCiclo.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getCiclo(id)).rejects.toThrow(BadRequestException);
      expect(mockCicloService.getCiclo).toHaveBeenCalledWith(id);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve retornar ciclo com todos os campos necessários', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockCicloService.getCiclo.mockResolvedValue(mockCiclo);

      // Act
      const resultado = await controller.getCiclo(id);

      // Assert
      expect(resultado).toHaveProperty('idCiclo');
      expect(resultado).toHaveProperty('nomeCiclo');
      expect(resultado).toHaveProperty('dataInicio');
      expect(resultado).toHaveProperty('dataFim');
      expect(resultado).toHaveProperty('status');
      expect(resultado.idCiclo).toBe(id);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('Integração e casos extremos', () => {
    it('deve lidar com múltiplas chamadas simultâneas', async () => {
      // Arrange
      mockCicloService.getCiclos.mockResolvedValue([mockCiclo]);

      // Act
      const promessas = [
        controller.getCiclos(),
        controller.getCiclos(),
        controller.getCiclos(),
      ];
      
      const resultados = await Promise.all(promessas);

      // Assert
      expect(resultados).toHaveLength(3);
      expect(mockCicloService.getCiclos).toHaveBeenCalledTimes(3);
      resultados.forEach(resultado => {
        expect(resultado).toEqual([mockCiclo]);
      });
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve propagar erros do service corretamente', async () => {
      // Arrange
      const error = new Error('Erro interno do servidor');
      mockCicloService.getCiclos.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getCiclos()).rejects.toThrow('Erro interno do servidor');
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve validar que todos os endpoints estão mapeados corretamente', () => {
      // Assert
      expect(controller.criarCiclo).toBeDefined();
      expect(controller.removerCiclo).toBeDefined();
      expect(controller.atualizarCiclo).toBeDefined();
      expect(controller.atualizarCicloParcial).toBeDefined();
      expect(controller.getCiclos).toBeDefined();
      expect(controller.getCiclosAtivos).toBeDefined();
      expect(controller.getHistoricoCiclos).toBeDefined();
      expect(controller.getCiclo).toBeDefined();
    });
  });

  describe('Validação de tipos e estruturas', () => {
    it('deve aceitar CreateCicloDto com todos os campos obrigatórios e registrar auditoria', async () => {
      // Arrange
      const dtoCompleto: CreateCicloDto = {
        nome: '2024.3',
        dataInicioAno: 2024,
        dataInicioMes: 12,
        dataInicioDia: 1,
        dataFimAno: 2025,
        dataFimMes: 3,
        dataFimDia: 1,
        duracaoEmAndamentoDias: 60,
        duracaoEmRevisaoDias: 20,
        duracaoEmEqualizacaoDias: 10,
        status: cicloStatus.AGENDADO,
      };

      mockCicloService.createCiclo.mockResolvedValue(mockCiclo);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.criarCiclo(dtoCompleto, mockRequest);

      // Assert
      expect(resultado).toBeDefined();
      expect(mockCicloService.createCiclo).toHaveBeenCalledWith(dtoCompleto);
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.userId,
        action: 'criar_ciclo',
        resource: 'Ciclo',
        details: { ...dtoCompleto, result: mockCiclo },
        ip: mockRequest.ip,
      });
    });

    it('deve aceitar UpdateCicloDto com campos opcionais e registrar auditoria', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto: UpdateCicloDto = {
        nome: '2024.4',
        status: cicloStatus.EM_REVISAO,
        // Outros campos opcionais omitidos
      };

      const cicloAtualizado = { ...mockCiclo, ...updateDto };
      mockCicloService.updateCiclo.mockResolvedValue(cicloAtualizado);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.atualizarCiclo(id, updateDto, mockRequest);

      // Assert
      expect(resultado).toBeDefined();
      expect(mockCicloService.updateCiclo).toHaveBeenCalledWith(id, updateDto);
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.userId,
        action: 'atualizar_ciclo',
        resource: 'Ciclo',
        details: { id, ...updateDto, result: cicloAtualizado },
        ip: mockRequest.ip,
      });
    });

    it('deve retornar dados no formato esperado', async () => {
      // Arrange
      const mockCicloComTimestamp = {
        ...mockCiclo,
        updatedAt: new Date(),
      };
      
      mockCicloService.getCiclo.mockResolvedValue(mockCicloComTimestamp);

      // Act
      const resultado = await controller.getCiclo(mockCiclo.idCiclo);

      // Assert
      expect(resultado.dataInicio).toBeInstanceOf(Date);
      expect(resultado.dataFim).toBeInstanceOf(Date);
      expect(resultado.updatedAt).toBeInstanceOf(Date);
      expect(typeof resultado.nomeCiclo).toBe('string');
      expect(typeof resultado.duracaoEmAndamentoDias).toBe('number');
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('Cenários de auditoria específicos', () => {
    it('deve registrar auditoria com diferentes tipos de request', async () => {
      // Arrange
      const requestTypes = [
        { user: { userId: 'user-1' }, ip: '127.0.0.1' },
        { user: { userId: 'user-2', roles: ['ADMIN'] }, ip: '192.168.1.1' },
        { user: undefined, ip: '10.0.0.1' },
        { user: { userId: null }, ip: undefined },
      ];

      mockCicloService.createCiclo.mockResolvedValue(mockCiclo);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act & Assert
      for (const request of requestTypes) {
        await controller.criarCiclo(createCicloDto, request);

        expect(mockAuditoriaService.log).toHaveBeenCalledWith({
          userId: request.user?.userId,
          action: 'criar_ciclo',
          resource: 'Ciclo',
          details: { ...createCicloDto, result: mockCiclo },
          ip: request.ip,
        });

        jest.clearAllMocks();
      }
    });

    it('deve demonstrar diferença entre PUT (com auditoria) e PATCH (sem auditoria)', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto: UpdateCicloDto = { nome: '2024.5' };
      
      mockCicloService.updateCiclo.mockResolvedValue(mockCiclo);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act - PUT (com auditoria)
      await controller.atualizarCiclo(id, updateDto, mockRequest);
      expect(mockAuditoriaService.log).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();

      // Act - PATCH (sem auditoria)
      await controller.atualizarCicloParcial(id, updateDto);
      expect(mockAuditoriaService.log).not.toHaveBeenCalled();
    });

    it('deve registrar dados completos na auditoria incluindo resultado', async () => {
      // Arrange
      const dtoEspecifico = {
        ...createCicloDto,
        nome: '2024.TESTE',
        duracaoEmAndamentoDias: 45,
      };

      const resultadoEspecifico = {
        ...mockCiclo,
        nomeCiclo: '2024.TESTE',
        duracaoEmAndamentoDias: 45,
      };

      mockCicloService.createCiclo.mockResolvedValue(resultadoEspecifico);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      await controller.criarCiclo(dtoEspecifico, mockRequest);

      // Assert
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.userId,
        action: 'criar_ciclo',
        resource: 'Ciclo',
        details: { ...dtoEspecifico, result: resultadoEspecifico },
        ip: mockRequest.ip,
      });
    });
  });

  describe('Observações sobre auditoria', () => {
    it('deve demonstrar que apenas operações modificadoras têm auditoria', () => {
      // Operações com auditoria

      expect(controller.criarCiclo).toBeDefined();      // COM auditoria
      expect(controller.removerCiclo).toBeDefined();    // COM auditoria
      expect(controller.atualizarCiclo).toBeDefined();  // COM auditoria
      expect(controller.atualizarCicloParcial).toBeDefined(); // SEM auditoria
      expect(controller.getCiclos).toBeDefined();       // SEM auditoria
      expect(controller.getCiclosAtivos).toBeDefined(); // SEM auditoria
      expect(controller.getHistoricoCiclos).toBeDefined(); // SEM auditoria
      expect(controller.getCiclo).toBeDefined();        // SEM auditoria
    });

    it('deve demonstrar separação de responsabilidades entre auditoria e processamento', async () => {
      // Arrange
      mockCicloService.createCiclo.mockResolvedValue(mockCiclo);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      await controller.criarCiclo(createCicloDto, mockRequest);

      // Assert
      expect(mockCicloService.createCiclo).toHaveBeenCalledWith(createCicloDto);
      
      expect(mockAuditoriaService.log).toHaveBeenCalledTimes(1);
      
    });
  });
});