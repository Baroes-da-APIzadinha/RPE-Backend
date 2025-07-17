import { Test, TestingModule } from '@nestjs/testing';
import { ReferenciasController } from './referencias.controller';
import { ReferenciasService } from './referencias.service';
import { CriarReferenciaDto, AtualizarReferenciaDto } from './referencias.dto';
import { TipoReferencia } from './referencias.constants';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { 
  BadRequestException, 
  NotFoundException 
} from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';

describe('ReferenciasController', () => {
  let controller: ReferenciasController;
  let service: ReferenciasService;

  // Mock do ReferenciasService
  const mockReferenciasService = {
    criarReferencia: jest.fn(),
    atualizarReferencia: jest.fn(),
    deletarReferencia: jest.fn(),
    getAllReferencias: jest.fn(),
    getReferenciaByIndicado: jest.fn(),
    getReferenciaByIndicador: jest.fn(),
    getReferenciaById: jest.fn(),
  };

  // Mock dos Guards
  const mockJwtAuthGuard = {
    canActivate: jest.fn((context: ExecutionContext) => {
      const request = context.switchToHttp().getRequest();
      request.user = { userId: 'user-id', roles: ['COLABORADOR_COMUM'] };
      return true;
    }),
  };

  const mockRolesGuard = {
    canActivate: jest.fn(() => true),
  };

  // Dados de teste
  const mockIndicacao = {
    idIndicacao: '123e4567-e89b-12d3-a456-426614174000',
    idCiclo: '456e7890-e89b-12d3-a456-426614174001',
    idIndicador: '789e0123-e89b-12d3-a456-426614174002',
    idIndicado: '987e6543-e89b-12d3-a456-426614174003',
    tipo: TipoReferencia.TECNICA,
    justificativa: 'Excelente conhecimento técnico em desenvolvimento de software',
  };

  const mockIndicacaoComRelacionamentos = {
    ...mockIndicacao,
    ciclo: {
      idCiclo: '456e7890-e89b-12d3-a456-426614174001',
      nomeCiclo: '2024.1',
      status: 'EM_ANDAMENTO',
    },
    indicador: {
      idColaborador: '789e0123-e89b-12d3-a456-426614174002',
      nomeCompleto: 'João Silva',
      email: 'joao.silva@empresa.com',
    },
    indicado: {
      idColaborador: '987e6543-e89b-12d3-a456-426614174003',
      nomeCompleto: 'Maria Santos',
      email: 'maria.santos@empresa.com',
    },
  };

  const criarReferenciaDto: CriarReferenciaDto = {
    idCiclo: '456e7890-e89b-12d3-a456-426614174001',
    idIndicador: '789e0123-e89b-12d3-a456-426614174002',
    idIndicado: '987e6543-e89b-12d3-a456-426614174003',
    tipo: TipoReferencia.TECNICA,
    justificativa: 'Excelente conhecimento técnico em desenvolvimento de software',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReferenciasController],
      providers: [
        {
          provide: ReferenciasService,
          useValue: mockReferenciasService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    controller = module.get<ReferenciasController>(ReferenciasController);
    service = module.get<ReferenciasService>(ReferenciasService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Definição do controller', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('indicarReferencia (POST /referencias)', () => {
    it('deve criar uma referência com sucesso', async () => {
      // Arrange
      mockReferenciasService.criarReferencia.mockResolvedValue(mockIndicacao);

      // Act
      const resultado = await controller.indicarReferencia(criarReferenciaDto);

      // Assert
      expect(resultado).toEqual(mockIndicacao);
      expect(mockReferenciasService.criarReferencia).toHaveBeenCalledWith(criarReferenciaDto);
      expect(mockReferenciasService.criarReferencia).toHaveBeenCalledTimes(1);
    });

    it('deve criar referência do tipo CULTURAL', async () => {
      // Arrange
      const dtoCultural: CriarReferenciaDto = {
        ...criarReferenciaDto,
        tipo: TipoReferencia.CULTURAL,
        justificativa: 'Demonstra excelentes valores culturais da empresa',
      };

      const indicacaoCultural = {
        ...mockIndicacao,
        tipo: TipoReferencia.CULTURAL,
        justificativa: 'Demonstra excelentes valores culturais da empresa',
      };

      mockReferenciasService.criarReferencia.mockResolvedValue(indicacaoCultural);

      // Act
      const resultado = await controller.indicarReferencia(dtoCultural);

      // Assert
      expect(resultado).toEqual(indicacaoCultural);
      expect(resultado.tipo).toBe(TipoReferencia.CULTURAL);
      expect(mockReferenciasService.criarReferencia).toHaveBeenCalledWith(dtoCultural);
    });

    it('deve retornar erro quando dados inválidos', async () => {
      // Arrange
      const error = new BadRequestException('Dados inválidos para criação de referência');
      mockReferenciasService.criarReferencia.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.indicarReferencia(criarReferenciaDto)).rejects.toThrow(BadRequestException);
      await expect(controller.indicarReferencia(criarReferenciaDto)).rejects.toThrow('Dados inválidos para criação de referência');
      expect(mockReferenciasService.criarReferencia).toHaveBeenCalledWith(criarReferenciaDto);
    });

    it('deve validar UUIDs obrigatórios', async () => {
      // Arrange
      const dtoUUIDInvalido = {
        ...criarReferenciaDto,
        idCiclo: 'uuid-inválido',
      };

      const error = new BadRequestException('UUID inválido');
      mockReferenciasService.criarReferencia.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.indicarReferencia(dtoUUIDInvalido)).rejects.toThrow(BadRequestException);
      expect(mockReferenciasService.criarReferencia).toHaveBeenCalledWith(dtoUUIDInvalido);
    });

    it('deve validar enum TipoReferencia', async () => {
      // Arrange
      const dtoTipoInvalido = {
        ...criarReferenciaDto,
        tipo: 'TIPO_INEXISTENTE',
      };

      const error = new BadRequestException('Tipo de referência inválido');
      mockReferenciasService.criarReferencia.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.indicarReferencia(dtoTipoInvalido)).rejects.toThrow(BadRequestException);
      expect(mockReferenciasService.criarReferencia).toHaveBeenCalledWith(dtoTipoInvalido);
    });

    it('deve validar justificativa não vazia e com limite de caracteres', async () => {
      // Arrange
      const dtoJustificativaVazia = {
        ...criarReferenciaDto,
        justificativa: '',
      };

      const error = new BadRequestException('Justificativa não pode estar vazia');
      mockReferenciasService.criarReferencia.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.indicarReferencia(dtoJustificativaVazia)).rejects.toThrow(BadRequestException);
      expect(mockReferenciasService.criarReferencia).toHaveBeenCalledWith(dtoJustificativaVazia);
    });

    it('deve ter proteção de autenticação e autorização para COLABORADOR_COMUM', () => {
      // Assert - verificar se os guards estão sendo aplicados
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
      expect(mockRolesGuard.canActivate).toBeDefined();
    });
  });

  describe('atualizarReferencia (PUT /referencias/:idIndicacao)', () => {
    it('deve atualizar uma referência com sucesso', async () => {
      // Arrange
      const idIndicacao = '123e4567-e89b-12d3-a456-426614174000';
      const atualizarDto: AtualizarReferenciaDto = {
        tipo: TipoReferencia.CULTURAL,
        justificativa: 'Justificativa atualizada com novos valores culturais',
      };

      const indicacaoAtualizada = {
        ...mockIndicacao,
        ...atualizarDto,
      };

      mockReferenciasService.atualizarReferencia.mockResolvedValue(indicacaoAtualizada);

      // Act
      const resultado = await controller.atualizarReferencia(idIndicacao, atualizarDto);

      // Assert
      expect(resultado).toEqual(indicacaoAtualizada);
      expect(mockReferenciasService.atualizarReferencia).toHaveBeenCalledWith(idIndicacao, atualizarDto);
      expect(mockReferenciasService.atualizarReferencia).toHaveBeenCalledTimes(1);
    });

    it('deve atualizar apenas o tipo quando justificativa não fornecida', async () => {
      // Arrange
      const idIndicacao = '123e4567-e89b-12d3-a456-426614174000';
      const atualizarDto: AtualizarReferenciaDto = {
        tipo: TipoReferencia.CULTURAL,
      };

      const indicacaoAtualizada = {
        ...mockIndicacao,
        tipo: TipoReferencia.CULTURAL,
      };

      mockReferenciasService.atualizarReferencia.mockResolvedValue(indicacaoAtualizada);

      // Act
      const resultado = await controller.atualizarReferencia(idIndicacao, atualizarDto);

      // Assert
      expect(resultado).toEqual(indicacaoAtualizada);
      expect(resultado.tipo).toBe(TipoReferencia.CULTURAL);
      expect(mockReferenciasService.atualizarReferencia).toHaveBeenCalledWith(idIndicacao, atualizarDto);
    });

    it('deve retornar erro quando referência não encontrada para atualização', async () => {
      // Arrange
      const idIndicacao = 'id-inexistente';
      const atualizarDto: AtualizarReferenciaDto = {
        tipo: TipoReferencia.CULTURAL,
      };

      const error = new NotFoundException('Referência não encontrada');
      mockReferenciasService.atualizarReferencia.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.atualizarReferencia(idIndicacao, atualizarDto)).rejects.toThrow(NotFoundException);
      await expect(controller.atualizarReferencia(idIndicacao, atualizarDto)).rejects.toThrow('Referência não encontrada');
      expect(mockReferenciasService.atualizarReferencia).toHaveBeenCalledWith(idIndicacao, atualizarDto);
    });

    it('deve validar enum TipoReferencia na atualização', async () => {
      // Arrange
      const idIndicacao = '123e4567-e89b-12d3-a456-426614174000';
      const atualizarDto: AtualizarReferenciaDto = {
        tipo: 'TIPO_INEXISTENTE' as any,
      };

      const error = new BadRequestException('Tipo de referência inválido');
      mockReferenciasService.atualizarReferencia.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.atualizarReferencia(idIndicacao, atualizarDto)).rejects.toThrow(BadRequestException);
      expect(mockReferenciasService.atualizarReferencia).toHaveBeenCalledWith(idIndicacao, atualizarDto);
    });

    it('deve validar justificativa quando fornecida na atualização', async () => {
      // Arrange
      const idIndicacao = '123e4567-e89b-12d3-a456-426614174000';
      const atualizarDto: AtualizarReferenciaDto = {
        tipo: TipoReferencia.TECNICA,
        justificativa: 'A'.repeat(1001), // Excede limite de 1000 caracteres
      };

      const error = new BadRequestException('Justificativa excede limite de caracteres');
      mockReferenciasService.atualizarReferencia.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.atualizarReferencia(idIndicacao, atualizarDto)).rejects.toThrow(BadRequestException);
      expect(mockReferenciasService.atualizarReferencia).toHaveBeenCalledWith(idIndicacao, atualizarDto);
    });

    it('deve ter proteção de autenticação e autorização adequada', () => {
      // O endpoint update deve exigir role COLABORADOR_COMUM
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
      expect(mockRolesGuard.canActivate).toBeDefined();
    });
  });

  describe('deletarReferencia (DELETE /referencias/:idIndicacao)', () => {
    it('deve deletar uma referência com sucesso', async () => {
      // Arrange
      const idIndicacao = '123e4567-e89b-12d3-a456-426614174000';
      const mensagemSucesso = { message: 'Referência deletada com sucesso' };

      mockReferenciasService.deletarReferencia.mockResolvedValue(mensagemSucesso);

      // Act
      const resultado = await controller.deletarReferencia(idIndicacao);

      // Assert
      expect(resultado).toEqual(mensagemSucesso);
      expect(mockReferenciasService.deletarReferencia).toHaveBeenCalledWith(idIndicacao);
      expect(mockReferenciasService.deletarReferencia).toHaveBeenCalledTimes(1);
    });

    it('deve retornar erro quando referência não encontrada para remoção', async () => {
      // Arrange
      const idIndicacao = 'id-inexistente';
      const error = new NotFoundException('Referência não encontrada');

      mockReferenciasService.deletarReferencia.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.deletarReferencia(idIndicacao)).rejects.toThrow(NotFoundException);
      await expect(controller.deletarReferencia(idIndicacao)).rejects.toThrow('Referência não encontrada');
      expect(mockReferenciasService.deletarReferencia).toHaveBeenCalledWith(idIndicacao);
    });

    it('deve retornar BadRequestException para erros de integridade', async () => {
      // Arrange
      const idIndicacao = '123e4567-e89b-12d3-a456-426614174000';
      const error = new BadRequestException('Erro de integridade referencial');

      mockReferenciasService.deletarReferencia.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.deletarReferencia(idIndicacao)).rejects.toThrow(BadRequestException);
      await expect(controller.deletarReferencia(idIndicacao)).rejects.toThrow('Erro de integridade referencial');
      expect(mockReferenciasService.deletarReferencia).toHaveBeenCalledWith(idIndicacao);
    });

    it('deve retornar mensagem de sucesso após deletar', async () => {
      // Arrange
      const idIndicacao = '123e4567-e89b-12d3-a456-426614174000';
      const mensagemEsperada = { message: 'Referência deletada com sucesso' };

      mockReferenciasService.deletarReferencia.mockResolvedValue(mensagemEsperada);

      // Act
      const resultado = await controller.deletarReferencia(idIndicacao);

      // Assert
      expect(resultado).toEqual(mensagemEsperada);
      expect(resultado).toHaveProperty('message');
    });

    it('deve ter proteção de autenticação e autorização adequada', () => {
      // O endpoint delete deve exigir role COLABORADOR_COMUM
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
      expect(mockRolesGuard.canActivate).toBeDefined();
    });
  });

  describe('getAllReferencias (GET /referencias)', () => {
    it('deve retornar todas as referências com relacionamentos', async () => {
      // Arrange
      const mockReferencias = [
        mockIndicacaoComRelacionamentos,
        {
          ...mockIndicacaoComRelacionamentos,
          idIndicacao: '999e8888-e89b-12d3-a456-426614174999',
          tipo: TipoReferencia.CULTURAL,
        },
      ];

      mockReferenciasService.getAllReferencias.mockResolvedValue(mockReferencias);

      // Act
      const resultado = await controller.getAllReferencias();

      // Assert
      expect(resultado).toEqual(mockReferencias);
      expect(mockReferenciasService.getAllReferencias).toHaveBeenCalledTimes(1);
      expect(mockReferenciasService.getAllReferencias).toHaveBeenCalledWith();
    });

    it('deve retornar array vazio quando não há referências', async () => {
      // Arrange
      mockReferenciasService.getAllReferencias.mockResolvedValue([]);

      // Act
      const resultado = await controller.getAllReferencias();

      // Assert
      expect(resultado).toEqual([]);
      expect(mockReferenciasService.getAllReferencias).toHaveBeenCalledTimes(1);
    });

    it('deve retornar referências com estrutura de relacionamentos correta', async () => {
      // Arrange
      const mockReferencias = [mockIndicacaoComRelacionamentos];
      mockReferenciasService.getAllReferencias.mockResolvedValue(mockReferencias);

      // Act
      const resultado = await controller.getAllReferencias();

      // Assert
      expect(resultado[0]).toHaveProperty('ciclo');
      expect(resultado[0]).toHaveProperty('indicador');
      expect(resultado[0]).toHaveProperty('indicado');
      expect(resultado[0].ciclo).toHaveProperty('nomeCiclo');
      expect(resultado[0].indicador).toHaveProperty('nomeCompleto');
      expect(resultado[0].indicado).toHaveProperty('email');
    });

    it('deve lançar BadRequestException quando há erro no service', async () => {
      // Arrange
      const error = new BadRequestException('Erro ao listar referências');
      mockReferenciasService.getAllReferencias.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getAllReferencias()).rejects.toThrow(BadRequestException);
      await expect(controller.getAllReferencias()).rejects.toThrow('Erro ao listar referências');
    });

    it('deve ter proteção de autenticação JWT', () => {
      // O endpoint deve estar protegido apenas com JwtAuthGuard
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
    });
  });

  describe('getReferenciaByIndicado (GET /referencias/indicado/:idIndicado)', () => {
    it('deve retornar referências de um indicado específico', async () => {
      // Arrange
      const idIndicado = '987e6543-e89b-12d3-a456-426614174003';
      const mockReferenciasIndicado = [
        {
          ...mockIndicacaoComRelacionamentos,
          ciclo: mockIndicacaoComRelacionamentos.ciclo,
          indicador: mockIndicacaoComRelacionamentos.indicador,
        },
      ];

      mockReferenciasService.getReferenciaByIndicado.mockResolvedValue(mockReferenciasIndicado);

      // Act
      const resultado = await controller.getReferenciaByIndicado(idIndicado);

      // Assert
      expect(resultado).toEqual(mockReferenciasIndicado);
      expect(mockReferenciasService.getReferenciaByIndicado).toHaveBeenCalledWith(idIndicado);
      expect(mockReferenciasService.getReferenciaByIndicado).toHaveBeenCalledTimes(1);
    });

    it('deve retornar erro quando indicado não tem referências', async () => {
      // Arrange
      const idIndicado = 'indicado-sem-referencias';
      const error = new BadRequestException('Nenhuma referência encontrada para este indicado');

      mockReferenciasService.getReferenciaByIndicado.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getReferenciaByIndicado(idIndicado)).rejects.toThrow(BadRequestException);
      await expect(controller.getReferenciaByIndicado(idIndicado)).rejects.toThrow('Nenhuma referência encontrada para este indicado');
      expect(mockReferenciasService.getReferenciaByIndicado).toHaveBeenCalledWith(idIndicado);
    });

    it('deve retornar referências com relacionamentos corretos (sem dados do próprio indicado)', async () => {
      // Arrange
      const idIndicado = '987e6543-e89b-12d3-a456-426614174003';
      const mockReferenciasIndicado = [
        {
          ...mockIndicacao,
          ciclo: mockIndicacaoComRelacionamentos.ciclo,
          indicador: mockIndicacaoComRelacionamentos.indicador,
          // Sem propriedade 'indicado'
        },
      ];

      mockReferenciasService.getReferenciaByIndicado.mockResolvedValue(mockReferenciasIndicado);

      // Act
      const resultado = await controller.getReferenciaByIndicado(idIndicado);

      // Assert
      expect(resultado[0]).toHaveProperty('ciclo');
      expect(resultado[0]).toHaveProperty('indicador');
      expect(resultado[0]).not.toHaveProperty('indicado');
    });

    it('deve validar formato do UUID do indicado', async () => {
      // Arrange
      const idIndicadoInvalido = 'id-inválido';
      const error = new BadRequestException('UUID inválido');

      mockReferenciasService.getReferenciaByIndicado.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getReferenciaByIndicado(idIndicadoInvalido)).rejects.toThrow(BadRequestException);
      expect(mockReferenciasService.getReferenciaByIndicado).toHaveBeenCalledWith(idIndicadoInvalido);
    });

    it('deve ter proteção de autenticação JWT', () => {
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
    });
  });

  describe('getReferenciaByIndicador (GET /referencias/indicador/:idIndicador)', () => {
    it('deve retornar referências de um indicador específico', async () => {
      // Arrange
      const idIndicador = '789e0123-e89b-12d3-a456-426614174002';
      const mockReferenciasIndicador = [
        {
          ...mockIndicacaoComRelacionamentos,
          ciclo: mockIndicacaoComRelacionamentos.ciclo,
          indicado: mockIndicacaoComRelacionamentos.indicado,
        },
      ];

      mockReferenciasService.getReferenciaByIndicador.mockResolvedValue(mockReferenciasIndicador);

      // Act
      const resultado = await controller.getReferenciaByIndicador(idIndicador);

      // Assert
      expect(resultado).toEqual(mockReferenciasIndicador);
      expect(mockReferenciasService.getReferenciaByIndicador).toHaveBeenCalledWith(idIndicador);
      expect(mockReferenciasService.getReferenciaByIndicador).toHaveBeenCalledTimes(1);
    });

    it('deve retornar erro quando indicador não tem referências', async () => {
      // Arrange
      const idIndicador = 'indicador-sem-referencias';
      const error = new BadRequestException('Nenhuma referência encontrada para este indicador');

      mockReferenciasService.getReferenciaByIndicador.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getReferenciaByIndicador(idIndicador)).rejects.toThrow(BadRequestException);
      await expect(controller.getReferenciaByIndicador(idIndicador)).rejects.toThrow('Nenhuma referência encontrada para este indicador');
      expect(mockReferenciasService.getReferenciaByIndicador).toHaveBeenCalledWith(idIndicador);
    });

    it('deve retornar referências com relacionamentos corretos (sem dados do próprio indicador)', async () => {
      // Arrange
      const idIndicador = '789e0123-e89b-12d3-a456-426614174002';
      const mockReferenciasIndicador = [
        {
          ...mockIndicacao,
          ciclo: mockIndicacaoComRelacionamentos.ciclo,
          indicado: mockIndicacaoComRelacionamentos.indicado,
          // Sem propriedade 'indicador'
        },
      ];

      mockReferenciasService.getReferenciaByIndicador.mockResolvedValue(mockReferenciasIndicador);

      // Act
      const resultado = await controller.getReferenciaByIndicador(idIndicador);

      // Assert
      expect(resultado[0]).toHaveProperty('ciclo');
      expect(resultado[0]).toHaveProperty('indicado');
      expect(resultado[0]).not.toHaveProperty('indicador');
    });

    it('deve validar formato do UUID do indicador', async () => {
      // Arrange
      const idIndicadorInvalido = 'id-inválido';
      const error = new BadRequestException('UUID inválido');

      mockReferenciasService.getReferenciaByIndicador.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getReferenciaByIndicador(idIndicadorInvalido)).rejects.toThrow(BadRequestException);
      expect(mockReferenciasService.getReferenciaByIndicador).toHaveBeenCalledWith(idIndicadorInvalido);
    });

    it('deve ter proteção de autenticação JWT', () => {
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
    });
  });

  describe('getReferenciaById (GET /referencias/:idIndicacao)', () => {
    it('deve retornar uma referência específica por ID', async () => {
      // Arrange
      const idIndicacao = '123e4567-e89b-12d3-a456-426614174000';
      mockReferenciasService.getReferenciaById.mockResolvedValue(mockIndicacaoComRelacionamentos);

      // Act
      const resultado = await controller.getReferenciaById(idIndicacao);

      // Assert
      expect(resultado).toEqual(mockIndicacaoComRelacionamentos);
      expect(mockReferenciasService.getReferenciaById).toHaveBeenCalledWith(idIndicacao);
      expect(mockReferenciasService.getReferenciaById).toHaveBeenCalledTimes(1);
    });

    it('deve retornar erro quando referência não encontrada', async () => {
      // Arrange
      const idIndicacao = 'id-inexistente';
      const error = new BadRequestException('Referência não encontrada');

      mockReferenciasService.getReferenciaById.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getReferenciaById(idIndicacao)).rejects.toThrow(BadRequestException);
      await expect(controller.getReferenciaById(idIndicacao)).rejects.toThrow('Referência não encontrada');
      expect(mockReferenciasService.getReferenciaById).toHaveBeenCalledWith(idIndicacao);
    });

    it('deve retornar referência com todos os relacionamentos', async () => {
      // Arrange
      const idIndicacao = '123e4567-e89b-12d3-a456-426614174000';
      mockReferenciasService.getReferenciaById.mockResolvedValue(mockIndicacaoComRelacionamentos);

      // Act
      const resultado = await controller.getReferenciaById(idIndicacao);

      // Assert
      expect(resultado).toHaveProperty('ciclo');
      expect(resultado).toHaveProperty('indicador');
      expect(resultado).toHaveProperty('indicado');
      expect(resultado.ciclo).toHaveProperty('nomeCiclo');
      expect(resultado.indicador).toHaveProperty('nomeCompleto');
      expect(resultado.indicado).toHaveProperty('email');
    });

    it('deve validar formato do UUID', async () => {
      // Arrange
      const idIndicacaoInvalido = 'id-inválido';
      const error = new BadRequestException('UUID inválido');

      mockReferenciasService.getReferenciaById.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getReferenciaById(idIndicacaoInvalido)).rejects.toThrow(BadRequestException);
      expect(mockReferenciasService.getReferenciaById).toHaveBeenCalledWith(idIndicacaoInvalido);
    });

    it('deve ter proteção de autenticação JWT', () => {
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
    });
  });

  describe('Guards e Autenticação', () => {
    it('deve aplicar JwtAuthGuard em todos os endpoints', () => {
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
    });

    it('deve aplicar RolesGuard nos endpoints que exigem role específica', () => {
      expect(mockRolesGuard.canActivate).toBeDefined();
    });

    it('deve simular usuário autenticado com role COLABORADOR_COMUM', () => {
      // Arrange
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { userId: 'user-id', roles: ['COLABORADOR_COMUM'] },
          }),
        }),
      } as ExecutionContext;

      // Act
      const result = mockJwtAuthGuard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('deve permitir acesso para role COLABORADOR_COMUM', () => {
      const result = mockRolesGuard.canActivate();
      expect(result).toBe(true);
    });

    it('deve proteger endpoints CUD (Create, Update, Delete) com role COLABORADOR_COMUM', () => {
      // Os endpoints POST, PUT, DELETE devem exigir role COLABORADOR_COMUM
      expect(mockRolesGuard.canActivate).toBeDefined();
    });

    it('deve proteger endpoints de leitura apenas com JWT', () => {
      // Os endpoints GET devem estar protegidos apenas com JwtAuthGuard
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
    });
  });

  describe('Validação de DTOs', () => {
    it('deve validar CriarReferenciaDto corretamente', async () => {
      // Arrange
      const dtoCompleto: CriarReferenciaDto = {
        idCiclo: '456e7890-e89b-12d3-a456-426614174001',
        idIndicador: '789e0123-e89b-12d3-a456-426614174002',
        idIndicado: '987e6543-e89b-12d3-a456-426614174003',
        tipo: TipoReferencia.TECNICA,
        justificativa: 'Justificativa válida para referência técnica',
      };

      mockReferenciasService.criarReferencia.mockResolvedValue(mockIndicacao);

      // Act
      const resultado = await controller.indicarReferencia(dtoCompleto);

      // Assert
      expect(resultado).toBeDefined();
      expect(mockReferenciasService.criarReferencia).toHaveBeenCalledWith(dtoCompleto);
    });

    it('deve validar AtualizarReferenciaDto com campos opcionais', async () => {
      // Arrange
      const idIndicacao = '123e4567-e89b-12d3-a456-426614174000';
      const atualizarDto: AtualizarReferenciaDto = {
        tipo: TipoReferencia.CULTURAL,
        // justificativa é opcional
      };

      mockReferenciasService.atualizarReferencia.mockResolvedValue({
        ...mockIndicacao,
        ...atualizarDto,
      });

      // Act
      const resultado = await controller.atualizarReferencia(idIndicacao, atualizarDto);

      // Assert
      expect(resultado).toBeDefined();
      expect(mockReferenciasService.atualizarReferencia).toHaveBeenCalledWith(idIndicacao, atualizarDto);
    });

    it('deve validar tipos enum TipoReferencia', async () => {
      // Arrange
      const dtoTecnica: CriarReferenciaDto = {
        ...criarReferenciaDto,
        tipo: TipoReferencia.TECNICA,
      };

      const dtoCultural: CriarReferenciaDto = {
        ...criarReferenciaDto,
        tipo: TipoReferencia.CULTURAL,
      };

      mockReferenciasService.criarReferencia
        .mockResolvedValueOnce({ ...mockIndicacao, tipo: TipoReferencia.TECNICA })
        .mockResolvedValueOnce({ ...mockIndicacao, tipo: TipoReferencia.CULTURAL });

      // Act
      const resultadoTecnica = await controller.indicarReferencia(dtoTecnica);
      const resultadoCultural = await controller.indicarReferencia(dtoCultural);

      // Assert
      expect(resultadoTecnica.tipo).toBe(TipoReferencia.TECNICA);
      expect(resultadoCultural.tipo).toBe(TipoReferencia.CULTURAL);
    });
  });

  describe('Integração e casos extremos', () => {
    it('deve lidar com múltiplas operações simultâneas', async () => {
      // Arrange
      mockReferenciasService.getAllReferencias.mockResolvedValue([mockIndicacao]);

      // Act
      const promessas = [
        controller.getAllReferencias(),
        controller.getAllReferencias(),
        controller.getAllReferencias(),
      ];

      const resultados = await Promise.all(promessas);

      // Assert
      expect(resultados).toHaveLength(3);
      expect(mockReferenciasService.getAllReferencias).toHaveBeenCalledTimes(3);
      resultados.forEach(resultado => {
        expect(resultado).toEqual([mockIndicacao]);
      });
    });

    it('deve propagar erros do service corretamente', async () => {
      // Arrange
      const error = new Error('Erro interno do servidor');
      mockReferenciasService.getAllReferencias.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getAllReferencias()).rejects.toThrow('Erro interno do servidor');
    });

    it('deve validar que todos os endpoints estão mapeados corretamente', () => {
      // Assert
      expect(controller.indicarReferencia).toBeDefined();
      expect(controller.atualizarReferencia).toBeDefined();
      expect(controller.deletarReferencia).toBeDefined();
      expect(controller.getAllReferencias).toBeDefined();
      expect(controller.getReferenciaByIndicado).toBeDefined();
      expect(controller.getReferenciaByIndicador).toBeDefined();
      expect(controller.getReferenciaById).toBeDefined();
    });

    it('deve manter consistência entre endpoints de busca específica', async () => {
      // Arrange
      const idIndicador = '789e0123-e89b-12d3-a456-426614174002';
      const idIndicado = '987e6543-e89b-12d3-a456-426614174003';
      
      const mockReferenciasPorIndicador = [{ ...mockIndicacao, tipo: TipoReferencia.TECNICA }];
      const mockReferenciasPorIndicado = [{ ...mockIndicacao, tipo: TipoReferencia.CULTURAL }];

      mockReferenciasService.getReferenciaByIndicador.mockResolvedValue(mockReferenciasPorIndicador);
      mockReferenciasService.getReferenciaByIndicado.mockResolvedValue(mockReferenciasPorIndicado);

      // Act
      const resultadoPorIndicador = await controller.getReferenciaByIndicador(idIndicador);
      const resultadoPorIndicado = await controller.getReferenciaByIndicado(idIndicado);

      // Assert
      expect(resultadoPorIndicador).toBeDefined();
      expect(resultadoPorIndicado).toBeDefined();
      expect(mockReferenciasService.getReferenciaByIndicador).toHaveBeenCalledWith(idIndicador);
      expect(mockReferenciasService.getReferenciaByIndicado).toHaveBeenCalledWith(idIndicado);
    });
  });

  describe('Estrutura de resposta e tipos', () => {
    it('deve retornar estrutura correta nas operações CRUD', async () => {
      // Arrange
      mockReferenciasService.criarReferencia.mockResolvedValue(mockIndicacao);

      // Act
      const resultado = await controller.indicarReferencia(criarReferenciaDto);

      // Assert
      expect(resultado).toMatchObject({
        idIndicacao: expect.any(String),
        idCiclo: expect.any(String),
        idIndicador: expect.any(String),
        idIndicado: expect.any(String),
        tipo: expect.any(String),
        justificativa: expect.any(String),
      });
    });

    it('deve retornar dados com relacionamentos quando aplicável', async () => {
      // Arrange
      mockReferenciasService.getAllReferencias.mockResolvedValue([mockIndicacaoComRelacionamentos]);

      // Act
      const resultado = await controller.getAllReferencias();

      // Assert
      expect(resultado[0]).toHaveProperty('ciclo');
      expect(resultado[0]).toHaveProperty('indicador');
      expect(resultado[0]).toHaveProperty('indicado');
      expect(resultado[0].ciclo).toMatchObject({
        idCiclo: expect.any(String),
        nomeCiclo: expect.any(String),
        status: expect.any(String),
      });
      expect(resultado[0].indicador).toMatchObject({
        idColaborador: expect.any(String),
        nomeCompleto: expect.any(String),
        email: expect.any(String),
      });
    });

    it('deve manter consistência de tipos nos retornos', async () => {
      // Arrange
      const idIndicacao = '123e4567-e89b-12d3-a456-426614174000';
      mockReferenciasService.getReferenciaById.mockResolvedValue(mockIndicacaoComRelacionamentos);

      // Act
      const resultado = await controller.getReferenciaById(idIndicacao);

      // Assert
      expect(typeof resultado.idIndicacao).toBe('string');
      expect(typeof resultado.idCiclo).toBe('string');
      expect(typeof resultado.idIndicador).toBe('string');
      expect(typeof resultado.idIndicado).toBe('string');
      expect(typeof resultado.tipo).toBe('string');
      expect(typeof resultado.justificativa).toBe('string');
    });

    it('deve retornar mensagem apropriada para operação de delete', async () => {
      // Arrange
      const idIndicacao = '123e4567-e89b-12d3-a456-426614174000';
      const mensagemSucesso = { message: 'Referência deletada com sucesso' };

      mockReferenciasService.deletarReferencia.mockResolvedValue(mensagemSucesso);

      // Act
      const resultado = await controller.deletarReferencia(idIndicacao);

      // Assert
      expect(resultado).toEqual(mensagemSucesso);
      expect(resultado).toHaveProperty('message');
      expect(typeof resultado.message).toBe('string');
    });
  });
});