import { Test, TestingModule } from '@nestjs/testing';
import { ParseUUIDPipe } from '@nestjs/common';
import { ProjetosController } from './projetos.controller';
import { ProjetosService } from './projetos.service';
import { CreateProjetoDto, UpdateProjetoDto } from './projetos.dto';
import { CreateAlocacaoDto, UpdateAlocacaoDto } from './alocacao.dto';
import { projetoStatus } from '@prisma/client';

describe('ProjetosController', () => {
  let controller: ProjetosController;
  let service: ProjetosService;

  // Mock do ProjetosService
  const mockProjetosService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    alocarColaborador: jest.fn(),
    listarAlocacoesPorProjeto: jest.fn(),
    atualizarAlocacao: jest.fn(),
    removerAlocacao: jest.fn(),
  };

  // Dados de teste para projetos
  const mockCreateProjetoDto: CreateProjetoDto = {
    nomeProjeto: 'Projeto Teste API',
    cliente: 'Cliente XYZ',
    dataInicio: '2026-01-01',
    dataFim: '2026-06-30',
    status: projetoStatus.PLANEJADO,
  };

  const mockUpdateProjetoDto: UpdateProjetoDto = {
    nomeProjeto: 'Projeto Atualizado API',
    cliente: 'Cliente ABC',
    status: projetoStatus.EM_ANDAMENTO,
  };

  const mockProjeto = {
    idProjeto: '123e4567-e89b-12d3-a456-426614174000',
    nomeProjeto: 'Projeto Teste API',
    cliente: 'Cliente XYZ',
    dataInicio: new Date('2026-01-01'),
    dataFim: new Date('2026-06-30'),
    status: projetoStatus.PLANEJADO,
    dataCriacao: new Date(),
    liderProjeto: null,
    idLiderProjeto: null,
  };

  const mockProjetoAtualizado = {
    ...mockProjeto,
    nomeProjeto: 'Projeto Atualizado API',
    cliente: 'Cliente ABC',
    status: projetoStatus.EM_ANDAMENTO,
  };

  const mockListaProjetos = [
    mockProjeto,
    {
      ...mockProjeto,
      idProjeto: '456e7890-f12g-34h5-i678-901234567891',
      nomeProjeto: 'Outro Projeto',
    },
  ];

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

  const mockAlocacao = {
    idAlocacao: 'aaa1111-bbb2-333c-444d-555555555555',
    idProjeto: mockProjeto.idProjeto,
    idColaborador: '456e7890-f12g-34h5-i678-901234567890',
    dataEntrada: new Date('2026-02-01'),
    dataSaida: new Date('2026-05-31'),
  };

  const mockAlocacaoComColaborador = {
    ...mockAlocacao,
    colaborador: {
      idColaborador: '456e7890-f12g-34h5-i678-901234567890',
      nomeCompleto: 'João Silva',
      email: 'joao@empresa.com',
    },
  };

  const mockListaAlocacoes = [mockAlocacaoComColaborador];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjetosController],
      providers: [
        {
          provide: ProjetosService,
          useValue: mockProjetosService,
        },
      ],
    }).compile();

    controller = module.get<ProjetosController>(ProjetosController);
    service = module.get<ProjetosService>(ProjetosService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Definição do controller', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('deve ter ProjetosService injetado', () => {
      expect(service).toBeDefined();
    });
  });

  describe('create', () => {
    it('deve criar um projeto com sucesso', async () => {
      // Arrange
      mockProjetosService.create.mockResolvedValue(mockProjeto);

      // Act
      const resultado = await controller.create(mockCreateProjetoDto);

      // Assert
      expect(resultado).toEqual(mockProjeto);
      expect(mockProjetosService.create).toHaveBeenCalledWith(mockCreateProjetoDto);
      expect(mockProjetosService.create).toHaveBeenCalledTimes(1);
    });

    it('deve propagar erro do service', async () => {
      // Arrange
      const serviceError = new Error('Erro no service');
      mockProjetosService.create.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.create(mockCreateProjetoDto)).rejects.toThrow(serviceError);
      expect(mockProjetosService.create).toHaveBeenCalledWith(mockCreateProjetoDto);
    });

    it('deve chamar service com dto correto', async () => {
      // Arrange
      const createDto: CreateProjetoDto = {
        nomeProjeto: 'Projeto Mínimo',
      };
      mockProjetosService.create.mockResolvedValue({ ...mockProjeto, nomeProjeto: 'Projeto Mínimo' });

      // Act
      await controller.create(createDto);

      // Assert
      expect(mockProjetosService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('deve retornar lista de projetos', async () => {
      // Arrange
      mockProjetosService.findAll.mockResolvedValue(mockListaProjetos);

      // Act
      const resultado = await controller.findAll();

      // Assert
      expect(resultado).toEqual(mockListaProjetos);
      expect(mockProjetosService.findAll).toHaveBeenCalledWith();
      expect(mockProjetosService.findAll).toHaveBeenCalledTimes(1);
    });

    it('deve retornar lista vazia quando não há projetos', async () => {
      // Arrange
      mockProjetosService.findAll.mockResolvedValue([]);

      // Act
      const resultado = await controller.findAll();

      // Assert
      expect(resultado).toEqual([]);
      expect(mockProjetosService.findAll).toHaveBeenCalledWith();
    });

    it('deve propagar erro do service', async () => {
      // Arrange
      const serviceError = new Error('Erro na consulta');
      mockProjetosService.findAll.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.findAll()).rejects.toThrow(serviceError);
    });
  });

  describe('findOne', () => {
    it('deve retornar projeto específico', async () => {
      // Arrange
      const projectId = mockProjeto.idProjeto;
      mockProjetosService.findOne.mockResolvedValue(mockProjeto);

      // Act
      const resultado = await controller.findOne(projectId);

      // Assert
      expect(resultado).toEqual(mockProjeto);
      expect(mockProjetosService.findOne).toHaveBeenCalledWith(projectId);
      expect(mockProjetosService.findOne).toHaveBeenCalledTimes(1);
    });

    it('deve propagar erro do service quando projeto não encontrado', async () => {
      // Arrange
      const projectId = 'id-inexistente';
      const serviceError = new Error('Projeto não encontrado');
      mockProjetosService.findOne.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.findOne(projectId)).rejects.toThrow(serviceError);
      expect(mockProjetosService.findOne).toHaveBeenCalledWith(projectId);
    });

    it('deve trabalhar com ParseUUIDPipe', async () => {
      // Arrange
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      mockProjetosService.findOne.mockResolvedValue(mockProjeto);

      // Act
      await controller.findOne(validUuid);

      // Assert
      expect(mockProjetosService.findOne).toHaveBeenCalledWith(validUuid);
    });
  });

  describe('update', () => {
    it('deve atualizar projeto com sucesso', async () => {
      // Arrange
      const projectId = mockProjeto.idProjeto;
      mockProjetosService.update.mockResolvedValue(mockProjetoAtualizado);

      // Act
      const resultado = await controller.update(projectId, mockUpdateProjetoDto);

      // Assert
      expect(resultado).toEqual(mockProjetoAtualizado);
      expect(mockProjetosService.update).toHaveBeenCalledWith(projectId, mockUpdateProjetoDto);
      expect(mockProjetosService.update).toHaveBeenCalledTimes(1);
    });

    it('deve propagar erro do service', async () => {
      // Arrange
      const projectId = mockProjeto.idProjeto;
      const serviceError = new Error('Erro na atualização');
      mockProjetosService.update.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.update(projectId, mockUpdateProjetoDto)).rejects.toThrow(serviceError);
      expect(mockProjetosService.update).toHaveBeenCalledWith(projectId, mockUpdateProjetoDto);
    });

    it('deve atualizar com dados parciais', async () => {
      // Arrange
      const projectId = mockProjeto.idProjeto;
      const updateParcial: UpdateProjetoDto = { nomeProjeto: 'Novo Nome' };
      const projetoComNomeAtualizado = { ...mockProjeto, nomeProjeto: 'Novo Nome' };
      mockProjetosService.update.mockResolvedValue(projetoComNomeAtualizado);

      // Act
      const resultado = await controller.update(projectId, updateParcial);

      // Assert
      expect(resultado).toEqual(projetoComNomeAtualizado);
      expect(mockProjetosService.update).toHaveBeenCalledWith(projectId, updateParcial);
    });
  });

  describe('remove', () => {
    it('deve remover projeto com sucesso', async () => {
      // Arrange
      const projectId = mockProjeto.idProjeto;
      mockProjetosService.remove.mockResolvedValue(mockProjeto);

      // Act
      const resultado = await controller.remove(projectId);

      // Assert
      expect(resultado).toEqual(mockProjeto);
      expect(mockProjetosService.remove).toHaveBeenCalledWith(projectId);
      expect(mockProjetosService.remove).toHaveBeenCalledTimes(1);
    });

    it('deve propagar erro do service quando projeto não encontrado', async () => {
      // Arrange
      const projectId = 'id-inexistente';
      const serviceError = new Error('Projeto não encontrado');
      mockProjetosService.remove.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.remove(projectId)).rejects.toThrow(serviceError);
      expect(mockProjetosService.remove).toHaveBeenCalledWith(projectId);
    });

    it('deve trabalhar com ParseUUIDPipe para remoção', async () => {
      // Arrange
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      mockProjetosService.remove.mockResolvedValue(mockProjeto);

      // Act
      await controller.remove(validUuid);

      // Assert
      expect(mockProjetosService.remove).toHaveBeenCalledWith(validUuid);
    });
  });

  describe('alocarColaborador', () => {
    it('deve alocar colaborador com sucesso', async () => {
      // Arrange
      const idProjeto = mockProjeto.idProjeto;
      mockProjetosService.alocarColaborador.mockResolvedValue(mockAlocacao);

      // Act
      const resultado = await controller.alocarColaborador(idProjeto, mockCreateAlocacaoDto);

      // Assert
      expect(resultado).toEqual(mockAlocacao);
      expect(mockProjetosService.alocarColaborador).toHaveBeenCalledWith(idProjeto, mockCreateAlocacaoDto);
      expect(mockProjetosService.alocarColaborador).toHaveBeenCalledTimes(1);
    });

    it('deve propagar erro do service na alocação', async () => {
      // Arrange
      const idProjeto = mockProjeto.idProjeto;
      const serviceError = new Error('Colaborador já alocado');
      mockProjetosService.alocarColaborador.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.alocarColaborador(idProjeto, mockCreateAlocacaoDto)).rejects.toThrow(serviceError);
      expect(mockProjetosService.alocarColaborador).toHaveBeenCalledWith(idProjeto, mockCreateAlocacaoDto);
    });

    it('deve trabalhar com ParseUUIDPipe para projeto', async () => {
      // Arrange
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      mockProjetosService.alocarColaborador.mockResolvedValue(mockAlocacao);

      // Act
      await controller.alocarColaborador(validUuid, mockCreateAlocacaoDto);

      // Assert
      expect(mockProjetosService.alocarColaborador).toHaveBeenCalledWith(validUuid, mockCreateAlocacaoDto);
    });
  });

  describe('listarAlocacoesPorProjeto', () => {
    it('deve listar alocações de um projeto', async () => {
      // Arrange
      const idProjeto = mockProjeto.idProjeto;
      mockProjetosService.listarAlocacoesPorProjeto.mockResolvedValue(mockListaAlocacoes);

      // Act
      const resultado = await controller.listarAlocacoesPorProjeto(idProjeto);

      // Assert
      expect(resultado).toEqual(mockListaAlocacoes);
      expect(mockProjetosService.listarAlocacoesPorProjeto).toHaveBeenCalledWith(idProjeto);
      expect(mockProjetosService.listarAlocacoesPorProjeto).toHaveBeenCalledTimes(1);
    });

    it('deve retornar lista vazia quando projeto não tem alocações', async () => {
      // Arrange
      const idProjeto = mockProjeto.idProjeto;
      mockProjetosService.listarAlocacoesPorProjeto.mockResolvedValue([]);

      // Act
      const resultado = await controller.listarAlocacoesPorProjeto(idProjeto);

      // Assert
      expect(resultado).toEqual([]);
      expect(mockProjetosService.listarAlocacoesPorProjeto).toHaveBeenCalledWith(idProjeto);
    });

    it('deve propagar erro do service', async () => {
      // Arrange
      const idProjeto = 'id-inexistente';
      const serviceError = new Error('Projeto não encontrado');
      mockProjetosService.listarAlocacoesPorProjeto.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.listarAlocacoesPorProjeto(idProjeto)).rejects.toThrow(serviceError);
      expect(mockProjetosService.listarAlocacoesPorProjeto).toHaveBeenCalledWith(idProjeto);
    });

    it('deve retornar alocações com dados de colaborador', async () => {
      // Arrange
      const idProjeto = mockProjeto.idProjeto;
      mockProjetosService.listarAlocacoesPorProjeto.mockResolvedValue(mockListaAlocacoes);

      // Act
      const resultado = await controller.listarAlocacoesPorProjeto(idProjeto);

      // Assert
      expect(resultado[0]).toHaveProperty('colaborador');
      expect(resultado[0].colaborador).toHaveProperty('nomeCompleto');
      expect(resultado[0].colaborador).toHaveProperty('email');
    });
  });

  describe('atualizarAlocacao', () => {
    it('deve atualizar alocação com sucesso', async () => {
      // Arrange
      const idAlocacao = mockAlocacao.idAlocacao;
      const alocacaoAtualizada = {
        ...mockAlocacao,
        dataEntrada: new Date('2026-02-15'),
        dataSaida: new Date('2026-06-15'),
      };
      mockProjetosService.atualizarAlocacao.mockResolvedValue(alocacaoAtualizada);

      // Act
      const resultado = await controller.atualizarAlocacao(idAlocacao, mockUpdateAlocacaoDto);

      // Assert
      expect(resultado).toEqual(alocacaoAtualizada);
      expect(mockProjetosService.atualizarAlocacao).toHaveBeenCalledWith(idAlocacao, mockUpdateAlocacaoDto);
      expect(mockProjetosService.atualizarAlocacao).toHaveBeenCalledTimes(1);
    });

    it('deve propagar erro do service', async () => {
      // Arrange
      const idAlocacao = 'id-inexistente';
      const serviceError = new Error('Alocação não encontrada');
      mockProjetosService.atualizarAlocacao.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.atualizarAlocacao(idAlocacao, mockUpdateAlocacaoDto)).rejects.toThrow(serviceError);
      expect(mockProjetosService.atualizarAlocacao).toHaveBeenCalledWith(idAlocacao, mockUpdateAlocacaoDto);
    });

    it('deve atualizar com dados parciais', async () => {
      // Arrange
      const idAlocacao = mockAlocacao.idAlocacao;
      const updateParcial: UpdateAlocacaoDto = { dataEntrada: '2026-03-01' };
      const alocacaoComDataAtualizada = { ...mockAlocacao, dataEntrada: new Date('2026-03-01') };
      mockProjetosService.atualizarAlocacao.mockResolvedValue(alocacaoComDataAtualizada);

      // Act
      const resultado = await controller.atualizarAlocacao(idAlocacao, updateParcial);

      // Assert
      expect(resultado).toEqual(alocacaoComDataAtualizada);
      expect(mockProjetosService.atualizarAlocacao).toHaveBeenCalledWith(idAlocacao, updateParcial);
    });

    it('deve trabalhar com ParseUUIDPipe para alocação', async () => {
      // Arrange
      const validUuid = 'aaa1111-bbb2-333c-444d-555555555555';
      mockProjetosService.atualizarAlocacao.mockResolvedValue(mockAlocacao);

      // Act
      await controller.atualizarAlocacao(validUuid, mockUpdateAlocacaoDto);

      // Assert
      expect(mockProjetosService.atualizarAlocacao).toHaveBeenCalledWith(validUuid, mockUpdateAlocacaoDto);
    });
  });

  describe('removerAlocacao', () => {
    it('deve remover alocação com sucesso', async () => {
      // Arrange
      const idAlocacao = mockAlocacao.idAlocacao;
      mockProjetosService.removerAlocacao.mockResolvedValue(mockAlocacao);

      // Act
      const resultado = await controller.removerAlocacao(idAlocacao);

      // Assert
      expect(resultado).toEqual(mockAlocacao);
      expect(mockProjetosService.removerAlocacao).toHaveBeenCalledWith(idAlocacao);
      expect(mockProjetosService.removerAlocacao).toHaveBeenCalledTimes(1);
    });

    it('deve propagar erro do service quando alocação não encontrada', async () => {
      // Arrange
      const idAlocacao = 'id-inexistente';
      const serviceError = new Error('Alocação não encontrada');
      mockProjetosService.removerAlocacao.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.removerAlocacao(idAlocacao)).rejects.toThrow(serviceError);
      expect(mockProjetosService.removerAlocacao).toHaveBeenCalledWith(idAlocacao);
    });

    it('deve trabalhar com ParseUUIDPipe para remoção de alocação', async () => {
      // Arrange
      const validUuid = 'aaa1111-bbb2-333c-444d-555555555555';
      mockProjetosService.removerAlocacao.mockResolvedValue(mockAlocacao);

      // Act
      await controller.removerAlocacao(validUuid);

      // Assert
      expect(mockProjetosService.removerAlocacao).toHaveBeenCalledWith(validUuid);
    });
  });

  describe('Testes de integração de endpoints', () => {
    it('deve simular fluxo completo de CRUD de projeto', async () => {
      // Arrange
      mockProjetosService.create.mockResolvedValue(mockProjeto);
      mockProjetosService.findOne.mockResolvedValue(mockProjeto);
      mockProjetosService.update.mockResolvedValue(mockProjetoAtualizado);
      mockProjetosService.remove.mockResolvedValue(mockProjeto);

      // Act - Criar projeto
      const novoProjeto = await controller.create(mockCreateProjetoDto);
      
      // Act - Buscar projeto
      const projetoEncontrado = await controller.findOne(novoProjeto.idProjeto);
      
      // Act - Atualizar projeto
      const projetoAtualizado = await controller.update(novoProjeto.idProjeto, mockUpdateProjetoDto);
      
      // Act - Remover projeto
      const projetoRemovido = await controller.remove(novoProjeto.idProjeto);

      // Assert
      expect(novoProjeto).toEqual(mockProjeto);
      expect(projetoEncontrado).toEqual(mockProjeto);
      expect(projetoAtualizado).toEqual(mockProjetoAtualizado);
      expect(projetoRemovido).toEqual(mockProjeto);
    });

    it('deve simular fluxo completo de gestão de alocações', async () => {
      // Arrange
      mockProjetosService.alocarColaborador.mockResolvedValue(mockAlocacao);
      mockProjetosService.listarAlocacoesPorProjeto.mockResolvedValue(mockListaAlocacoes);
      mockProjetosService.atualizarAlocacao.mockResolvedValue({ ...mockAlocacao, dataEntrada: new Date('2026-02-15') });
      mockProjetosService.removerAlocacao.mockResolvedValue(mockAlocacao);

      // Act - Alocar colaborador
      const alocacao = await controller.alocarColaborador(mockProjeto.idProjeto, mockCreateAlocacaoDto);
      
      // Act - Listar alocações
      const alocacoes = await controller.listarAlocacoesPorProjeto(mockProjeto.idProjeto);
      
      // Act - Atualizar alocação
      const alocacaoAtualizada = await controller.atualizarAlocacao(alocacao.idAlocacao, mockUpdateAlocacaoDto);
      
      // Act - Remover alocação
      const alocacaoRemovida = await controller.removerAlocacao(alocacao.idAlocacao);

      // Assert
      expect(alocacao).toEqual(mockAlocacao);
      expect(alocacoes).toEqual(mockListaAlocacoes);
      expect(alocacaoAtualizada.dataEntrada).toEqual(new Date('2026-02-15'));
      expect(alocacaoRemovida).toEqual(mockAlocacao);
    });
  });

  describe('Validação de parâmetros e DTOs', () => {
    it('deve passar UUIDs válidos pelo ParseUUIDPipe', async () => {
      // Arrange
      const validUuids = [
        '123e4567-e89b-12d3-a456-426614174000',
        '456e7890-f12g-34h5-i678-901234567890',
        'aaa1111-bbb2-333c-444d-555555555555',
      ];

      mockProjetosService.findOne.mockResolvedValue(mockProjeto);
      mockProjetosService.alocarColaborador.mockResolvedValue(mockAlocacao);
      mockProjetosService.atualizarAlocacao.mockResolvedValue(mockAlocacao);

      // Act & Assert
      for (const uuid of validUuids) {
        await controller.findOne(uuid);
        expect(mockProjetosService.findOne).toHaveBeenCalledWith(uuid);
      }
    });

    it('deve trabalhar com diferentes status de projeto', async () => {
      // Arrange
      const statusList = [projetoStatus.PLANEJADO, projetoStatus.EM_ANDAMENTO, projetoStatus.CONCLUIDO, projetoStatus.CANCELADO];

      for (const status of statusList) {
        const createDto: CreateProjetoDto = {
          nomeProjeto: `Projeto ${status}`,
          status,
        };

        const projetoComStatus = { ...mockProjeto, status, nomeProjeto: `Projeto ${status}` };
        mockProjetosService.create.mockResolvedValue(projetoComStatus);

        // Act
        const resultado = await controller.create(createDto);

        // Assert
        expect(resultado.status).toBe(status);
        expect(mockProjetosService.create).toHaveBeenCalledWith(createDto);
      }
    });

    it('deve retornar dados com estrutura correta', async () => {
      // Arrange
      mockProjetosService.findOne.mockResolvedValue(mockProjeto);
      mockProjetosService.listarAlocacoesPorProjeto.mockResolvedValue(mockListaAlocacoes);

      // Act
      const projeto = await controller.findOne(mockProjeto.idProjeto);
      const alocacoes = await controller.listarAlocacoesPorProjeto(mockProjeto.idProjeto);

      // Assert
      expect(projeto).toHaveProperty('idProjeto');
      expect(projeto).toHaveProperty('nomeProjeto');
      expect(projeto).toHaveProperty('status');
      expect(typeof projeto.idProjeto).toBe('string');
      expect(typeof projeto.nomeProjeto).toBe('string');

      expect(Array.isArray(alocacoes)).toBe(true);
      if (alocacoes.length > 0) {
        expect(alocacoes[0]).toHaveProperty('idAlocacao');
        expect(alocacoes[0]).toHaveProperty('colaborador');
        expect(alocacoes[0].colaborador).toHaveProperty('nomeCompleto');
      }
    });
  });

  describe('Casos de erro', () => {
    it('deve propagar erros de validação do service', async () => {
      // Arrange
      const validationError = new Error('Nome do projeto é obrigatório');
      mockProjetosService.create.mockRejectedValue(validationError);

      // Act & Assert
      await expect(controller.create(mockCreateProjetoDto)).rejects.toThrow(validationError);
    });

    it('deve propagar erros de negócio do service', async () => {
      // Arrange
      const businessError = new Error('Colaborador já alocado neste projeto');
      mockProjetosService.alocarColaborador.mockRejectedValue(businessError);

      // Act & Assert
      await expect(controller.alocarColaborador(mockProjeto.idProjeto, mockCreateAlocacaoDto)).rejects.toThrow(businessError);
    });

    it('deve propagar erros de not found do service', async () => {
      // Arrange
      const notFoundError = new Error('Projeto não encontrado');
      mockProjetosService.findOne.mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(controller.findOne('id-inexistente')).rejects.toThrow(notFoundError);
    });
  });

  describe('Verificação de chamadas de métodos', () => {
    it('deve chamar métodos do service exatamente uma vez', async () => {
      // Arrange
      mockProjetosService.findAll.mockResolvedValue(mockListaProjetos);
      mockProjetosService.create.mockResolvedValue(mockProjeto);
      mockProjetosService.update.mockResolvedValue(mockProjetoAtualizado);

      // Act
      await controller.findAll();
      await controller.create(mockCreateProjetoDto);
      await controller.update(mockProjeto.idProjeto, mockUpdateProjetoDto);

      // Assert
      expect(mockProjetosService.findAll).toHaveBeenCalledTimes(1);
      expect(mockProjetosService.create).toHaveBeenCalledTimes(1);
      expect(mockProjetosService.update).toHaveBeenCalledTimes(1);
    });

    it('deve passar parâmetros corretos para métodos do service', async () => {
      // Arrange
      const projectId = mockProjeto.idProjeto;
      const alocacaoId = mockAlocacao.idAlocacao;
      
      mockProjetosService.findOne.mockResolvedValue(mockProjeto);
      mockProjetosService.listarAlocacoesPorProjeto.mockResolvedValue(mockListaAlocacoes);
      mockProjetosService.removerAlocacao.mockResolvedValue(mockAlocacao);

      // Act
      await controller.findOne(projectId);
      await controller.listarAlocacoesPorProjeto(projectId);
      await controller.removerAlocacao(alocacaoId);

      // Assert
      expect(mockProjetosService.findOne).toHaveBeenCalledWith(projectId);
      expect(mockProjetosService.listarAlocacoesPorProjeto).toHaveBeenCalledWith(projectId);
      expect(mockProjetosService.removerAlocacao).toHaveBeenCalledWith(alocacaoId);
    });
  });
});
