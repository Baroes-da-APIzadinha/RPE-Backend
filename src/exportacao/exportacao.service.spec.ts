import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ExportacaoService } from './exportacao.service';
import { PrismaService } from '../database/prismaService';
import * as xlsx from 'xlsx';

describe('ExportacaoService', () => {
  let service: ExportacaoService;
  let prismaService: PrismaService;

  // Mock do PrismaService
  const mockPrismaService = {
    cicloAvaliacao: {
      findUnique: jest.fn(),
    },
    avaliacao: {
      count: jest.fn(),
    },
    colaboradorCiclo: {
      count: jest.fn(),
    },
    colaborador: {
      findMany: jest.fn(),
    },
  };

  // Dados de teste
  const mockCiclo = {
    idCiclo: 'ciclo-123',
    nomeCiclo: 'Avaliação Q1 2025',
    dataInicio: new Date('2025-01-01'),
    dataFim: new Date('2025-03-31'),
    status: 'EM_ANDAMENTO',
  };

  const mockColaboradores = [
    {
      nomeCompleto: 'João Silva',
      email: 'joao@empresa.com',
      equalizacoesAlvo: [
        {
          notaAjustada: 8.5,
          justificativa: 'Excelente desempenho técnico',
        },
      ],
    },
    {
      nomeCompleto: 'Maria Santos',
      email: 'maria@empresa.com',
      equalizacoesAlvo: [
        {
          notaAjustada: 7.2,
          justificativa: 'Bom desenvolvimento de habilidades',
        },
      ],
    },
    {
      nomeCompleto: 'Pedro Costa',
      email: 'pedro@empresa.com',
      equalizacoesAlvo: [], // Sem equalização
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportacaoService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ExportacaoService>(ExportacaoService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Definição do service', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('deve ter PrismaService injetado', () => {
      expect(prismaService).toBeDefined();
    });
  });

  describe('exportarDadosDoCiclo', () => {
    it('deve exportar dados do ciclo com sucesso', async () => {
      // Arrange
      const idCiclo = 'ciclo-123';
      
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.count
        .mockResolvedValueOnce(50) // Total de avaliações
        .mockResolvedValueOnce(35); // Total concluídas
      mockPrismaService.colaboradorCiclo.count.mockResolvedValue(10); // Total participantes
      mockPrismaService.colaborador.findMany.mockResolvedValue(mockColaboradores);

      // Act
      const result = await service.exportarDadosDoCiclo(idCiclo);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);

      // Verifica se as consultas foram feitas corretamente
      expect(mockPrismaService.cicloAvaliacao.findUnique).toHaveBeenCalledWith({
        where: { idCiclo },
      });

      expect(mockPrismaService.avaliacao.count).toHaveBeenCalledWith({
        where: { idCiclo },
      });

      expect(mockPrismaService.avaliacao.count).toHaveBeenCalledWith({
        where: { idCiclo, status: 'CONCLUIDA' },
      });

      expect(mockPrismaService.colaboradorCiclo.count).toHaveBeenCalledWith({
        where: { idCiclo },
      });

      expect(mockPrismaService.colaborador.findMany).toHaveBeenCalledWith({
        where: {
          colaboradoresCiclos: {
            some: { idCiclo },
          },
        },
        select: {
          nomeCompleto: true,
          email: true,
          equalizacoesAlvo: {
            where: { idCiclo },
            select: {
              notaAjustada: true,
              justificativa: true,
            },
          },
        },
      });
    });

    it('deve lançar NotFoundException quando ciclo não existe', async () => {
      // Arrange
      const idCiclo = 'ciclo-inexistente';
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.exportarDadosDoCiclo(idCiclo)).rejects.toThrow(
        new NotFoundException(`Ciclo com ID "${idCiclo}" não encontrado.`)
      );

      expect(mockPrismaService.cicloAvaliacao.findUnique).toHaveBeenCalledWith({
        where: { idCiclo },
      });

      // Verifica que outras consultas não foram executadas
      expect(mockPrismaService.avaliacao.count).not.toHaveBeenCalled();
      expect(mockPrismaService.colaboradorCiclo.count).not.toHaveBeenCalled();
      expect(mockPrismaService.colaborador.findMany).not.toHaveBeenCalled();
    });

    it('deve gerar Excel com estrutura correta', async () => {
      // Arrange
      const idCiclo = 'ciclo-123';
      
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(75);
      mockPrismaService.colaboradorCiclo.count.mockResolvedValue(20);
      mockPrismaService.colaborador.findMany.mockResolvedValue(mockColaboradores);

      // Act
      const buffer = await service.exportarDadosDoCiclo(idCiclo);

      // Assert - Verifica se é um arquivo Excel válido
      expect(buffer).toBeInstanceOf(Buffer);
      
      // Lê o arquivo Excel gerado para validar a estrutura
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      
      // Verifica se as abas foram criadas
      expect(workbook.SheetNames).toContain('Resumo do Ciclo');
      expect(workbook.SheetNames).toContain('Detalhes por Colaborador');
      expect(workbook.SheetNames).toHaveLength(2);

      // Verifica o conteúdo da aba Resumo
      const resumoSheet = workbook.Sheets['Resumo do Ciclo'];
      const resumoData = xlsx.utils.sheet_to_json(resumoSheet);
      expect(resumoData[0]).toEqual(
        expect.objectContaining({
          'Nome do Ciclo': 'Avaliação Q1 2025',
          'Status': 'EM_ANDAMENTO',
          'Total de Participantes': 20,
          'Total de Avaliações Lançadas': 100,
          'Total de Avaliações Concluídas': 75,
        })
      );

      // Verifica o conteúdo da aba Detalhes
      const detalhesSheet = workbook.Sheets['Detalhes por Colaborador'];
      const detalhesData = xlsx.utils.sheet_to_json(detalhesSheet);
      
      expect(detalhesData).toHaveLength(3);
      expect(detalhesData[0]).toEqual({
        'Nome do Colaborador': 'João Silva',
        'Email': 'joao@empresa.com',
        'Nota do Comitê': 8.5,
        'Justificativa do Comitê': 'Excelente desempenho técnico',
      });
    });

    it('deve tratar colaboradores sem equalização', async () => {
      // Arrange
      const idCiclo = 'ciclo-123';
      const colaboradoresSemEqualizacao = [
        {
          nomeCompleto: 'Ana Silva',
          email: 'ana@empresa.com',
          equalizacoesAlvo: [], // Sem equalização
        },
      ];

      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3);
      mockPrismaService.colaboradorCiclo.count.mockResolvedValue(1);
      mockPrismaService.colaborador.findMany.mockResolvedValue(colaboradoresSemEqualizacao);

      // Act
      const buffer = await service.exportarDadosDoCiclo(idCiclo);

      // Assert
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const detalhesSheet = workbook.Sheets['Detalhes por Colaborador'];
      const detalhesData = xlsx.utils.sheet_to_json(detalhesSheet);

      expect(detalhesData[0]).toEqual({
        'Nome do Colaborador': 'Ana Silva',
        'Email': 'ana@empresa.com',
        'Nota do Comitê': 'N/A',
        'Justificativa do Comitê': 'N/A',
      });
    });

    it('deve tratar ciclo sem colaboradores', async () => {
      // Arrange
      const idCiclo = 'ciclo-vazio';
      
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrismaService.colaboradorCiclo.count.mockResolvedValue(0);
      mockPrismaService.colaborador.findMany.mockResolvedValue([]);

      // Act
      const buffer = await service.exportarDadosDoCiclo(idCiclo);

      // Assert
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const detalhesSheet = workbook.Sheets['Detalhes por Colaborador'];
      const detalhesData = xlsx.utils.sheet_to_json(detalhesSheet);

      expect(detalhesData).toHaveLength(0);

      // Verifica aba de resumo ainda existe
      const resumoSheet = workbook.Sheets['Resumo do Ciclo'];
      const resumoData = xlsx.utils.sheet_to_json(resumoSheet);
      expect(resumoData[0]).toEqual(
        expect.objectContaining({
          'Total de Participantes': 0,
          'Total de Avaliações Lançadas': 0,
          'Total de Avaliações Concluídas': 0,
        })
      );
    });

    it('deve formatar datas corretamente na aba resumo', async () => {
      // Arrange
      const idCiclo = 'ciclo-123';
      const cicloComDatas = {
        ...mockCiclo,
        dataInicio: new Date('2025-07-01'),
        dataFim: new Date('2025-09-30'),
      };
      
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(cicloComDatas);
      mockPrismaService.avaliacao.count
        .mockResolvedValueOnce(25)
        .mockResolvedValueOnce(20);
      mockPrismaService.colaboradorCiclo.count.mockResolvedValue(5);
      mockPrismaService.colaborador.findMany.mockResolvedValue([]);

      // Act
      const buffer = await service.exportarDadosDoCiclo(idCiclo);

      // Assert
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const resumoSheet = workbook.Sheets['Resumo do Ciclo'];
      const resumoData = xlsx.utils.sheet_to_json(resumoSheet);

      const resumoRow = resumoData[0] as Record<string, any>;
      expect(resumoRow['Data de Início']).toBe('30/06/2025');
      expect(resumoRow['Data de Fim']).toBe('29/09/2025');
    });

    it('deve propagar erro do banco de dados', async () => {
      // Arrange
      const idCiclo = 'ciclo-123';
      const dbError = new Error('Database connection failed');
      
      mockPrismaService.cicloAvaliacao.findUnique.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.exportarDadosDoCiclo(idCiclo)).rejects.toThrow(dbError);
    });

    it('deve tratar erro na busca de avaliações', async () => {
      // Arrange
      const idCiclo = 'ciclo-123';
      const avaliacaoError = new Error('Erro ao buscar avaliações');
      
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.count.mockRejectedValue(avaliacaoError);

      // Act & Assert
      await expect(service.exportarDadosDoCiclo(idCiclo)).rejects.toThrow(avaliacaoError);
    });

    it('deve tratar erro na busca de colaboradores', async () => {
      // Arrange
      const idCiclo = 'ciclo-123';
      const colaboradorError = new Error('Erro ao buscar colaboradores');
      
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(8);
      mockPrismaService.colaboradorCiclo.count.mockResolvedValue(5);
      mockPrismaService.colaborador.findMany.mockRejectedValue(colaboradorError);

      // Act & Assert
      await expect(service.exportarDadosDoCiclo(idCiclo)).rejects.toThrow(colaboradorError);
    });
  });

  describe('Validações de dados e edge cases', () => {
    it('deve funcionar com diferentes status de ciclo', async () => {
      // Arrange
      const statusList = ['PLANEJADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'];
      
      for (const status of statusList) {
        const cicloComStatus = { ...mockCiclo, status };
        
        mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(cicloComStatus);
        mockPrismaService.avaliacao.count
          .mockResolvedValueOnce(10)
          .mockResolvedValueOnce(5);
        mockPrismaService.colaboradorCiclo.count.mockResolvedValue(3);
        mockPrismaService.colaborador.findMany.mockResolvedValue([]);

        // Act
        const buffer = await service.exportarDadosDoCiclo('test-ciclo');

        // Assert
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const resumoSheet = workbook.Sheets['Resumo do Ciclo'];
        const resumoData = xlsx.utils.sheet_to_json(resumoSheet);
        
        const resumoRow = resumoData[0] as Record<string, any>;
        expect(resumoRow['Status']).toBe(status);

        // Reset mocks for next iteration
        jest.clearAllMocks();
      }
    });

    it('deve gerar arquivo com tamanho adequado', async () => {
      // Arrange
      const idCiclo = 'ciclo-123';
      
      mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue(mockCiclo);
      mockPrismaService.avaliacao.count
        .mockResolvedValueOnce(1000)
        .mockResolvedValueOnce(850);
      mockPrismaService.colaboradorCiclo.count.mockResolvedValue(100);
      mockPrismaService.colaborador.findMany.mockResolvedValue(mockColaboradores);

      // Act
      const buffer = await service.exportarDadosDoCiclo(idCiclo);

      // Assert
      expect(buffer.length).toBeGreaterThan(1000); // Arquivo deve ter tamanho razoável
      expect(buffer.length).toBeLessThan(1000000); // Mas não excessivamente grande
    });

    it('deve tratar IDs especiais corretamente', async () => {
      // Arrange
      const idsEspeciais = [
        'ciclo-com-hifens',
        'ciclo_com_underscores',
        'CICLO-MAIUSCULO',
        '123-ciclo-numerico',
      ];

      for (const idEspecial of idsEspeciais) {
        mockPrismaService.cicloAvaliacao.findUnique.mockResolvedValue({
          ...mockCiclo,
          idCiclo: idEspecial,
        });
        mockPrismaService.avaliacao.count
          .mockResolvedValueOnce(5)
          .mockResolvedValueOnce(3);
        mockPrismaService.colaboradorCiclo.count.mockResolvedValue(2);
        mockPrismaService.colaborador.findMany.mockResolvedValue([]);

        // Act & Assert
        await expect(service.exportarDadosDoCiclo(idEspecial)).resolves.toBeInstanceOf(Buffer);

        // Reset mocks for next iteration
        jest.clearAllMocks();
      }
    });
  });
});
