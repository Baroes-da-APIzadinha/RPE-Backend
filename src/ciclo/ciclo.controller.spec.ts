import { Test, TestingModule } from '@nestjs/testing';
import { CicloController } from './ciclo.controller';
import { CicloService } from './ciclo.service';
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CicloController],
      providers: [
        {
          provide: CicloService,
          useValue: mockCicloService,
        },
      ],
    }).compile();

    controller = module.get<CicloController>(CicloController);
    service = module.get<CicloService>(CicloService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Definição do controller', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('criarCiclo', () => {
    it('deve criar um ciclo com sucesso', async () => {
      // Arrange
      mockCicloService.createCiclo.mockResolvedValue(mockCiclo);

      // Act
      const resultado = await controller.criarCiclo(createCicloDto);

      // Assert
      expect(resultado).toEqual(mockCiclo);
      expect(mockCicloService.createCiclo).toHaveBeenCalledWith(createCicloDto);
      expect(mockCicloService.createCiclo).toHaveBeenCalledTimes(1);
    });

    it('deve retornar erro quando nome do ciclo é inválido', async () => {
      // Arrange
      const dtoInvalido = { ...createCicloDto, nome: 'nome-inválido' };
      const error = new BadRequestException('O nome do ciclo deve seguir o padrão AAAA.S (ex: 2024.1).');
      
      mockCicloService.createCiclo.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.criarCiclo(dtoInvalido)).rejects.toThrow(BadRequestException);
      expect(mockCicloService.createCiclo).toHaveBeenCalledWith(dtoInvalido);
    });

    it('deve retornar erro quando ciclo já existe', async () => {
      // Arrange
      const error = new ConflictException('Já existe um ciclo com este nome.');
      
      mockCicloService.createCiclo.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.criarCiclo(createCicloDto)).rejects.toThrow(ConflictException);
      expect(mockCicloService.createCiclo).toHaveBeenCalledWith(createCicloDto);
    });

    it('deve retornar erro quando datas são inválidas', async () => {
      // Arrange
      const dtoDataInvalida = {
        ...createCicloDto,
        dataInicioMes: 13, // Mês inválido
      };
      const error = new BadRequestException('Data inválida fornecida');
      
      mockCicloService.createCiclo.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.criarCiclo(dtoDataInvalida)).rejects.toThrow(BadRequestException);
      expect(mockCicloService.createCiclo).toHaveBeenCalledWith(dtoDataInvalida);
    });

    it('deve retornar erro quando há sobreposição de datas', async () => {
      // Arrange
      const error = new ConflictException('O período informado sobrepõe o ciclo existente');
      
      mockCicloService.createCiclo.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.criarCiclo(createCicloDto)).rejects.toThrow(ConflictException);
      expect(mockCicloService.createCiclo).toHaveBeenCalledWith(createCicloDto);
    });
  });

  describe('removerCiclo', () => {
    it('deve remover um ciclo com sucesso', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockCicloService.deleteCiclo.mockResolvedValue(mockCiclo);

      // Act
      const resultado = await controller.removerCiclo(id);

      // Assert
      expect(resultado).toEqual(mockCiclo);
      expect(mockCicloService.deleteCiclo).toHaveBeenCalledWith(id);
      expect(mockCicloService.deleteCiclo).toHaveBeenCalledTimes(1);
    });

    it('deve retornar erro quando ciclo não encontrado', async () => {
      // Arrange
      const id = 'id-inexistente';
      const error = new NotFoundException('Ciclo não encontrado.');
      
      mockCicloService.deleteCiclo.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.removerCiclo(id)).rejects.toThrow(NotFoundException);
      expect(mockCicloService.deleteCiclo).toHaveBeenCalledWith(id);
    });

    it('deve retornar erro quando ID é inválido', async () => {
      // Arrange
      const id = 'id-inválido';
      const error = new BadRequestException('ID do ciclo inválido.');
      
      mockCicloService.deleteCiclo.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.removerCiclo(id)).rejects.toThrow(BadRequestException);
      expect(mockCicloService.deleteCiclo).toHaveBeenCalledWith(id);
    });
  });

  describe('atualizarCiclo (PUT)', () => {
    it('deve atualizar um ciclo completamente com sucesso', async () => {
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

      // Act
      const resultado = await controller.atualizarCiclo(id, updateDto);

      // Assert
      expect(resultado).toEqual(cicloAtualizado);
      expect(mockCicloService.updateCiclo).toHaveBeenCalledWith(id, updateDto);
      expect(mockCicloService.updateCiclo).toHaveBeenCalledTimes(1);
    });

    it('deve retornar erro quando ciclo não encontrado para atualização', async () => {
      // Arrange
      const id = 'id-inexistente';
      const updateDto: UpdateCicloDto = { nome: '2024.2' };
      const error = new NotFoundException('Ciclo não encontrado.');
      
      mockCicloService.updateCiclo.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.atualizarCiclo(id, updateDto)).rejects.toThrow(NotFoundException);
      expect(mockCicloService.updateCiclo).toHaveBeenCalledWith(id, updateDto);
    });

    it('deve retornar erro quando dados de atualização são inválidos', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto: UpdateCicloDto = { nome: 'nome-inválido' };
      const error = new BadRequestException('O nome do ciclo deve seguir o padrão AAAA.S (ex: 2024.1).');
      
      mockCicloService.updateCiclo.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.atualizarCiclo(id, updateDto)).rejects.toThrow(BadRequestException);
      expect(mockCicloService.updateCiclo).toHaveBeenCalledWith(id, updateDto);
    });
  });

  describe('atualizarCicloParcial (PATCH)', () => {
    it('deve atualizar parcialmente um ciclo com sucesso', async () => {
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
    });

    it('deve atualizar apenas o status do ciclo', async () => {
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
    });

    it('deve retornar erro para atualização parcial com dados inválidos', async () => {
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
    });

    it('deve retornar array vazio quando não há ciclos', async () => {
      // Arrange
      mockCicloService.getCiclos.mockResolvedValue([]);

      // Act
      const resultado = await controller.getCiclos();

      // Assert
      expect(resultado).toEqual([]);
      expect(mockCicloService.getCiclos).toHaveBeenCalledTimes(1);
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
    });

    it('deve retornar array vazio quando não há ciclos ativos', async () => {
      // Arrange
      mockCicloService.getCiclosAtivos.mockResolvedValue([]);

      // Act
      const resultado = await controller.getCiclosAtivos();

      // Assert
      expect(resultado).toEqual([]);
      expect(mockCicloService.getCiclosAtivos).toHaveBeenCalledTimes(1);
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
    });

    it('deve retornar array vazio quando não há histórico', async () => {
      // Arrange
      mockCicloService.getHistoricoCiclos.mockResolvedValue([]);

      // Act
      const resultado = await controller.getHistoricoCiclos();

      // Assert
      expect(resultado).toEqual([]);
      expect(mockCicloService.getHistoricoCiclos).toHaveBeenCalledTimes(1);
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
    });

    it('deve retornar erro quando ciclo não encontrado', async () => {
      // Arrange
      const id = 'id-inexistente';
      const error = new NotFoundException('Ciclo não encontrado.');
      
      mockCicloService.getCiclo.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getCiclo(id)).rejects.toThrow(NotFoundException);
      expect(mockCicloService.getCiclo).toHaveBeenCalledWith(id);
    });

    it('deve retornar erro para ID inválido', async () => {
      // Arrange
      const id = 'id-inválido';
      const error = new BadRequestException('ID do ciclo inválido.');
      
      mockCicloService.getCiclo.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getCiclo(id)).rejects.toThrow(BadRequestException);
      expect(mockCicloService.getCiclo).toHaveBeenCalledWith(id);
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
    });

    it('deve propagar erros do service corretamente', async () => {
      // Arrange
      const error = new Error('Erro interno do servidor');
      mockCicloService.getCiclos.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getCiclos()).rejects.toThrow('Erro interno do servidor');
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

    it('deve funcionar com objetos DTO vazios em atualizações parciais', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto: UpdateCicloDto = {}; // DTO vazio
      
      mockCicloService.updateCiclo.mockResolvedValue(mockCiclo);

      // Act
      const resultado = await controller.atualizarCicloParcial(id, updateDto);

      // Assert
      expect(resultado).toEqual(mockCiclo);
      expect(mockCicloService.updateCiclo).toHaveBeenCalledWith(id, updateDto);
    });
  });

  describe('Validação de tipos e estruturas', () => {
    it('deve aceitar CreateCicloDto com todos os campos obrigatórios', async () => {
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

      // Act
      const resultado = await controller.criarCiclo(dtoCompleto);

      // Assert
      expect(resultado).toBeDefined();
      expect(mockCicloService.createCiclo).toHaveBeenCalledWith(dtoCompleto);
    });

    it('deve aceitar UpdateCicloDto com campos opcionais', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto: UpdateCicloDto = {
        nome: '2024.4',
        status: cicloStatus.EM_REVISAO,
        // Outros campos opcionais omitidos
      };

      mockCicloService.updateCiclo.mockResolvedValue({ ...mockCiclo, ...updateDto });

      // Act
      const resultado = await controller.atualizarCiclo(id, updateDto);

      // Assert
      expect(resultado).toBeDefined();
      expect(mockCicloService.updateCiclo).toHaveBeenCalledWith(id, updateDto);
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
    });
  });
});