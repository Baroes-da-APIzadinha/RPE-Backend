import { Test, TestingModule } from '@nestjs/testing';
import { IaService } from './ia.service';
import { PrismaService } from '../database/prismaService';
import { AvaliacoesService } from '../avaliacoes/avaliacoes.service';
import { HashService } from '../common/hash.service';
import { BadRequestException, ConflictException } from '@nestjs/common';

// Mock do AI
jest.mock('./init', () => ({
  default: {
    models: {
      generateContent: jest.fn()
    }
  }
}));

describe('IaService', () => {
  let service: IaService;
  let prismaService: any;
  let avaliacoesService: jest.Mocked<AvaliacoesService>;
  let hashService: jest.Mocked<HashService>;

  const mockAi = require('./init').default;

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    const mockPrismaService = {
      avaliacao: {
        findMany: jest.fn(),
      },
      equalizacao: {
        findFirst: jest.fn(),
      },
      indicacaoReferencia: {
        findMany: jest.fn(),
      },
      brutalFacts: {
        create: jest.fn(),
      },
    };

    const mockAvaliacoesService = {};

    const mockHashService = {
      decrypt: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IaService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AvaliacoesService,
          useValue: mockAvaliacoesService,
        },
        {
          provide: HashService,
          useValue: mockHashService,
        },
      ],
    })
    .setLogger({
      log: () => {},
      error: () => {},
      warn: () => {},
      debug: () => {},
    }) // Silencia logs do NestJS durante os testes
    .compile();

    service = module.get<IaService>(IaService);
    prismaService = module.get(PrismaService);
    avaliacoesService = module.get(AvaliacoesService);
    hashService = module.get(HashService);

    // Limpar mocks
    jest.clearAllMocks();
  });

  describe('Definição do serviço', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('getAvaliacoesIA', () => {
    const idColaborador = 'collab-123';
    const idCiclo = 'ciclo-456';

    const mockAvaliacao = {
      id: 'av-1',
      idAvaliado: idColaborador,
      idCiclo: idCiclo,
      tipoAvaliacao: 'AUTO_AVALIACAO',
      autoAvaliacao: {
        cardAutoAvaliacoes: [
          { justificativa: 'encrypted-justification' }
        ]
      },
      avaliacaoLiderColaborador: {
        cardAvaliacaoLiderColaborador: [
          { justificativa: 'encrypted-leader-justification' }
        ]
      },
      avaliacaoPares: {
        pontosFortes: 'encrypted-peer-strong',
        pontosFracos: 'encrypted-peer-weak'
      }
    };

    beforeEach(() => {
      hashService.decrypt.mockImplementation((text) => `decrypted-${text}`);
    });

    it('deve buscar e descriptografar avaliações corretamente', async () => {
      prismaService.avaliacao.findMany.mockResolvedValue([mockAvaliacao]);

      const result = await service.getAvaliacoesIA(idColaborador, idCiclo);

      expect(prismaService.avaliacao.findMany).toHaveBeenCalledWith({
        where: {
          idAvaliado: idColaborador,
          idCiclo: idCiclo
        },
        include: {
          autoAvaliacao: { include: { cardAutoAvaliacoes: true } },
          avaliacaoPares: true,
          avaliacaoLiderColaborador: { include: { cardAvaliacaoLiderColaborador: true } }
        }
      });

      expect(result).toHaveLength(1);
      expect(hashService.decrypt).toHaveBeenCalled();
    });

    it('deve retornar array vazio quando não há avaliações', async () => {
      prismaService.avaliacao.findMany.mockResolvedValue([]);

      const result = await service.getAvaliacoesIA(idColaborador, idCiclo);

      expect(result).toEqual([]);
    });

    it('deve descriptografar justificativas da autoavaliação', async () => {
      const avaliacaoComAuto = {
        ...mockAvaliacao,
        autoAvaliacao: {
          cardAutoAvaliacoes: [
            { justificativa: 'encrypted-auto-1' },
            { justificativa: 'encrypted-auto-2' }
          ]
        }
      };

      prismaService.avaliacao.findMany.mockResolvedValue([avaliacaoComAuto]);

      await service.getAvaliacoesIA(idColaborador, idCiclo);

      expect(hashService.decrypt).toHaveBeenCalledWith('encrypted-auto-1');
      expect(hashService.decrypt).toHaveBeenCalledWith('encrypted-auto-2');
    });

    it('deve descriptografar justificativas da avaliação líder-colaborador', async () => {
      const avaliacaoComLider = {
        ...mockAvaliacao,
        avaliacaoLiderColaborador: {
          cardAvaliacaoLiderColaborador: [
            { justificativa: 'encrypted-leader-1' }
          ]
        }
      };

      prismaService.avaliacao.findMany.mockResolvedValue([avaliacaoComLider]);

      await service.getAvaliacoesIA(idColaborador, idCiclo);

      expect(hashService.decrypt).toHaveBeenCalledWith('encrypted-leader-1');
    });

    it('deve descriptografar justificativas de pares', async () => {
      const avaliacaoComPares = {
        ...mockAvaliacao,
        avaliacaoPares: {
          pontosFortes: 'encrypted-strong-points',
          pontosFracos: 'encrypted-weak-points'
        }
      };

      prismaService.avaliacao.findMany.mockResolvedValue([avaliacaoComPares]);

      await service.getAvaliacoesIA(idColaborador, idCiclo);

      expect(hashService.decrypt).toHaveBeenCalledWith('encrypted-strong-points');
      expect(hashService.decrypt).toHaveBeenCalledWith('encrypted-weak-points');
    });
  });

  describe('getAll_Infos_Colaborador', () => {
    const idColaborador = 'collab-123';
    const idCiclo = 'ciclo-456';

    const mockEqualizacao = {
      id: 'eq-1',
      idAvaliado: idColaborador,
      idCiclo: idCiclo,
      justificativa: 'encrypted-equalization'
    };

    const mockReferencias = [
      {
        id: 'ref-1',
        idIndicado: idColaborador,
        idCiclo: idCiclo,
        justificativa: 'encrypted-reference-1'
      }
    ];

    beforeEach(() => {
      hashService.decrypt.mockImplementation((text) => `decrypted-${text}`);
      jest.spyOn(service, 'getAvaliacoesIA').mockResolvedValue([]);
    });

    it('deve buscar todas as informações do colaborador', async () => {
      prismaService.equalizacao.findFirst.mockResolvedValue(mockEqualizacao);
      prismaService.indicacaoReferencia.findMany.mockResolvedValue(mockReferencias);

      const result = await service.getAll_Infos_Colaborador(idColaborador, idCiclo);

      expect(service.getAvaliacoesIA).toHaveBeenCalledWith(idColaborador, idCiclo);
      expect(prismaService.equalizacao.findFirst).toHaveBeenCalledWith({
        where: {
          idAvaliado: idColaborador,
          idCiclo: idCiclo
        }
      });
      expect(prismaService.indicacaoReferencia.findMany).toHaveBeenCalledWith({
        where: {
          idIndicado: idColaborador,
          idCiclo: idCiclo
        }
      });

      expect(result).toHaveProperty('avaliacoes');
      expect(result).toHaveProperty('equalizacao');
      expect(result).toHaveProperty('referencias');
    });

    it('deve descriptografar justificativa da equalização', async () => {
      prismaService.equalizacao.findFirst.mockResolvedValue(mockEqualizacao);
      prismaService.indicacaoReferencia.findMany.mockResolvedValue([]);

      const result = await service.getAll_Infos_Colaborador(idColaborador, idCiclo);

      expect(hashService.decrypt).toHaveBeenCalledWith('encrypted-equalization');
      expect(result.equalizacao!.justificativa).toBe('decrypted-encrypted-equalization');
    });

    it('deve descriptografar justificativas das referências', async () => {
      prismaService.equalizacao.findFirst.mockResolvedValue(null);
      prismaService.indicacaoReferencia.findMany.mockResolvedValue(mockReferencias);

      const result = await service.getAll_Infos_Colaborador(idColaborador, idCiclo);

      expect(hashService.decrypt).toHaveBeenCalledWith('encrypted-reference-1');
      expect(result.referencias[0].justificativa).toBe('decrypted-encrypted-reference-1');
    });

    it('deve lidar com equalizacao nula', async () => {
      prismaService.equalizacao.findFirst.mockResolvedValue(null);
      prismaService.indicacaoReferencia.findMany.mockResolvedValue([]);

      const result = await service.getAll_Infos_Colaborador(idColaborador, idCiclo);

      expect(result.equalizacao).toBeNull();
    });

    it('deve lidar com referências sem justificativa', async () => {
      const refSemJustificativa = {
        id: 'ref-2',
        idIndicado: idColaborador,
        idCiclo: idCiclo,
        justificativa: null
      };

      prismaService.equalizacao.findFirst.mockResolvedValue(null);
      prismaService.indicacaoReferencia.findMany.mockResolvedValue([refSemJustificativa]);

      const result = await service.getAll_Infos_Colaborador(idColaborador, idCiclo);

      expect(result.referencias[0].justificativa).toBeNull();
      expect(hashService.decrypt).not.toHaveBeenCalled();
    });
  });

  describe('avaliarColaborador', () => {
    const idColaborador = 'collab-123';
    const idCiclo = 'ciclo-456';

    const mockAvaliacoes = [
      {
        id: 'av-1',
        tipoAvaliacao: 'AUTOAVALIACAO',
        autoAvaliacao: {
          notaFinal: 4,
          cardAutoAvaliacoes: [
            { nomeCriterio: 'Comunicação', nota: 4, justificativa: 'Boa comunicação' }
          ]
        },
        avaliador: { nomeCompleto: 'João Silva' },
        avaliacaoPares: null,
        avaliacaoLiderColaborador: null
      }
    ];

    beforeEach(() => {
      jest.spyOn(service, 'getAvaliacoesIA').mockResolvedValue(mockAvaliacoes as any);
      jest.spyOn(service, 'processarAvaliacoes' as any).mockReturnValue({
        autoAvaliacao: mockAvaliacoes[0],
        avaliacoesLider: [],
        avaliacoesPares: [],
        resumo: { totalAvaliacoes: 1, temAutoAvaliacao: true, quantidadeLideres: 0, quantidadePares: 0 }
      });
      jest.spyOn(service, 'criarPromptDetalhado' as any).mockReturnValue('Mock prompt');
    });

    it('deve avaliar colaborador com sucesso', async () => {
      mockAi.models.generateContent.mockResolvedValue({
        text: 'Análise completa do colaborador'
      });

      const result = await service.avaliarColaborador(idColaborador, idCiclo);

      expect(service.getAvaliacoesIA).toHaveBeenCalledWith(idColaborador, idCiclo);
      expect(mockAi.models.generateContent).toHaveBeenCalled();
      expect(result).toBe('Análise completa do colaborador');
    });

    it('deve lançar erro quando não há avaliações', async () => {
      jest.spyOn(service, 'getAvaliacoesIA').mockResolvedValue([]);

      await expect(service.avaliarColaborador(idColaborador, idCiclo))
        .rejects.toThrow('Nenhuma avaliação encontrada para este colaborador neste ciclo');
    });

    it('deve lançar erro quando avaliações são nulas', async () => {
      jest.spyOn(service, 'getAvaliacoesIA').mockResolvedValue(null as any);

      await expect(service.avaliarColaborador(idColaborador, idCiclo))
        .rejects.toThrow('Nenhuma avaliação encontrada para este colaborador neste ciclo');
    });

    it('deve propagar erro da IA', async () => {
      mockAi.models.generateContent.mockRejectedValue(new Error('Erro da IA'));

      await expect(service.avaliarColaborador(idColaborador, idCiclo))
        .rejects.toThrow('Erro da IA');
    });

    it('deve retornar mensagem de erro quando IA não retorna texto', async () => {
      mockAi.models.generateContent.mockResolvedValue({ text: null });

      const result = await service.avaliarColaborador(idColaborador, idCiclo);

      expect(result).toBe('Erro na geração de resposta pela IA');
    });
  });

  describe('miniAvaliarColaborador', () => {
    const idColaborador = 'collab-123';
    const idCiclo = 'ciclo-456';

    const mockAvaliacoes = [
      {
        id: 'av-1',
        tipoAvaliacao: 'AUTOAVALIACAO',
        autoAvaliacao: {
          notaFinal: 4,
          cardAutoAvaliacoes: [
            { nomeCriterio: 'Comunicação', nota: 4, justificativa: 'Boa comunicação' }
          ]
        },
        avaliador: { nomeCompleto: 'João Silva' },
        avaliacaoPares: null,
        avaliacaoLiderColaborador: null
      }
    ];

    beforeEach(() => {
      jest.spyOn(service, 'getAvaliacoesIA').mockResolvedValue(mockAvaliacoes as any);
      jest.spyOn(service, 'processarAvaliacoes' as any).mockReturnValue({
        autoAvaliacao: mockAvaliacoes[0],
        avaliacoesLider: [],
        avaliacoesPares: []
      });
      jest.spyOn(service, 'criarPromptDetalhado' as any).mockReturnValue('Mock prompt');
    });

    it('deve fazer mini avaliação com sucesso', async () => {
      mockAi.models.generateContent.mockResolvedValue({
        text: 'Mini análise do colaborador'
      });

      const result = await service.miniAvaliarColaborador(idColaborador, idCiclo);

      expect(service.getAvaliacoesIA).toHaveBeenCalledWith(idColaborador, idCiclo);
      expect(mockAi.models.generateContent).toHaveBeenCalled();
      expect(result).toBe('Mini análise do colaborador');
    });

    it('deve lançar erro quando não há avaliações', async () => {
      jest.spyOn(service, 'getAvaliacoesIA').mockResolvedValue([]);

      await expect(service.miniAvaliarColaborador(idColaborador, idCiclo))
        .rejects.toThrow('Nenhuma avaliação encontrada para este colaborador neste ciclo');
    });

    it('deve usar configuração MiniConfig', async () => {
      mockAi.models.generateContent.mockResolvedValue({
        text: 'Mini resposta'
      });

      await service.miniAvaliarColaborador(idColaborador, idCiclo);

      const callArgs = mockAi.models.generateContent.mock.calls[0][0];
      expect(callArgs.config.maxOutputTokens).toBe(2000); // Valor do MiniConfig
    });
  });

  describe('gerarBrutalFacts', () => {
    const idColaborador = 'collab-123';
    const idCiclo = 'ciclo-456';

    const mockDadosCompletos = {
      avaliacoes: [{
        id: 'av-1',
        tipoAvaliacao: 'AUTO_AVALIACAO',
        autoAvaliacao: null,
        avaliacaoPares: null,
        avaliacaoLiderColaborador: null
      }],
      equalizacao: { justificativa: 'Equalizado' },
      referencias: [{ justificativa: 'Boa referência' }]
    };

    beforeEach(() => {
      jest.spyOn(service, 'getAll_Infos_Colaborador').mockResolvedValue(mockDadosCompletos as any);
      jest.spyOn(service, 'processarAvaliacoes' as any).mockReturnValue({
        autoAvaliacao: {},
        avaliacoesLider: [],
        avaliacoesPares: []
      });
      jest.spyOn(service, 'criarPromptBrutalFacts' as any).mockReturnValue('Mock brutal facts prompt');
    });

    it('deve gerar brutal facts com sucesso', async () => {
      mockAi.models.generateContent.mockResolvedValue({
        text: 'Brutal Facts gerado com sucesso'
      });

      const result = await service.gerarBrutalFacts(idColaborador, idCiclo);

      expect(service.getAll_Infos_Colaborador).toHaveBeenCalledWith(idColaborador, idCiclo);
      expect(prismaService.brutalFacts.create).toHaveBeenCalledWith({
        data: {
          idColaborador,
          idCiclo,
          brutalFact: 'Brutal Facts gerado com sucesso'
        }
      });
      expect(result).toBe('Brutal Facts gerado com sucesso');
    });

    it('deve lançar erro quando não há avaliações', async () => {
      jest.spyOn(service, 'getAll_Infos_Colaborador').mockResolvedValue({
        avaliacoes: [],
        equalizacao: null,
        referencias: []
      } as any);

      await expect(service.gerarBrutalFacts(idColaborador, idCiclo))
        .rejects.toThrow('Nenhuma avaliação encontrada para este colaborador neste ciclo');
    });

    it('deve lançar erro quando avaliações são nulas', async () => {
      jest.spyOn(service, 'getAll_Infos_Colaborador').mockResolvedValue({
        avaliacoes: null as any,
        equalizacao: null,
        referencias: []
      } as any);

      await expect(service.gerarBrutalFacts(idColaborador, idCiclo))
        .rejects.toThrow('Nenhuma avaliação encontrada para este colaborador neste ciclo');
    });

    it('deve lançar ConflictException quando brutal facts já existe', async () => {
      mockAi.models.generateContent.mockResolvedValue({
        text: 'Brutal Facts'
      });

      prismaService.brutalFacts.create.mockRejectedValue({
        code: 'P2002'
      });

      await expect(service.gerarBrutalFacts(idColaborador, idCiclo))
        .rejects.toThrow(ConflictException);
    });

    it('deve propagar outros erros do banco', async () => {
      mockAi.models.generateContent.mockResolvedValue({
        text: 'Brutal Facts'
      });

      const dbError = new Error('Erro do banco');
      prismaService.brutalFacts.create.mockRejectedValue(dbError);

      await expect(service.gerarBrutalFacts(idColaborador, idCiclo))
        .rejects.toThrow(dbError);
    });

    it('deve lançar BadRequestException quando IA não retorna texto', async () => {
      mockAi.models.generateContent.mockResolvedValue({
        text: null
      });

      await expect(service.gerarBrutalFacts(idColaborador, idCiclo))
        .rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException quando IA retorna texto vazio', async () => {
      mockAi.models.generateContent.mockResolvedValue({
        text: ''
      });

      await expect(service.gerarBrutalFacts(idColaborador, idCiclo))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('Métodos privados', () => {
    describe('processarAvaliacoes', () => {
      it('deve processar autoavaliação corretamente', () => {
        const avaliacoes = [
          {
            tipoAvaliacao: 'AUTOAVALIACAO',
            autoAvaliacao: {
              notaFinal: 4,
              cardAutoAvaliacoes: []
            },
            avaliador: { nomeCompleto: 'João Silva' }
          }
        ];

        const result = (service as any).processarAvaliacoes(avaliacoes);

        expect(result.autoAvaliacao).toBeDefined();
        expect(result.resumo.temAutoAvaliacao).toBe(true);
        expect(result.resumo.totalAvaliacoes).toBe(1);
      });

      it('deve processar avaliações de líder corretamente', () => {
        const avaliacoes = [
          {
            tipoAvaliacao: 'LIDER_COLABORADOR',
            avaliacaoLiderColaborador: {
              notaFinal: 3.5,
              cardAvaliacaoLiderColaborador: []
            },
            avaliador: { nomeCompleto: 'Maria Santos' }
          },
          {
            tipoAvaliacao: 'LIDER_COLABORADOR',
            avaliacaoLiderColaborador: {
              notaFinal: 4.0,
              cardAvaliacaoLiderColaborador: []
            },
            avaliador: { nomeCompleto: 'Pedro Costa' }
          }
        ];

        const result = (service as any).processarAvaliacoes(avaliacoes);

        expect(result.avaliacoesLider).toHaveLength(2);
        expect(result.resumo.quantidadeLideres).toBe(2);
      });

      it('deve processar avaliações de pares corretamente', () => {
        const avaliacoes = [
          {
            tipoAvaliacao: 'AVALIACAO_PARES',
            avaliacaoPares: {
              nota: 4,
              pontosFortes: 'Comunicativo',
              pontosFracos: 'Impaciente'
            },
            avaliador: { nomeCompleto: 'Colega Teste' }
          }
        ];

        const result = (service as any).processarAvaliacoes(avaliacoes);

        expect(result.avaliacoesPares).toHaveLength(1);
        expect(result.resumo.quantidadePares).toBe(1);
      });

      it('deve retornar estrutura vazia quando não há avaliações', () => {
        const avaliacoes: any[] = [];

        const result = (service as any).processarAvaliacoes(avaliacoes);

        expect(result.autoAvaliacao).toBeNull();
        expect(result.avaliacoesLider).toHaveLength(0);
        expect(result.avaliacoesPares).toHaveLength(0);
        expect(result.resumo.totalAvaliacoes).toBe(0);
      });
    });

    describe('criarPromptDetalhado', () => {
      it('deve criar prompt com autoavaliação', () => {
        const dados = {
          autoAvaliacao: {
            notaFinal: 4,
            avaliador: { nomeCompleto: 'João Silva' },
            criterios: [
              { nomeCriterio: 'Comunicação', nota: 4, justificativa: 'Boa comunicação' }
            ]
          },
          avaliacoesLider: [],
          avaliacoesPares: []
        };

        const result = (service as any).criarPromptDetalhado(dados);

        expect(result).toContain('=== AUTOAVALIAÇÃO ===');
        expect(result).toContain('Nota Final: 4/5');
        expect(result).toContain('João Silva');
      });

      it('deve criar prompt quando não há autoavaliação', () => {
        const dados = {
          autoAvaliacao: null,
          avaliacoesLider: [],
          avaliacoesPares: []
        };

        const result = (service as any).criarPromptDetalhado(dados);

        expect(result).toContain('❌ Autoavaliação não realizada');
      });

      it('deve incluir análise de discrepâncias', () => {
        const dados = {
          autoAvaliacao: { 
            notaFinal: 4,
            criterios: [
              { nomeCriterio: 'Comunicação', nota: 4, justificativa: 'Boa comunicação' }
            ]
          },
          avaliacoesLider: [],
          avaliacoesPares: []
        };

        jest.spyOn(service as any, 'analisarDiscrepancias').mockReturnValue('Análise de discrepâncias');

        const result = (service as any).criarPromptDetalhado(dados);

        expect(result).toContain('=== ANÁLISE DE DISCREPÂNCIAS ===');
        expect(result).toContain('Análise de discrepâncias');
      });
    });

    describe('analisarDiscrepancias', () => {
      it('deve analisar discrepâncias quando há múltiplas notas', () => {
        const dados = {
          autoAvaliacao: { notaFinal: 4 },
          avaliacoesLider: [
            { notaFinal: 3.5 },
            { notaFinal: 3.0 }
          ],
          avaliacoesPares: [
            { nota: 4.5 },
            { nota: 4.0 }
          ]
        };

        const result = (service as any).analisarDiscrepancias(dados);

        expect(result).toContain('Resumo das notas:');
        expect(result).toContain('Diferença máxima:');
        expect(result).toContain('Média geral:');
      });

      it('deve retornar mensagem quando dados insuficientes', () => {
        const dados = {
          autoAvaliacao: { notaFinal: 4 },
          avaliacoesLider: [],
          avaliacoesPares: []
        };

        const result = (service as any).analisarDiscrepancias(dados);

        expect(result).toContain('Dados insuficientes para análise de discrepância');
      });
    });

    describe('criarPromptBrutalFacts', () => {
      it('deve criar prompt com todas as informações', () => {
        const dados = {
          autoAvaliacao: { 
            notaFinal: 4,
            criterios: [
              { nomeCriterio: 'Comunicação', nota: 4, justificativa: 'Boa comunicação' }
            ]
          },
          avaliacoesLider: [{ 
            notaFinal: 3.5,
            criterios: [
              { nomeCriterio: 'Liderança', nota: 3, justificativa: 'Boa liderança' }
            ]
          }],
          avaliacoesPares: [{ nota: 4.0 }]
        };

        const equalizacao = {
          notaFinal: 3.8,
          justificativa: 'Nota equalizada'
        };

        const referencias = [
          { justificativa: 'Excelente colaborador' }
        ];

        const result = (service as any).criarPromptBrutalFacts(dados, equalizacao, referencias);

        expect(result).toContain('=== DADOS PARA BRUTAL FACTS ===');
        expect(result).toContain('Analise os dados acima e siga as instruções do sistema');
      });

      it('deve lidar com dados nulos', () => {
        const dados = {
          autoAvaliacao: null,
          avaliacoesLider: [],
          avaliacoesPares: []
        };

        const result = (service as any).criarPromptBrutalFacts(dados, null, null);

        expect(result).toContain('=== DADOS PARA BRUTAL FACTS ===');
        expect(result).toBeDefined();
      });
    });
  });

  describe('Casos extremos e edge cases', () => {
    it('deve lidar com erro de rede da IA', async () => {
      jest.spyOn(service, 'getAvaliacoesIA').mockResolvedValue([{ 
        id: 'av-1',
        tipoAvaliacao: 'AUTOAVALIACAO',
        autoAvaliacao: {
          notaFinal: 4,
          cardAutoAvaliacoes: []
        },
        avaliacaoPares: null,
        avaliacaoLiderColaborador: null
      }] as any);
      jest.spyOn(service, 'processarAvaliacoes' as any).mockReturnValue({});
      jest.spyOn(service, 'criarPromptDetalhado' as any).mockReturnValue('Prompt');

      mockAi.models.generateContent.mockRejectedValue(new Error('Network error'));

      await expect(service.avaliarColaborador('collab-123', 'ciclo-456'))
        .rejects.toThrow('Network error');
    });

    it('deve validar IDs inválidos', async () => {
      prismaService.avaliacao.findMany.mockRejectedValue(new Error('Invalid UUID'));

      await expect(service.getAvaliacoesIA('invalid-id', 'invalid-ciclo'))
        .rejects.toThrow('Invalid UUID');
    });

    it('deve lidar com resposta malformada da IA', async () => {
      jest.spyOn(service, 'getAvaliacoesIA').mockResolvedValue([{ 
        id: 'av-1',
        tipoAvaliacao: 'AUTOAVALIACAO',
        autoAvaliacao: {
          notaFinal: 4,
          cardAutoAvaliacoes: []
        },
        avaliacaoPares: null,
        avaliacaoLiderColaborador: null
      }] as any);
      jest.spyOn(service, 'processarAvaliacoes' as any).mockReturnValue({});
      jest.spyOn(service, 'criarPromptDetalhado' as any).mockReturnValue('Prompt');

      mockAi.models.generateContent.mockResolvedValue({
        text: undefined
      });

      const result = await service.avaliarColaborador('collab-123', 'ciclo-456');

      expect(result).toBe('Erro na geração de resposta pela IA');
    });
  });
});
