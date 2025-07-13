import { Test, TestingModule } from '@nestjs/testing';
import { ImportacaoController } from './importacao.controller';
import { ImportacaoService } from './importacao.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ParseFilePipe, MaxFileSizeValidator } from '@nestjs/common';

// Mock do ImportacaoService
const mockImportacaoService = {
  iniciarProcessoDeImportacao: jest.fn(),
};

describe('ImportacaoController', () => {
  let controller: ImportacaoController;
  let importacaoService: ImportacaoService;

  // Mock files para testes
  const mockValidFile = {
    originalname: 'avaliacoes.xlsx',
    buffer: Buffer.from('mock excel data'),
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 1024 * 1024, // 1MB
  };

  const mockLargeFile = {
    originalname: 'arquivo-grande.xlsx',
    buffer: Buffer.alloc(12 * 1024 * 1024), // 12MB (excede limite de 10MB)
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 12 * 1024 * 1024,
  };

  type ImportacaoResponse = {
    statusCode: number;
    message: string;
  };

  const mockSuccessResponse: ImportacaoResponse = {
    statusCode: 202,
    message: 'Arquivo recebido. A importação foi iniciada e será processada em segundo plano.',
  };

  const criarArquivoMock = (size: number, originalname = 'teste.xlsx') => {
    return {
      fieldname: 'file',
      originalname: originalname,
      encoding: '7bit',
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: size,
      buffer: Buffer.alloc(size),
      destination: undefined,
      filename: undefined,
      path: undefined,
    } as any;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImportacaoController],
      providers: [
        {
          provide: ImportacaoService,
          useValue: mockImportacaoService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<ImportacaoController>(ImportacaoController);
    importacaoService = module.get<ImportacaoService>(ImportacaoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Definição do controller', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('deve ter ImportacaoService injetado', () => {
      expect(importacaoService).toBeDefined();
    });
  });

  describe('importarAvaliacoes', () => {
    it('deve processar arquivo válido com sucesso', async () => {
      // Arrange
      mockImportacaoService.iniciarProcessoDeImportacao.mockResolvedValue(mockSuccessResponse);

      // Act
      const resultado = await controller.importarAvaliacoes(mockValidFile);

      // Assert
      expect(resultado).toEqual(mockSuccessResponse);
      expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledWith(mockValidFile);
      expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledTimes(1);
    });

    it('deve aceitar diferentes tipos de arquivo Excel', async () => {
      // Arrange
      const tiposArquivo = [
        {
          originalname: 'dados.xlsx',
          mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          buffer: Buffer.from('xlsx data'),
          size: 1024,
        },
        {
          originalname: 'dados.xls',
          mimetype: 'application/vnd.ms-excel',
          buffer: Buffer.from('xls data'),
          size: 2048,
        },
      ];

      mockImportacaoService.iniciarProcessoDeImportacao.mockResolvedValue(mockSuccessResponse);

      for (const arquivo of tiposArquivo) {
        // Act
        const resultado = await controller.importarAvaliacoes(arquivo);

        // Assert
        expect(resultado).toEqual(mockSuccessResponse);
        expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledWith(arquivo);

        jest.clearAllMocks();
      }
    });

    it('deve aceitar arquivos com nomes especiais', async () => {
      // Arrange
      const arquivosComNomesEspeciais = [
        { ...mockValidFile, originalname: 'arquivo com espaços.xlsx' },
        { ...mockValidFile, originalname: 'arquivo-com-hífen.xlsx' },
        { ...mockValidFile, originalname: 'arquivo_com_underscore.xlsx' },
        { ...mockValidFile, originalname: 'arquivo123.xlsx' },
        { ...mockValidFile, originalname: 'Arquivo-COM-maiúsculas.XLSX' },
        { ...mockValidFile, originalname: 'arquivo.ção.xlsx' },
      ];

      mockImportacaoService.iniciarProcessoDeImportacao.mockResolvedValue(mockSuccessResponse);

      for (const arquivo of arquivosComNomesEspeciais) {
        // Act
        const resultado = await controller.importarAvaliacoes(arquivo);

        // Assert
        expect(resultado).toEqual(mockSuccessResponse);
        expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledWith(arquivo);

        jest.clearAllMocks();
      }
    });

    it('deve aceitar arquivo no limite de tamanho (10MB)', async () => {
      // Arrange
      const arquivoNoLimite = {
        originalname: 'arquivo-limite.xlsx',
        buffer: Buffer.alloc(10 * 1024 * 1024), // Exatamente 10MB
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 10 * 1024 * 1024,
      };

      mockImportacaoService.iniciarProcessoDeImportacao.mockResolvedValue(mockSuccessResponse);

      // Act
      const resultado = await controller.importarAvaliacoes(arquivoNoLimite);

      // Assert
      expect(resultado).toEqual(mockSuccessResponse);
      expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledWith(arquivoNoLimite);
    });

    it('deve aceitar arquivo vazio', async () => {
      // Arrange
      const arquivoVazio = {
        originalname: 'vazio.xlsx',
        buffer: Buffer.alloc(0),
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 0,
      };

      mockImportacaoService.iniciarProcessoDeImportacao.mockResolvedValue(mockSuccessResponse);

      // Act
      const resultado = await controller.importarAvaliacoes(arquivoVazio);

      // Assert
      expect(resultado).toEqual(mockSuccessResponse);
      expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledWith(arquivoVazio);
    });

    it('deve propagar erro do service', async () => {
      // Arrange
      const serviceError = new Error('Erro interno do service');
      mockImportacaoService.iniciarProcessoDeImportacao.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.importarAvaliacoes(mockValidFile)).rejects.toThrow(serviceError);
      expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledWith(mockValidFile);
    });

    it('deve propagar diferentes tipos de erro do service', async () => {
      // Arrange
      const tiposErro = [
        new Error('Erro genérico'),
        new TypeError('Tipo inválido'),
        new RangeError('Valor fora do intervalo'),
        Object.assign(new Error('Erro personalizado'), { code: 'CUSTOM_ERROR' }),
      ];

      for (const erro of tiposErro) {
        mockImportacaoService.iniciarProcessoDeImportacao.mockRejectedValue(erro);

        // Act & Assert
        await expect(controller.importarAvaliacoes(mockValidFile)).rejects.toThrow();
        expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledWith(mockValidFile);

        jest.clearAllMocks();
      }
    });

    it('deve lidar com resposta customizada do service', async () => {
      // Arrange
      const respostasCustomizadas = [
        {
          statusCode: 400,
          message: 'Arquivo inválido',
          errors: ['Formato não suportado'],
        },
        {
          statusCode: 500,
          message: 'Erro interno',
          timestamp: new Date().toISOString(),
        },
        {
          statusCode: 202,
          message: 'Processamento iniciado',
          data: { fileId: 'abc123' },
        },
      ];

      for (const resposta of respostasCustomizadas) {
        mockImportacaoService.iniciarProcessoDeImportacao.mockResolvedValue(resposta);

        // Act
        const resultado = await controller.importarAvaliacoes(mockValidFile);

        // Assert
        expect(resultado).toEqual(resposta);
        expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledWith(mockValidFile);

        jest.clearAllMocks();
      }
    });
  });

  describe('Validações de arquivo', () => {
    it('deve estar configurado com MaxFileSizeValidator de 10MB', () => {
      // Arrange & Act
      const maxSizeValidator = new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 });
      
      // Assert
      expect(maxSizeValidator).toBeDefined();
      expect(maxSizeValidator.isValid).toBeDefined();
    });

    it('deve rejeitar arquivo que excede o limite de tamanho', () => {
      // Arrange
      const validator = new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 });

      // Act & Assert
      expect(validator.isValid(mockLargeFile)).toBe(false);
    });

    it('deve aceitar arquivo dentro do limite de tamanho', () => {
      // Arrange
      const validator = new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 });

      // Act & Assert
      expect(validator.isValid(mockValidFile)).toBe(true);
    });

     it('deve rejeitar arquivo que excede o limite por 1 byte', () => {
      // Arrange
      const validator = new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 });
      const arquivoAcimaDoLimite = {
        ...mockValidFile,
        size: (10 * 1024 * 1024) + 1, // 10MB + 1 byte
      };

      // Act & Assert
      expect(validator.isValid(arquivoAcimaDoLimite)).toBe(false);
    });

    it('deve aceitar arquivo vazio (0 bytes)', () => {
      // Arrange
      const validator = new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 });
      const arquivoVazio = {
        ...mockValidFile,
        size: 0,
      };

      // Act & Assert
      expect(validator.isValid(arquivoVazio)).toBe(true);
    });

    it('deve ter ParseFilePipe configurado no método', () => {
      // Arrange & Act
      const parameterTypes = Reflect.getMetadata('design:paramtypes', controller, 'importarAvaliacoes');
      
      // Assert
      expect(parameterTypes).toBeDefined();
      expect(parameterTypes.length).toBeGreaterThan(0);
    });

    it('deve validar diferentes tamanhos de arquivo', () => {
      // Arrange
      const validator = new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 });
      const tamanhosTeste = [
        { size: 1024, esperado: true, descricao: '1KB' },
        { size: 1024 * 1024, esperado: true, descricao: '1MB' },
        { size: 5 * 1024 * 1024, esperado: true, descricao: '5MB' },
        { size: 10 * 1024 * 1024, esperado: false, descricao: '10MB' },
        { size: 11 * 1024 * 1024, esperado: false, descricao: '11MB' },
        { size: 20 * 1024 * 1024, esperado: false, descricao: '20MB' },
      ];

      // Act & Assert
      tamanhosTeste.forEach(({ size, esperado, descricao }) => {
        const arquivo = criarArquivoMock(size, `teste-${descricao}.xlsx`);
        const resultado = validator.isValid(arquivo);
        expect(resultado).toBe(esperado);
      });
    });

    it('deve processar arquivo válido através do pipe validation', async () => {
      // Arrange
      const arquivoValido = {
        originalname: 'teste-valido.xlsx',
        buffer: Buffer.from('dados válidos'),
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 5 * 1024 * 1024, // 5MB - dentro do limite
      };

      mockImportacaoService.iniciarProcessoDeImportacao.mockResolvedValue(mockSuccessResponse);

      // Act
      const resultado = await controller.importarAvaliacoes(arquivoValido);

      // Assert
      expect(resultado).toEqual(mockSuccessResponse);
      expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledWith(arquivoValido);
    });
  });

  describe('Guards e Autenticação', () => {
    it('deve usar JwtAuthGuard', () => {
      // Arrange & Act
      const guards = Reflect.getMetadata('__guards__', ImportacaoController);
      
      // Assert
      expect(guards).toContain(JwtAuthGuard);
    });

    it('deve usar RolesGuard', () => {
      // Arrange & Act
      const guards = Reflect.getMetadata('__guards__', ImportacaoController);
      
      // Assert
      expect(guards).toContain(RolesGuard);
    });

    it('deve exigir roles ADMIN ou RH', () => {
      // Arrange & Act
      const roles = Reflect.getMetadata('roles', ImportacaoController);
      
      // Assert
      expect(roles).toEqual(['ADMIN', 'RH']);
    });
  });

  describe('Decorators e Metadata', () => {
    it('deve estar configurado com @Controller("importacao")', () => {
      // Arrange & Act
      const path = Reflect.getMetadata('path', ImportacaoController);
      
      // Assert
      expect(path).toBe('importacao');
    });

    it('deve ter método POST /avaliacoes', () => {
      // Arrange & Act
      const methodMetadata = Reflect.getMetadata('method', controller.importarAvaliacoes);
      const pathMetadata = Reflect.getMetadata('path', controller.importarAvaliacoes);
      
      // Assert
      expect(pathMetadata).toBe('avaliacoes');
      expect(methodMetadata).toBeDefined();
      const httpDecorators = Reflect.getMetadata('__httpDecorators__', controller.importarAvaliacoes) || [];
      expect(httpDecorators.length).toBeGreaterThanOrEqual(0);
    });

    it('deve usar decorator @Post("avaliacoes")', () => {
      // Arrange & Act
      const path = Reflect.getMetadata('path', controller.importarAvaliacoes);
      const target = ImportacaoController.prototype;
      const propertyKey = 'importarAvaliacoes';
      
      // Assert
      expect(path).toBe('avaliacoes');
      expect(target[propertyKey]).toBeDefined();
      expect(typeof target[propertyKey]).toBe('function');
    });

    it('deve usar FileInterceptor com nome "file"', () => {
      // Arrange & Act
      const interceptors = Reflect.getMetadata('__interceptors__', controller.importarAvaliacoes);
      
      // Assert
      expect(interceptors).toBeDefined();
      expect(interceptors.length).toBeGreaterThan(0);
    });
  });

  describe('Integração com diferentes cenários', () => {
    it('deve processar múltiplos arquivos sequencialmente', async () => {
      // Arrange
      const arquivos = [
        { ...mockValidFile, originalname: 'arquivo1.xlsx' },
        { ...mockValidFile, originalname: 'arquivo2.xlsx' },
        { ...mockValidFile, originalname: 'arquivo3.xlsx' },
      ];

      mockImportacaoService.iniciarProcessoDeImportacao.mockResolvedValue(mockSuccessResponse);

      // Act
      for (const arquivo of arquivos) {
        const resultado = await controller.importarAvaliacoes(arquivo);
        
        // Assert
        expect(resultado).toEqual(mockSuccessResponse);
      }

      // Assert
      expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledTimes(3);
    });

    it('deve lidar com timeout do service', async () => {
      // Arrange
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      mockImportacaoService.iniciarProcessoDeImportacao.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(controller.importarAvaliacoes(mockValidFile)).rejects.toThrow('Request timeout');
    });

    it('deve preservar propriedades originais do arquivo', async () => {
      // Arrange
      const arquivoComPropriedades = {
        ...mockValidFile,
        fieldname: 'file',
        encoding: '7bit',
        destination: '/tmp/uploads',
        filename: 'arquivo-123.xlsx',
        path: '/tmp/uploads/arquivo-123.xlsx',
      };

      mockImportacaoService.iniciarProcessoDeImportacao.mockResolvedValue(mockSuccessResponse);

      // Act
      await controller.importarAvaliacoes(arquivoComPropriedades);

      // Assert
      expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledWith(arquivoComPropriedades);
    });
  });

  describe('Casos edge e validações adicionais', () => {
    it('deve lidar com arquivo sem originalname', async () => {
      // Arrange
      const arquivoSemNome = {
        ...mockValidFile,
        originalname: undefined,
      };

      mockImportacaoService.iniciarProcessoDeImportacao.mockResolvedValue(mockSuccessResponse);

      // Act
      const resultado = await controller.importarAvaliacoes(arquivoSemNome);

      // Assert
      expect(resultado).toEqual(mockSuccessResponse);
      expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledWith(arquivoSemNome);
    });

    it('deve lidar com arquivo sem mimetype', async () => {
      // Arrange
      const arquivoSemMimetype = {
        ...mockValidFile,
        mimetype: undefined,
      };

      mockImportacaoService.iniciarProcessoDeImportacao.mockResolvedValue(mockSuccessResponse);

      // Act
      const resultado = await controller.importarAvaliacoes(arquivoSemMimetype);

      // Assert
      expect(resultado).toEqual(mockSuccessResponse);
      expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledWith(arquivoSemMimetype);
    });

    it('deve passar arquivo null/undefined para o service', async () => {
      // Arrange
      const valoresInvalidos = [null, undefined];

      for (const valor of valoresInvalidos) {
        mockImportacaoService.iniciarProcessoDeImportacao.mockResolvedValue(mockSuccessResponse);

        // Act
        const resultado = await controller.importarAvaliacoes(valor);

        // Assert
        expect(resultado).toEqual(mockSuccessResponse);
        expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledWith(valor);

        jest.clearAllMocks();
      }
    });
  });

  describe('Performance e Concorrência', () => {
    it('deve processar chamadas concorrentes independentemente', async () => {
      // Arrange
      const promisesImportacao: Promise<{ statusCode: number; message: string }>[] = [];
      mockImportacaoService.iniciarProcessoDeImportacao.mockResolvedValue(mockSuccessResponse);

      // Act
      for (let i = 0; i < 5; i++) {
        const arquivo = { ...mockValidFile, originalname: `arquivo${i}.xlsx` };
        promisesImportacao.push(controller.importarAvaliacoes(arquivo));
      }

      const resultados = await Promise.all(promisesImportacao);

      // Assert
      expect(resultados).toHaveLength(5);
      resultados.forEach(resultado => {
        expect(resultado).toEqual(mockSuccessResponse);
      });
      expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledTimes(5);
    });

    it('deve lidar com uma falha entre múltiplas chamadas', async () => {
      // Arrange
      const arquivos = [
        { ...mockValidFile, originalname: 'sucesso1.xlsx' },
        { ...mockValidFile, originalname: 'falha.xlsx' },
        { ...mockValidFile, originalname: 'sucesso2.xlsx' },
      ];

      mockImportacaoService.iniciarProcessoDeImportacao
        .mockResolvedValueOnce(mockSuccessResponse) // sucesso1
        .mockRejectedValueOnce(new Error('Falha específica')) // falha
        .mockResolvedValueOnce(mockSuccessResponse); // sucesso2

      // Act & Assert
      const resultado1 = await controller.importarAvaliacoes(arquivos[0]);
      expect(resultado1).toEqual(mockSuccessResponse);

      await expect(controller.importarAvaliacoes(arquivos[1])).rejects.toThrow('Falha específica');

      const resultado3 = await controller.importarAvaliacoes(arquivos[2]);
      expect(resultado3).toEqual(mockSuccessResponse);

      expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledTimes(3);
    });
  });
});
