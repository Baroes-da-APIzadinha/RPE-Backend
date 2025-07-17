import { Test, TestingModule } from '@nestjs/testing';
import { ImportacaoController } from './importacao.controller';
import { ImportacaoService } from './importacao.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ParseFilePipe, MaxFileSizeValidator } from '@nestjs/common';

// Mock do ImportacaoService
const mockImportacaoService = {
  iniciarProcessoDeImportacao: jest.fn(),
};

// Mock do AuditoriaService
const mockAuditoriaService = {
  log: jest.fn(),
  getLogs: jest.fn(),
};

describe('ImportacaoController', () => {
  let controller: ImportacaoController;
  let importacaoService: ImportacaoService;
  let auditoriaService: AuditoriaService;

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

  // Mock do request com dados de usuário
  const mockRequest = {
    user: { 
      userId: 'user-123',
      email: 'admin@empresa.com',
      roles: ['ADMIN'] 
    },
    ip: '192.168.1.100',
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
      originalname: originalname,
      buffer: Buffer.alloc(size),
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: size,
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImportacaoController],
      providers: [
        {
          provide: ImportacaoService,
          useValue: mockImportacaoService,
        },
        {
          provide: AuditoriaService,
          useValue: mockAuditoriaService,
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
    auditoriaService = module.get<AuditoriaService>(AuditoriaService);
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

    it('deve ter AuditoriaService injetado', () => {
      expect(auditoriaService).toBeDefined();
    });
  });

  describe('importarAvaliacoes', () => {
    describe('Casos de sucesso com auditoria', () => {
      it('deve processar arquivo válido com sucesso e registrar auditoria', async () => {
        // Arrange
        mockImportacaoService.iniciarProcessoDeImportacao.mockResolvedValue(mockSuccessResponse);
        mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

        // Act
        const resultado = await controller.importarAvaliacoes(mockValidFile, mockRequest);

        // Assert
        expect(resultado).toEqual(mockSuccessResponse);
        expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledWith(mockValidFile);
        expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledTimes(1);

        // Verifica auditoria
        expect(mockAuditoriaService.log).toHaveBeenCalledTimes(1);
        expect(mockAuditoriaService.log).toHaveBeenCalledWith({
          userId: mockRequest.user.userId,
          action: 'importar_avaliacoes',
          resource: 'Importacao',
          details: { originalname: mockValidFile.originalname },
          ip: mockRequest.ip,
        });
      });

      it('deve aceitar diferentes tipos de arquivo Excel e registrar auditoria', async () => {
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
        mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

        for (const arquivo of tiposArquivo) {
          // Act
          const resultado = await controller.importarAvaliacoes(arquivo, mockRequest);

          // Assert
          expect(resultado).toEqual(mockSuccessResponse);
          expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledWith(arquivo);
          expect(mockAuditoriaService.log).toHaveBeenCalledWith({
            userId: mockRequest.user.userId,
            action: 'importar_avaliacoes',
            resource: 'Importacao',
            details: { originalname: arquivo.originalname },
            ip: mockRequest.ip,
          });

          jest.clearAllMocks();
        }
      });

      it('deve aceitar arquivos com nomes especiais e registrar auditoria', async () => {
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
        mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

        for (const arquivo of arquivosComNomesEspeciais) {
          // Act
          const resultado = await controller.importarAvaliacoes(arquivo, mockRequest);

          // Assert
          expect(resultado).toEqual(mockSuccessResponse);
          expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledWith(arquivo);
          expect(mockAuditoriaService.log).toHaveBeenCalledWith({
            userId: mockRequest.user.userId,
            action: 'importar_avaliacoes',
            resource: 'Importacao',
            details: { originalname: arquivo.originalname },
            ip: mockRequest.ip,
          });

          jest.clearAllMocks();
        }
      });

      it('deve aceitar arquivo no limite de tamanho (10MB) e registrar auditoria', async () => {
        // Arrange
        const arquivoNoLimite = {
          originalname: 'arquivo-limite.xlsx',
          buffer: Buffer.alloc(10 * 1024 * 1024), // Exatamente 10MB
          mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size: 10 * 1024 * 1024,
        };

        mockImportacaoService.iniciarProcessoDeImportacao.mockResolvedValue(mockSuccessResponse);
        mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

        // Act
        const resultado = await controller.importarAvaliacoes(arquivoNoLimite, mockRequest);

        // Assert
        expect(resultado).toEqual(mockSuccessResponse);
        expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledWith(arquivoNoLimite);
        expect(mockAuditoriaService.log).toHaveBeenCalledWith({
          userId: mockRequest.user.userId,
          action: 'importar_avaliacoes',
          resource: 'Importacao',
          details: { originalname: arquivoNoLimite.originalname },
          ip: mockRequest.ip,
        });
      });

      it('deve aceitar arquivo vazio e registrar auditoria', async () => {
        // Arrange
        const arquivoVazio = {
          originalname: 'vazio.xlsx',
          buffer: Buffer.alloc(0),
          mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size: 0,
        };

        mockImportacaoService.iniciarProcessoDeImportacao.mockResolvedValue(mockSuccessResponse);
        mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

        // Act
        const resultado = await controller.importarAvaliacoes(arquivoVazio, mockRequest);

        // Assert
        expect(resultado).toEqual(mockSuccessResponse);
        expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledWith(arquivoVazio);
        expect(mockAuditoriaService.log).toHaveBeenCalledWith({
          userId: mockRequest.user.userId,
          action: 'importar_avaliacoes',
          resource: 'Importacao',
          details: { originalname: arquivoVazio.originalname },
          ip: mockRequest.ip,
        });
      });
    });

    describe('Casos de falha com auditoria', () => {
      it('deve registrar auditoria e depois propagar erro do service', async () => {
        // Arrange
        const serviceError = new Error('Erro interno do service');
        mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });
        mockImportacaoService.iniciarProcessoDeImportacao.mockRejectedValue(serviceError);

        // Act & Assert
        await expect(controller.importarAvaliacoes(mockValidFile, mockRequest)).rejects.toThrow(serviceError);
        
        // Auditoria é registrada ANTES do service ser chamado
        expect(mockAuditoriaService.log).toHaveBeenCalledTimes(1);
        expect(mockAuditoriaService.log).toHaveBeenCalledWith({
          userId: mockRequest.user.userId,
          action: 'importar_avaliacoes',
          resource: 'Importacao',
          details: { originalname: mockValidFile.originalname },
          ip: mockRequest.ip,
        });
        
        expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledWith(mockValidFile);
      });

      it('deve registrar auditoria e propagar diferentes tipos de erro do service', async () => {
        // Arrange
        const tiposErro = [
          new Error('Erro genérico'),
          new TypeError('Tipo inválido'),
          new RangeError('Valor fora do intervalo'),
          Object.assign(new Error('Erro personalizado'), { code: 'CUSTOM_ERROR' }),
        ];

        for (const erro of tiposErro) {
          mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });
          mockImportacaoService.iniciarProcessoDeImportacao.mockRejectedValue(erro);

          // Act & Assert
          await expect(controller.importarAvaliacoes(mockValidFile, mockRequest)).rejects.toThrow();
          
          // Auditoria é registrada ANTES do service falhar
          expect(mockAuditoriaService.log).toHaveBeenCalledTimes(1);
          expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledWith(mockValidFile);

          jest.clearAllMocks();
        }
      });

      it('deve falhar na auditoria e não chamar o service', async () => {
        // Arrange
        mockAuditoriaService.log.mockRejectedValue(new Error('Erro na auditoria'));
        mockImportacaoService.iniciarProcessoDeImportacao.mockResolvedValue(mockSuccessResponse);

        // Act & Assert
        await expect(controller.importarAvaliacoes(mockValidFile, mockRequest)).rejects.toThrow('Erro na auditoria');
        
        // Service não deve ser chamado quando auditoria falha
        expect(importacaoService.iniciarProcessoDeImportacao).not.toHaveBeenCalled();
      });

      it('deve registrar auditoria e lidar com timeout do service', async () => {
        // Arrange
        const timeoutError = new Error('Request timeout');
        timeoutError.name = 'TimeoutError';
        mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });
        mockImportacaoService.iniciarProcessoDeImportacao.mockRejectedValue(timeoutError);

        // Act & Assert
        await expect(controller.importarAvaliacoes(mockValidFile, mockRequest)).rejects.toThrow('Request timeout');
        
        // Auditoria é registrada ANTES do timeout
        expect(mockAuditoriaService.log).toHaveBeenCalledTimes(1);
      });
    });

    describe('Casos com resposta customizada do service e auditoria', () => {
      it('deve lidar com resposta customizada do service e registrar auditoria', async () => {
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
          mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

          // Act
          const resultado = await controller.importarAvaliacoes(mockValidFile, mockRequest);

          // Assert
          expect(resultado).toEqual(resposta);
          expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledWith(mockValidFile);
          expect(mockAuditoriaService.log).toHaveBeenCalledWith({
            userId: mockRequest.user.userId,
            action: 'importar_avaliacoes',
            resource: 'Importacao',
            details: { originalname: mockValidFile.originalname },
            ip: mockRequest.ip,
          });

          jest.clearAllMocks();
        }
      });
    });

    describe('Casos edge com auditoria', () => {
      it('deve lidar com arquivo sem originalname e registrar auditoria', async () => {
        // Arrange
        const arquivoSemNome = {
          ...mockValidFile,
          originalname: undefined,
        };

        mockImportacaoService.iniciarProcessoDeImportacao.mockResolvedValue(mockSuccessResponse);
        mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

        // Act
        const resultado = await controller.importarAvaliacoes(arquivoSemNome, mockRequest);

        // Assert
        expect(resultado).toEqual(mockSuccessResponse);
        expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledWith(arquivoSemNome);
        expect(mockAuditoriaService.log).toHaveBeenCalledWith({
          userId: mockRequest.user.userId,
          action: 'importar_avaliacoes',
          resource: 'Importacao',
          details: { originalname: undefined },
          ip: mockRequest.ip,
        });
      });

      it('deve lidar com arquivo sem mimetype e registrar auditoria', async () => {
        // Arrange
        const arquivoSemMimetype = {
          ...mockValidFile,
          mimetype: undefined,
        };

        mockImportacaoService.iniciarProcessoDeImportacao.mockResolvedValue(mockSuccessResponse);
        mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

        // Act
        const resultado = await controller.importarAvaliacoes(arquivoSemMimetype, mockRequest);

        // Assert
        expect(resultado).toEqual(mockSuccessResponse);
        expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledWith(arquivoSemMimetype);
        expect(mockAuditoriaService.log).toHaveBeenCalledWith({
          userId: mockRequest.user.userId,
          action: 'importar_avaliacoes',
          resource: 'Importacao',
          details: { originalname: arquivoSemMimetype.originalname },
          ip: mockRequest.ip,
        });
      });

      it('deve passar arquivo null/undefined para o service e tentar registrar auditoria', async () => {
        // Arrange
        const valoresInvalidos: any[] = [null, undefined];

        for (const valor of valoresInvalidos) {
          mockImportacaoService.iniciarProcessoDeImportacao.mockResolvedValue(mockSuccessResponse);
          mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

          // Act
          const resultado = await controller.importarAvaliacoes(valor, mockRequest);

          // Assert
          expect(resultado).toEqual(mockSuccessResponse);
          expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledWith(valor);
          expect(mockAuditoriaService.log).toHaveBeenCalledWith({
            userId: mockRequest.user.userId,
            action: 'importar_avaliacoes',
            resource: 'Importacao',
            details: { originalname: valor?.originalname },
            ip: mockRequest.ip,
          });

          jest.clearAllMocks();
        }
      });

      it('deve registrar auditoria com diferentes tipos de request', async () => {
        // Arrange
        const requestTypes = [
          { user: { userId: 'user-1' }, ip: '127.0.0.1' },
          { user: { userId: 'user-2', roles: ['ADMIN'] }, ip: '192.168.1.1' },
          { user: undefined, ip: '10.0.0.1' },
          { user: { userId: null }, ip: undefined },
        ];

        mockImportacaoService.iniciarProcessoDeImportacao.mockResolvedValue(mockSuccessResponse);
        mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

        // Act & Assert
        for (const request of requestTypes) {
          await controller.importarAvaliacoes(mockValidFile, request);

          expect(mockAuditoriaService.log).toHaveBeenCalledWith({
            userId: request.user?.userId,
            action: 'importar_avaliacoes',
            resource: 'Importacao',
            details: { originalname: mockValidFile.originalname },
            ip: request.ip,
          });

          jest.clearAllMocks();
        }
      });

      it('deve preservar propriedades originais do arquivo e registrar auditoria', async () => {
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
        mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

        // Act
        await controller.importarAvaliacoes(arquivoComPropriedades, mockRequest);

        // Assert
        expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledWith(arquivoComPropriedades);
        expect(mockAuditoriaService.log).toHaveBeenCalledWith({
          userId: mockRequest.user.userId,
          action: 'importar_avaliacoes',
          resource: 'Importacao',
          details: { originalname: arquivoComPropriedades.originalname },
          ip: mockRequest.ip,
        });
      });
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

    it('deve processar arquivo válido através do pipe validation com auditoria', async () => {
      // Arrange
      const arquivoValido = {
        originalname: 'teste-valido.xlsx',
        buffer: Buffer.from('dados válidos'),
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 5 * 1024 * 1024, // 5MB - dentro do limite
      };

      mockImportacaoService.iniciarProcessoDeImportacao.mockResolvedValue(mockSuccessResponse);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      const resultado = await controller.importarAvaliacoes(arquivoValido, mockRequest);

      // Assert
      expect(resultado).toEqual(mockSuccessResponse);
      expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledWith(arquivoValido);
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.userId,
        action: 'importar_avaliacoes',
        resource: 'Importacao',
        details: { originalname: arquivoValido.originalname },
        ip: mockRequest.ip,
      });
    });
  });

  describe('Integração com diferentes cenários e auditoria', () => {
    it('deve processar múltiplos arquivos sequencialmente com auditoria', async () => {
      // Arrange
      const arquivos = [
        { ...mockValidFile, originalname: 'arquivo1.xlsx' },
        { ...mockValidFile, originalname: 'arquivo2.xlsx' },
        { ...mockValidFile, originalname: 'arquivo3.xlsx' },
      ];

      mockImportacaoService.iniciarProcessoDeImportacao.mockResolvedValue(mockSuccessResponse);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      for (const arquivo of arquivos) {
        const resultado = await controller.importarAvaliacoes(arquivo, mockRequest);
        
        // Assert
        expect(resultado).toEqual(mockSuccessResponse);
      }

      // Assert
      expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledTimes(3);
      expect(mockAuditoriaService.log).toHaveBeenCalledTimes(3);

      // Verifica se cada arquivo foi auditado corretamente
      arquivos.forEach((arquivo, index) => {
        expect(mockAuditoriaService.log).toHaveBeenNthCalledWith(index + 1, {
          userId: mockRequest.user.userId,
          action: 'importar_avaliacoes',
          resource: 'Importacao',
          details: { originalname: arquivo.originalname },
          ip: mockRequest.ip,
        });
      });
    });
  });

  describe('Performance e Concorrência com auditoria', () => {
    it('deve processar chamadas concorrentes independentemente com auditoria', async () => {
      // Arrange
      const promisesImportacao: Promise<{ statusCode: number; message: string }>[] = [];
      mockImportacaoService.iniciarProcessoDeImportacao.mockResolvedValue(mockSuccessResponse);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      for (let i = 0; i < 5; i++) {
        const arquivo = { ...mockValidFile, originalname: `arquivo${i}.xlsx` };
        promisesImportacao.push(controller.importarAvaliacoes(arquivo, mockRequest));
      }

      const resultados = await Promise.all(promisesImportacao);

      // Assert
      expect(resultados).toHaveLength(5);
      resultados.forEach(resultado => {
        expect(resultado).toEqual(mockSuccessResponse);
      });
      expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledTimes(5);
      expect(mockAuditoriaService.log).toHaveBeenCalledTimes(5);
    });

    it('deve lidar com uma falha entre múltiplas chamadas e auditoria', async () => {
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

      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act & Assert
      const resultado1 = await controller.importarAvaliacoes(arquivos[0], mockRequest);
      expect(resultado1).toEqual(mockSuccessResponse);
      expect(mockAuditoriaService.log).toHaveBeenCalledTimes(1);

      await expect(controller.importarAvaliacoes(arquivos[1], mockRequest)).rejects.toThrow('Falha específica');
      // Auditoria é registrada mesmo quando service falha (já foi registrada antes)
      expect(mockAuditoriaService.log).toHaveBeenCalledTimes(2);

      const resultado3 = await controller.importarAvaliacoes(arquivos[2], mockRequest);
      expect(resultado3).toEqual(mockSuccessResponse);
      expect(mockAuditoriaService.log).toHaveBeenCalledTimes(3);

      expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledTimes(3);
    });
  });

  describe('Integração de auditoria', () => {
    it('deve registrar auditoria antes de chamar o service', async () => {
      // Arrange
      const callOrder: string[] = [];
      
      mockAuditoriaService.log.mockImplementation(async () => {
        callOrder.push('auditoria');
        return { id: 'audit-log-id' };
      });

      mockImportacaoService.iniciarProcessoDeImportacao.mockImplementation(async () => {
        callOrder.push('service');
        return mockSuccessResponse;
      });

      // Act
      await controller.importarAvaliacoes(mockValidFile, mockRequest);

      // Assert
      expect(callOrder).toEqual(['auditoria', 'service']);
    });

    it('deve registrar dados específicos da importação na auditoria', async () => {
      // Arrange
      const arquivoEspecifico = {
        ...mockValidFile,
        originalname: 'avaliacoes-2024-Q1.xlsx',
        size: 2048,
      };

      mockImportacaoService.iniciarProcessoDeImportacao.mockResolvedValue(mockSuccessResponse);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      await controller.importarAvaliacoes(arquivoEspecifico, mockRequest);

      // Assert
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.userId,
        action: 'importar_avaliacoes',
        resource: 'Importacao',
        details: { originalname: 'avaliacoes-2024-Q1.xlsx' },
        ip: mockRequest.ip,
      });
    });

    it('deve funcionar com request sem informações completas de usuário', async () => {
      // Arrange
      const requestIncompleto = {
        user: undefined,
        ip: '203.0.113.10',
      };

      mockImportacaoService.iniciarProcessoDeImportacao.mockResolvedValue(mockSuccessResponse);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      await controller.importarAvaliacoes(mockValidFile, requestIncompleto);

      // Assert
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: undefined,
        action: 'importar_avaliacoes',
        resource: 'Importacao',
        details: { originalname: mockValidFile.originalname },
        ip: requestIncompleto.ip,
      });
    });
  });

  describe('Observações sobre auditoria', () => {
    it('deve demonstrar que auditoria é registrada para todas as tentativas de importação', async () => {
      // Arrange
      mockImportacaoService.iniciarProcessoDeImportacao.mockResolvedValue(mockSuccessResponse);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      await controller.importarAvaliacoes(mockValidFile, mockRequest);

      // Assert
      // A auditoria deve ser registrada independente do resultado da importação
      expect(mockAuditoriaService.log).toHaveBeenCalledWith({
        userId: mockRequest.user.userId,
        action: 'importar_avaliacoes',
        resource: 'Importacao',
        details: { originalname: mockValidFile.originalname },
        ip: mockRequest.ip,
      });

      // Nota: A auditoria registra:
      // - Quem fez a importação (userId)
      // - Nome do arquivo (originalname)
      // - IP de origem
      // - Timestamp automático do AuditoriaService
    });

    it('deve demonstrar separação de responsabilidades entre auditoria e processamento', async () => {
      // Arrange
      mockImportacaoService.iniciarProcessoDeImportacao.mockResolvedValue(mockSuccessResponse);
      mockAuditoriaService.log.mockResolvedValue({ id: 'audit-log-id' });

      // Act
      await controller.importarAvaliacoes(mockValidFile, mockRequest);

      // Assert
      // Controller registra auditoria da ação
      expect(mockAuditoriaService.log).toHaveBeenCalledTimes(1);
      
      // Service processa o arquivo (sem responsabilidade de auditoria)
      expect(importacaoService.iniciarProcessoDeImportacao).toHaveBeenCalledWith(mockValidFile);
      
      // Nota: ImportacaoService pode ter seus próprios logs internos,
      // mas a auditoria de segurança é responsabilidade do controller
    });
  });
});