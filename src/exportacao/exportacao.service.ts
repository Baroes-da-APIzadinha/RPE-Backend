import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prismaService'; // Ajuste o caminho se necessário
import * as xlsx from 'xlsx';

@Injectable()
export class ExportacaoService {
  constructor(private prisma: PrismaService) {}

  async exportarDadosDoCiclo(idCiclo: string): Promise<Buffer> {
    const ciclo = await this.prisma.cicloAvaliacao.findUnique({
      where: { idCiclo },
    });
    if (!ciclo) {
      throw new NotFoundException(`Ciclo com ID "${idCiclo}" não encontrado.`);
    }

    const totalAvaliacoes = await this.prisma.avaliacao.count({ where: { idCiclo } });
    const totalConcluidas = await this.prisma.avaliacao.count({ where: { idCiclo, status: 'CONCLUIDA' } });
    const totalParticipantes = await this.prisma.colaboradorCiclo.count({ where: { idCiclo } });
    
    // 3. Buscar dados para a aba de Detalhes por Colaborador
    // Esta query busca os colaboradores e suas notas de equalização (comitê)
    const detalhesColaboradores = await this.prisma.colaborador.findMany({
        where: {
            colaboradoresCiclos: {
                some: { idCiclo }
            }
        },
        select: {
            nomeCompleto: true,
            email: true,
            equalizacoesAlvo: {
                where: { idCiclo },
                select: {
                    notaAjustada: true,
                    justificativa: true,
                }
            }
        }
    });

    // 4. Criar o arquivo Excel em memória
    const workbook = xlsx.utils.book_new();

    // --- Criação da Aba 1: Resumo do Ciclo ---
    const dadosResumo = [
      { Chave: 'Nome do Ciclo', Valor: ciclo.nomeCiclo },
      { Chave: 'Data de Início', Valor: ciclo.dataInicio.toLocaleDateString('pt-BR') },
      { Chave: 'Data de Fim', Valor: ciclo.dataFim.toLocaleDateString('pt-BR') },
      { Chave: 'Status', Valor: ciclo.status },
      { Chave: 'Total de Participantes', Valor: totalParticipantes },
      { Chave: 'Total de Avaliações Lançadas', Valor: totalAvaliacoes },
      { Chave: 'Total de Avaliações Concluídas', Valor: totalConcluidas },
    ];
    const worksheetResumo = xlsx.utils.json_to_sheet(dadosResumo);
    xlsx.utils.book_append_sheet(workbook, worksheetResumo, 'Resumo do Ciclo');

    // --- Criação da Aba 2: Detalhes por Colaborador ---
    const dadosDetalhados = detalhesColaboradores.map(colab => ({
      'Nome do Colaborador': colab.nomeCompleto,
      'Email': colab.email,
      'Nota do Comitê': colab.equalizacoesAlvo[0]?.notaAjustada ?? 'N/A',
      'Justificativa do Comitê': colab.equalizacoesAlvo[0]?.justificativa ?? 'N/A',
    }));
    const worksheetDetalhes = xlsx.utils.json_to_sheet(dadosDetalhados);
    xlsx.utils.book_append_sheet(workbook, worksheetDetalhes, 'Detalhes por Colaborador');

    // 5. Converte o workbook para um buffer binário
    const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    return buffer;
  }
}