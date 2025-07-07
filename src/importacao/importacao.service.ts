import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prismaService';
import * as xlsx from 'xlsx';

@Injectable()
export class ImportacaoService {
  private readonly logger = new Logger(ImportacaoService.name);

  constructor(private prisma: PrismaService) {}

  async iniciarProcessoDeImportacao(file: any) {
    this.logger.log(`Recebido arquivo para importação: ${file.originalname}`);
    this.processarArquivoEmBackground(file.buffer);
    return {
      statusCode: 202,
      message: 'Arquivo recebido. A importação foi iniciada e será processada em segundo plano.',
    };
  }

  private async processarArquivoEmBackground(fileBuffer: Buffer) {
    this.logger.log('Iniciando processamento do arquivo em background...');
    try {
      const workbook = xlsx.read(fileBuffer);

      // --- 1. PROCESSAR ABA 'Perfil' ---
      const perfil = this.extrairDadosDaAba(workbook, 'Perfil')[0];
      if (!perfil || !perfil.Email || !perfil['Nome ( nome.sobrenome )'] || !perfil['Unidade']) {
        this.logger.warn('Dados obrigatórios do perfil ausentes. Importação abortada.');
        return;
      }
      const colaborador = await this.upsertColaborador(perfil);

      // --- 2. PROCESSAR CICLO ---
      const ciclo = await this.upsertCiclo(perfil['Ciclo (ano.semestre)']);

      // --- 3. PROCESSAR A ABA 'Autoavaliação' ---
      const respostasAuto = this.extrairDadosDaAba(workbook, 'Autoavaliação');
      if (respostasAuto.length > 0) {
        await this.criarAutoAvaliacaoComCards(ciclo.idCiclo, colaborador.idColaborador, respostasAuto);
        this.logger.log('Autoavaliação importada.');
      }

      // --- 4. PROCESSAR A ABA 'Avaliação 360' ---
      const respostas360 = this.extrairDadosDaAba(workbook, 'Avaliação 360');
      if (respostas360.length > 0) {
        const avaliacoesPorAvaliado = this.agruparPorChave(respostas360, 'EMAIL DO AVALIADO ( nome.sobrenome )');
        for (const emailAvaliado in avaliacoesPorAvaliado) {
          if (!emailAvaliado || emailAvaliado === 'undefined') continue;
          const avaliado = await this.prisma.colaborador.upsert({
            where: { email: emailAvaliado },
            update: {},
            create: {
              nomeCompleto: `Avaliado - ${emailAvaliado}`,
              email: emailAvaliado,
              unidade: 'Desconhecida',
              senha: 'senha123',
            },
          });
          await this.criarAvaliacaoDePares(ciclo.idCiclo, avaliado.idColaborador, colaborador.idColaborador, avaliacoesPorAvaliado[emailAvaliado]);
          this.logger.log(`Avaliação 360 para ${emailAvaliado} importada.`);
        }
      }

      // --- 5. PROCESSAR A ABA 'Pesquisa de Referências' ---
      const referencias = this.extrairDadosDaAba(workbook, 'Pesquisa de Referências');
      if (referencias.length > 0) {
        let refsCriadas = 0;
        for (const ref of referencias) {
          const nomeColunaEmailReferencia = Object.keys(ref).find(k => k.replace(/\s+/g, ' ').toLowerCase().includes('email da referência'));
          const emailIndicado = nomeColunaEmailReferencia ? ref[nomeColunaEmailReferencia] : undefined;
          const justificativa = ref['JUSTIFICATIVA'];
          if (!emailIndicado) continue;
          try {
            const indicado = await this.prisma.colaborador.upsert({
              where: { email: emailIndicado },
              update: {},
              create: {
                nomeCompleto: `Indicado - ${emailIndicado}`,
                email: emailIndicado,
                unidade: 'Desconhecida',
                senha: 'senha123',
              },
            });
            await this.prisma.indicacaoReferencia.create({
              data: {
                idCiclo: ciclo.idCiclo,
                idIndicador: colaborador.idColaborador,
                idIndicado: indicado.idColaborador,
                tipo: 'GERAL',
                justificativa: justificativa || 'Nenhuma justificativa fornecida.',
              }
            });
            refsCriadas++;
          } catch (error) {
            this.logger.error(`Falha ao criar Indicação de Referência para ${emailIndicado}. Erro: ${error}`);
          }
        }
        this.logger.log(`${refsCriadas} Indicações de Referência importadas.`);
      }

      this.logger.log('Processamento em background concluído com sucesso!');
    } catch (error) {
      this.logger.error('Falha crítica durante o processamento do arquivo.', error.stack);
    }
  }

  extrairDadosDaAba(workbook: xlsx.WorkBook, nomeAba: string): any[] {
    const sheet = workbook.Sheets[nomeAba];
    return sheet ? xlsx.utils.sheet_to_json(sheet) : [];
  }

  // Cria ou atualiza colaborador pelo email (único)
  private async upsertColaborador(perfil: any) {
    const colaboradorExistente = await this.prisma.colaborador.findUnique({ where: { email: perfil.Email } });
    if (colaboradorExistente) {
      return this.prisma.colaborador.update({
        where: { email: perfil.Email },
        data: {
          nomeCompleto: perfil['Nome ( nome.sobrenome )'],
          unidade: perfil['Unidade'],
        },
      });
    } else {
      return this.prisma.colaborador.create({
        data: {
          nomeCompleto: perfil['Nome ( nome.sobrenome )'],
          email: perfil.Email,
          unidade: perfil['Unidade'],
          senha: 'senha123',
        },
      });
    }
  }

  // Cria ou busca ciclo pelo nome
  private async upsertCiclo(cicloNome: string) {
    let ciclo = await this.prisma.cicloAvaliacao.findFirst({ where: { nomeCiclo: cicloNome } });
    if (!ciclo) {
      let ano = '2024';
      const match = cicloNome.match(/(\d{4})/);
      if (match) ano = match[1];
      ciclo = await this.prisma.cicloAvaliacao.create({
        data: {
          nomeCiclo: cicloNome,
          dataInicio: new Date(`${ano}-01-01`),
          dataFim: new Date(`${ano}-03-31`),
          status: 'FECHADO',
          duracaoEmAndamentoDias: 30,
          duracaoEmRevisaoDias: 30,
          duracaoEmEqualizacaoDias: 30,
        },
      });
    }
    return ciclo;
  }

  // Mapeamento dos critérios antigos para os novos
  private readonly MAPA_CRITERIOS_ANTIGOS_PARA_NOVOS = {
    'Organização': 'Organização no Trabalho',
    'Imagem': 'Atender aos prazos',
    'Iniciativa': 'Sentimento de Dono',
    'Comprometimento': 'Resiliência nas adversidades',
    'Flexibilidade': 'Resiliência nas adversidades',
    'Aprendizagem Contínua': 'Capacidade de aprender',
    'Trabalho em Equipe': 'Ser "team player"',
    'Relacionamento Inter-Pessoal': 'Ser "team player"',
    'Produtividade': 'Fazer mais com menos',
    'Qualidade': 'Entregar com qualidade',
    'Foco no Cliente': 'Entregar com qualidade',
    'Criatividade e Inovação': 'Pensar fora da caixa',
    'Gestão de Pessoas*': 'Gente',
    'Gestão de Projetos*': 'Resultados',
    'Gestão Organizacional*': 'Evolução da Rocket Corp',
    'Novos Clientes**': 'Evolução da Rocket Corp',
    'Novos Projetos**': 'Evolução da Rocket Corp',
    'Novos Produtos ou Serviços**': 'Evolução da Rocket Corp',
  };

  private async criarAutoAvaliacaoComCards(cicloId: string, colaboradorId: string, linhasDaPlanilha: any[]) {
    try {
      await this.prisma.$transaction(async (tx) => {
        const avaliacao = await tx.avaliacao.create({
          data: {
            idCiclo: cicloId, idAvaliado: colaboradorId, idAvaliador: colaboradorId,
            tipoAvaliacao: 'AUTOAVALIACAO', status: 'CONCLUIDA',
          },
        });
        await tx.autoAvaliacao.create({ data: { idAvaliacao: avaliacao.idAvaliacao } });

        let cardsCriados = 0;
        for (const linha of linhasDaPlanilha) {
          const nomeAntigo = linha['CRITÉRIO'];
          const notaRaw = linha['AUTO-AVALIAÇÃO'];
          const nomeColunaJustificativa = Object.keys(linha).find(k => k.replace(/\s+/g, ' ').trim().toLowerCase().includes('dados e fatos da auto-avaliação') || k.replace(/\s+/g, ' ').trim().toLowerCase().includes('justificativa'));
          const justificativa = nomeColunaJustificativa ? linha[nomeColunaJustificativa] : undefined;
          if (!nomeAntigo || !notaRaw) continue;

          const notaNumerica = parseInt(notaRaw, 10);
          if (isNaN(notaNumerica)) {
            this.logger.warn(`Nota inválida ("${notaRaw}") para o critério "${nomeAntigo}". Card não criado.`);
            continue;
          }

          const nomeNovo = this.MAPA_CRITERIOS_ANTIGOS_PARA_NOVOS[nomeAntigo];
          if (!nomeNovo) {
            this.logger.warn(`Critério antigo "${nomeAntigo}" não possui mapeamento. Card não criado.`);
            continue;
          }

          const criterio = await tx.criterioAvaliativo.findUnique({ where: { nomeCriterio: nomeNovo } });

          if (criterio) {
            await tx.cardAutoAvaliacao.create({
              data: {
                idAvaliacao: avaliacao.idAvaliacao,
                nomeCriterio: criterio.nomeCriterio,
                nota: notaNumerica,
                justificativa: justificativa || 'xx',
              },
            });
            cardsCriados++;
          } else {
            this.logger.warn(`Critério novo "${nomeNovo}" (mapeado de "${nomeAntigo}") não encontrado no banco. Card não criado.`);
          }
        }
        this.logger.log(`✔️ Autoavaliação importada com ${cardsCriados} de ${linhasDaPlanilha.length} linhas processadas.`);
      });
    } catch (error) {
      this.logger.error('Falha ao criar Autoavaliação completa.', error);
    }
  }

  private async criarAvaliacaoDePares(cicloId: string, avaliadoId: string, avaliadorId: string, respostas: any[]) {
    const notas = respostas.map(r => parseFloat(r['DÊ UMA NOTA GERAL PARA O COLABORADOR'])).filter(n => !isNaN(n));
    const notaGeral = notas.length > 0 ? Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 100) / 100 : 0;
    const pontosMelhorar = respostas.map(r => r['PONTOS QUE DEVE MELHORAR'] || '').filter(Boolean).join('\n');
    const pontosFortes = respostas.map(r => r['PONTOS QUE FAZ BEM E DEVE EXPLORAR'] || '').filter(Boolean).join('\n');
    const motivadoTrabalharNovamente = respostas.map(r => r['VOCÊ FICARIA MOTIVADO EM TRABALHAR NOVAMENTE COM ESTE COLABORADOR'] || '').filter(Boolean).join('\n');

    await this.prisma.$transaction(async (tx) => {
      const avaliacao = await tx.avaliacao.create({
        data: {
          idCiclo: cicloId, idAvaliado: avaliadoId, idAvaliador: avaliadorId,
          tipoAvaliacao: 'AVALIACAO_PARES', status: 'CONCLUIDA',
        }
      });
      await tx.avaliacaoPares.create({
        data: {
          idAvaliacao: avaliacao.idAvaliacao,
          nota: notaGeral,
          motivadoTrabalharNovamente: motivadoTrabalharNovamente || null,
          pontosFortes: pontosFortes || 'Nenhum ponto forte destacado.',
          pontosFracos: pontosMelhorar || 'Nenhum ponto a melhorar destacado.',
        }
      });
    });
  }

  private agruparPorChave(array: any[], chave: string) {
    return array.reduce((acc, obj) => {
      const valorChave = obj[chave];
      if (!acc[valorChave]) acc[valorChave] = [];
      acc[valorChave].push(obj);
      return acc;
    }, {});
  }
}