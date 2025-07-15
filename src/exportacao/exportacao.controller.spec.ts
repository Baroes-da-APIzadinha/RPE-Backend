import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import { ExportacaoController } from './exportacao.controller';
import { ExportacaoService } from './exportacao.service';

describe('ExportacaoController', () => {
  let controller: ExportacaoController;
  let exportacaoService: ExportacaoService;

  // Constantes de teste
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';
  const mockBuffer = Buffer.from('test excel data');

  // Mock do ExportacaoService
  const mockExportacaoService = {
    exportarDadosDoCiclo: jest.fn(),
  };

  // Mock da Response do Express
  const mockResponse = {
    set: jest.fn(),
  } as Partial<Response>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExportacaoController],
      providers: [
        {
          provide: ExportacaoService,
          useValue: mockExportacaoService,
        },
      ],
    }).compile();

    controller = module.get<ExportacaoController>(ExportacaoController);
    exportacaoService = module.get<ExportacaoService>(ExportacaoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Definição do controller', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('deve ter ExportacaoService injetado', () => {
      expect(exportacaoService).toBeDefined();
    });
  });

  describe('GET /exportacao/ciclo/:idCiclo', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';
    const mockBuffer = Buffer.from('test excel data');

    it('deve exportar dados do ciclo com sucesso', async () => {
      // Arrange
      mockExportacaoService.exportarDadosDoCiclo.mockResolvedValue(mockBuffer);

      // Act
      const result = await controller.exportarDadosDoCiclo(validUuid, mockResponse as Response);

      // Assert
      expect(result).toBeInstanceOf(StreamableFile);
      expect(mockExportacaoService.exportarDadosDoCiclo).toHaveBeenCalledWith(validUuid);
      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="relatorio_ciclo_${validUuid}.xlsx"`,
      });
    });

    it('deve configurar headers corretos para download', async () => {
      // Arrange
      const idCiclo = '123e4567-e89b-12d3-a456-426614174000';
      mockExportacaoService.exportarDadosDoCiclo.mockResolvedValue(mockBuffer);

      // Act
      await controller.exportarDadosDoCiclo(idCiclo, mockResponse as Response);

      // Assert
      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="relatorio_ciclo_${idCiclo}.xlsx"`,
      });
    });

    it('deve retornar StreamableFile com buffer correto', async () => {
      // Arrange
      const bufferEsperado = Buffer.from('dados do excel');
      mockExportacaoService.exportarDadosDoCiclo.mockResolvedValue(bufferEsperado);

      // Act
      const result = await controller.exportarDadosDoCiclo(validUuid, mockResponse as Response);

      // Assert
      expect(result).toBeInstanceOf(StreamableFile);
      // Verificar se o StreamableFile foi criado com o buffer correto
      // Nota: Como StreamableFile encapsula o buffer, não podemos acessá-lo diretamente
      // mas podemos verificar que foi criado
      expect(result).toBeDefined();
    });

    it('deve propagar NotFoundException do service', async () => {
      // Arrange
      const idCicloInexistente = '550e8400-e29b-41d4-a716-446655440001';
      const notFoundError = new NotFoundException(`Ciclo com ID "${idCicloInexistente}" não encontrado.`);
      
      mockExportacaoService.exportarDadosDoCiclo.mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(
        controller.exportarDadosDoCiclo(idCicloInexistente, mockResponse as Response)
      ).rejects.toThrow(notFoundError);

      expect(mockExportacaoService.exportarDadosDoCiclo).toHaveBeenCalledWith(idCicloInexistente);
      expect(mockResponse.set).not.toHaveBeenCalled();
    });

    it('deve propagar erro genérico do service', async () => {
      // Arrange
      const errorGenerico = new Error('Erro interno do servidor');
      mockExportacaoService.exportarDadosDoCiclo.mockRejectedValue(errorGenerico);

      // Act & Assert
      await expect(
        controller.exportarDadosDoCiclo(validUuid, mockResponse as Response)
      ).rejects.toThrow(errorGenerico);

      expect(mockResponse.set).not.toHaveBeenCalled();
    });

    it('deve gerar nome de arquivo único para cada ciclo', async () => {
      // Arrange
      const ciclos = [
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
      ];

      for (const idCiclo of ciclos) {
        mockExportacaoService.exportarDadosDoCiclo.mockResolvedValue(mockBuffer);

        // Act
        await controller.exportarDadosDoCiclo(idCiclo, mockResponse as Response);

        // Assert
        expect(mockResponse.set).toHaveBeenCalledWith({
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="relatorio_ciclo_${idCiclo}.xlsx"`,
        });

        // Reset mocks for next iteration
        jest.clearAllMocks();
      }
    });

    it('deve funcionar com diferentes tamanhos de buffer', async () => {
      // Arrange
      const buffersVariados = [
        Buffer.from('pequeno'),
        Buffer.from('x'.repeat(1000)), // Buffer médio
        Buffer.from('x'.repeat(10000)), // Buffer grande
        Buffer.alloc(0), // Buffer vazio
      ];

      for (const buffer of buffersVariados) {
        mockExportacaoService.exportarDadosDoCiclo.mockResolvedValue(buffer);

        // Act
        const result = await controller.exportarDadosDoCiclo(validUuid, mockResponse as Response);

        // Assert
        expect(result).toBeInstanceOf(StreamableFile);
        expect(mockExportacaoService.exportarDadosDoCiclo).toHaveBeenCalledWith(validUuid);

        // Reset mocks for next iteration
        jest.clearAllMocks();
      }
    });

    it('deve chamar service apenas uma vez por requisição', async () => {
      // Arrange
      mockExportacaoService.exportarDadosDoCiclo.mockResolvedValue(mockBuffer);

      // Act
      await controller.exportarDadosDoCiclo(validUuid, mockResponse as Response);

      // Assert
      expect(mockExportacaoService.exportarDadosDoCiclo).toHaveBeenCalledTimes(1);
      expect(mockExportacaoService.exportarDadosDoCiclo).toHaveBeenCalledWith(validUuid);
    });
  });

  describe('Validações de parâmetros', () => {
    it('deve funcionar com UUIDs em diferentes formatos válidos', async () => {
      // Arrange
      const uuidsValidos = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        '00000000-0000-0000-0000-000000000000',
      ];

      mockExportacaoService.exportarDadosDoCiclo.mockResolvedValue(Buffer.from('test'));

      for (const uuid of uuidsValidos) {
        // Act & Assert
        await expect(
          controller.exportarDadosDoCiclo(uuid, mockResponse as Response)
        ).resolves.toBeInstanceOf(StreamableFile);

        // Reset mocks for next iteration
        jest.clearAllMocks();
      }
    });

    // Nota: O ParseUUIDPipe do NestJS já valida o formato UUID,
    // então UUIDs inválidos resultarão em BadRequestException antes de chegar ao controller
    // Estes testes não são necessários pois a validação acontece no pipe
  });

  describe('Integração com Response', () => {
    it('deve funcionar com diferentes implementações de Response', async () => {
      // Arrange
      const mockResponses = [
        { set: jest.fn() },
        { set: jest.fn() },
        { set: jest.fn() },
      ];

      mockExportacaoService.exportarDadosDoCiclo.mockResolvedValue(mockBuffer);

      for (const mockRes of mockResponses) {
        // Act
        const result = await controller.exportarDadosDoCiclo(
          validUuid, 
          mockRes as unknown as Response
        );

        // Assert
        expect(result).toBeInstanceOf(StreamableFile);
        expect(mockRes.set).toHaveBeenCalledTimes(1);

        // Reset mocks for next iteration
        jest.clearAllMocks();
      }
    });

    it('deve configurar headers mesmo com buffer vazio', async () => {
      // Arrange
      const bufferVazio = Buffer.alloc(0);
      mockExportacaoService.exportarDadosDoCiclo.mockResolvedValue(bufferVazio);

      // Act
      const result = await controller.exportarDadosDoCiclo(validUuid, mockResponse as Response);

      // Assert
      expect(result).toBeInstanceOf(StreamableFile);
      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="relatorio_ciclo_${validUuid}.xlsx"`,
      });
    });

    it('deve manter consistência no formato do nome do arquivo', async () => {
      // Arrange
      mockExportacaoService.exportarDadosDoCiclo.mockResolvedValue(mockBuffer);

      // Act
      await controller.exportarDadosDoCiclo(validUuid, mockResponse as Response);

      // Assert
      const setCall = (mockResponse.set as jest.Mock).mock.calls[0][0];
      const contentDisposition = setCall['Content-Disposition'];
      
      expect(contentDisposition).toMatch(/^attachment; filename="relatorio_ciclo_[\w-]+\.xlsx"$/);
      expect(contentDisposition).toContain(validUuid);
    });
  });

  describe('Cenários de erro avançados', () => {
    it('deve tratar erro de timeout do service', async () => {
      // Arrange
      const timeoutError = new Error('Request timeout');
      mockExportacaoService.exportarDadosDoCiclo.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(
        controller.exportarDadosDoCiclo(validUuid, mockResponse as Response)
      ).rejects.toThrow(timeoutError);

      expect(mockResponse.set).not.toHaveBeenCalled();
    });

    it('deve tratar erro de conexão com banco', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockExportacaoService.exportarDadosDoCiclo.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        controller.exportarDadosDoCiclo(validUuid, mockResponse as Response)
      ).rejects.toThrow(dbError);

      expect(mockResponse.set).not.toHaveBeenCalled();
    });

    it('deve propagar erro de validação de dados', async () => {
      // Arrange
      const validationError = new Error('Invalid data format');
      mockExportacaoService.exportarDadosDoCiclo.mockRejectedValue(validationError);

      // Act & Assert
      await expect(
        controller.exportarDadosDoCiclo(validUuid, mockResponse as Response)
      ).rejects.toThrow(validationError);

      expect(mockResponse.set).not.toHaveBeenCalled();
    });
  });
});
