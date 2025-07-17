import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { IaController } from './ia.controller';
import { IaService } from './ia.service';

describe('IaController', () => {
  let controller: IaController;
  let iaService: jest.Mocked<IaService>;

  const mockIaService = {
    avaliarColaborador: jest.fn(),
    getAvaliacoesIA: jest.fn(),
    miniAvaliarColaborador: jest.fn(),
    getAll_Infos_Colaborador: jest.fn(),
    gerarBrutalFacts: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IaController],
      providers: [
        {
          provide: IaService,
          useValue: mockIaService,
        },
      ],
    }).compile();

    controller = module.get<IaController>(IaController);
    iaService = module.get(IaService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('Definição do controller', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('avaliarColaborador', () => {
    it('deve avaliar colaborador com sucesso', async () => {
      const mockResult = 'Análise completa do colaborador';
      iaService.avaliarColaborador.mockResolvedValue(mockResult);

      const result = await controller.avaliarColaborador('123', '456');

      expect(result).toBe(mockResult);
      expect(iaService.avaliarColaborador).toHaveBeenCalledWith('123', '456');
      expect(iaService.avaliarColaborador).toHaveBeenCalledTimes(1);
    });

    it('deve propagar erro do service', async () => {
      const mockError = new BadRequestException('Erro no service');
      iaService.avaliarColaborador.mockRejectedValue(mockError);

      await expect(controller.avaliarColaborador('123', '456')).rejects.toThrow(mockError);
      expect(iaService.avaliarColaborador).toHaveBeenCalledWith('123', '456');
    });

    it('deve logar erro antes de propagar', async () => {
      const mockError = new Error('Erro genérico');
      iaService.avaliarColaborador.mockRejectedValue(mockError);

      await expect(controller.avaliarColaborador('123', '456')).rejects.toThrow(mockError);
      expect(console.error).toHaveBeenCalledWith('Erro ao avaliar colaborador:', mockError);
    });
  });

  describe('getAvaliacoesIA', () => {
    it('deve retornar avaliações com sucesso', async () => {
      const mockAvaliacoes: any[] = [
        { 
          id: 'av-1', 
          tipoAvaliacao: 'AUTOAVALIACAO',
          autoAvaliacao: {
            idAvaliacao: 'auto-1',
            notaFinal: 4,
            cardAutoAvaliacoes: []
          },
          avaliacaoPares: null,
          avaliacaoLiderColaborador: null
        },
        { 
          id: 'av-2', 
          tipoAvaliacao: 'LIDER_COLABORADOR',
          autoAvaliacao: null,
          avaliacaoPares: null,
          avaliacaoLiderColaborador: {
            idAvaliacao: 'lider-1',
            notaFinal: 3.5
          }
        }
      ];
      iaService.getAvaliacoesIA.mockResolvedValue(mockAvaliacoes);

      const result = await controller.getAvaliacoesIA('123', '456');

      expect(result).toEqual(mockAvaliacoes);
      expect(iaService.getAvaliacoesIA).toHaveBeenCalledWith('123', '456');
      expect(iaService.getAvaliacoesIA).toHaveBeenCalledTimes(1);
    });

    it('deve retornar array vazio quando não há avaliações', async () => {
      iaService.getAvaliacoesIA.mockResolvedValue([]);

      const result = await controller.getAvaliacoesIA('123', '456');

      expect(result).toEqual([]);
      expect(iaService.getAvaliacoesIA).toHaveBeenCalledWith('123', '456');
    });

    it('deve propagar erro do service', async () => {
      const mockError = new Error('Erro ao buscar avaliações');
      iaService.getAvaliacoesIA.mockRejectedValue(mockError);

      await expect(controller.getAvaliacoesIA('123', '456')).rejects.toThrow(mockError);
      expect(iaService.getAvaliacoesIA).toHaveBeenCalledWith('123', '456');
    });
  });

  describe('miniAvaliarColaborador', () => {
    it('deve fazer mini avaliação com sucesso', async () => {
      const mockResult = 'Mini análise do colaborador';
      iaService.miniAvaliarColaborador.mockResolvedValue(mockResult);

      const result = await controller.miniAvaliarColaborador('123', '456');

      expect(result).toBe(mockResult);
      expect(iaService.miniAvaliarColaborador).toHaveBeenCalledWith('123', '456');
      expect(iaService.miniAvaliarColaborador).toHaveBeenCalledTimes(1);
    });

    it('deve propagar erro do service', async () => {
      const mockError = new BadRequestException('Erro no service');
      iaService.miniAvaliarColaborador.mockRejectedValue(mockError);

      await expect(controller.miniAvaliarColaborador('123', '456')).rejects.toThrow(mockError);
      expect(iaService.miniAvaliarColaborador).toHaveBeenCalledWith('123', '456');
    });

    it('deve logar erro antes de propagar', async () => {
      const mockError = new Error('Erro genérico');
      iaService.miniAvaliarColaborador.mockRejectedValue(mockError);

      await expect(controller.miniAvaliarColaborador('123', '456')).rejects.toThrow(mockError);
      expect(console.error).toHaveBeenCalledWith('Erro ao avaliar colaborador:', mockError);
    });
  });

  describe('getAll_Infos_Colaborador', () => {
    it('deve buscar todas as informações com sucesso', async () => {
      const mockInfos: any = {
        colaborador: { id: 123, nomeCompleto: 'João Silva' },
        avaliacoes: [],
        equalizacao: null,
        referencias: []
      };
      iaService.getAll_Infos_Colaborador.mockResolvedValue(mockInfos);

      const result = await controller.getAll_Infos_Colaborador('123', '456');

      expect(result).toEqual(mockInfos);
      expect(iaService.getAll_Infos_Colaborador).toHaveBeenCalledWith('123', '456');
      expect(iaService.getAll_Infos_Colaborador).toHaveBeenCalledTimes(1);
    });

    it('deve propagar erro do service', async () => {
      const mockError = new Error('Erro ao buscar informações');
      iaService.getAll_Infos_Colaborador.mockRejectedValue(mockError);

      await expect(controller.getAll_Infos_Colaborador('123', '456')).rejects.toThrow(mockError);
      expect(iaService.getAll_Infos_Colaborador).toHaveBeenCalledWith('123', '456');
    });

    it('deve logar erro antes de propagar', async () => {
      const mockError = new Error('Erro genérico');
      iaService.getAll_Infos_Colaborador.mockRejectedValue(mockError);

      await expect(controller.getAll_Infos_Colaborador('123', '456')).rejects.toThrow(mockError);
      expect(console.error).toHaveBeenCalledWith('Erro ao buscar avaliações + equalização do colaborador', mockError);
    });
  });

  describe('gerarBrutalFacts', () => {
    it('deve gerar brutal facts com sucesso', async () => {
      const mockResult = 'Brutal Facts gerados com sucesso';
      iaService.gerarBrutalFacts.mockResolvedValue(mockResult);

      const result = await controller.gerarBrutalFacts('123', '456');

      expect(result).toBe(mockResult);
      expect(iaService.gerarBrutalFacts).toHaveBeenCalledWith('123', '456');
      expect(iaService.gerarBrutalFacts).toHaveBeenCalledTimes(1);
    });

    it('deve propagar ConflictException do service', async () => {
      const mockError = new ConflictException('Brutal Facts já existe');
      iaService.gerarBrutalFacts.mockRejectedValue(mockError);

      await expect(controller.gerarBrutalFacts('123', '456')).rejects.toThrow(mockError);
      expect(iaService.gerarBrutalFacts).toHaveBeenCalledWith('123', '456');
    });

    it('deve propagar BadRequestException do service', async () => {
      const mockError = new BadRequestException('Erro na geração');
      iaService.gerarBrutalFacts.mockRejectedValue(mockError);

      await expect(controller.gerarBrutalFacts('123', '456')).rejects.toThrow(mockError);
      expect(iaService.gerarBrutalFacts).toHaveBeenCalledWith('123', '456');
    });

    it('deve logar erro antes de propagar', async () => {
      const mockError = new Error('Erro genérico');
      iaService.gerarBrutalFacts.mockRejectedValue(mockError);

      await expect(controller.gerarBrutalFacts('123', '456')).rejects.toThrow(mockError);
      expect(console.error).toHaveBeenCalledWith('Erro ao gerar Brutal Facts:', mockError);
    });
  });

  describe('Validação de parâmetros', () => {
    it('deve chamar avaliarColaborador com parâmetros corretos', async () => {
      iaService.avaliarColaborador.mockResolvedValue('resultado');

      await controller.avaliarColaborador('colaborador-123', 'ciclo-456');

      expect(iaService.avaliarColaborador).toHaveBeenCalledWith('colaborador-123', 'ciclo-456');
    });

    it('deve chamar getAvaliacoesIA com parâmetros corretos', async () => {
      iaService.getAvaliacoesIA.mockResolvedValue([]);

      await controller.getAvaliacoesIA('colaborador-123', 'ciclo-456');

      expect(iaService.getAvaliacoesIA).toHaveBeenCalledWith('colaborador-123', 'ciclo-456');
    });

    it('deve chamar miniAvaliarColaborador com parâmetros corretos', async () => {
      iaService.miniAvaliarColaborador.mockResolvedValue('resultado');

      await controller.miniAvaliarColaborador('colaborador-123', 'ciclo-456');

      expect(iaService.miniAvaliarColaborador).toHaveBeenCalledWith('colaborador-123', 'ciclo-456');
    });

    it('deve chamar getAll_Infos_Colaborador com parâmetros corretos', async () => {
      iaService.getAll_Infos_Colaborador.mockResolvedValue({} as any);

      await controller.getAll_Infos_Colaborador('colaborador-123', 'ciclo-456');

      expect(iaService.getAll_Infos_Colaborador).toHaveBeenCalledWith('colaborador-123', 'ciclo-456');
    });

    it('deve chamar gerarBrutalFacts com parâmetros corretos', async () => {
      iaService.gerarBrutalFacts.mockResolvedValue('resultado');

      await controller.gerarBrutalFacts('colaborador-123', 'ciclo-456');

      expect(iaService.gerarBrutalFacts).toHaveBeenCalledWith('colaborador-123', 'ciclo-456');
    });
  });

  describe('Casos extremos', () => {
    it('deve lidar com IDs numéricos como strings', async () => {
      iaService.avaliarColaborador.mockResolvedValue('resultado');

      await controller.avaliarColaborador('1', '2');

      expect(iaService.avaliarColaborador).toHaveBeenCalledWith('1', '2');
    });

    it('deve lidar com IDs alfanuméricos', async () => {
      iaService.getAvaliacoesIA.mockResolvedValue([]);

      await controller.getAvaliacoesIA('colab-abc123', 'ciclo-xyz789');

      expect(iaService.getAvaliacoesIA).toHaveBeenCalledWith('colab-abc123', 'ciclo-xyz789');
    });

    it('deve propagar erro sem modificação', async () => {
      const originalError = new BadRequestException('Erro original');
      iaService.miniAvaliarColaborador.mockRejectedValue(originalError);

      try {
        await controller.miniAvaliarColaborador('123', '456');
      } catch (error) {
        expect(error).toBe(originalError);
        expect(error.message).toBe('Erro original');
      }
    });
  });
});
