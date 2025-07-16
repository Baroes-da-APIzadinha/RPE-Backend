import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prismaService'; // Ajuste o caminho se necessário
import { preenchimentoStatus } from '@prisma/client';

@Injectable()
export class RhService {
  constructor(private prisma: PrismaService) {}

  /**
   * Endpoint 1: Retorna a quantidade total de colaboradores participando de um ciclo.
   */
  async getQuantidadeColaboradoresPorCiclo(idCiclo: string) {
    await this.validarCiclo(idCiclo);
    const total = await this.prisma.colaboradorCiclo.count({
      where: { idCiclo },
    });
    return { TotalColaboradores: total };
  }

  /**
   * Endpoint 2: Retorna o total de avaliações e quantas foram concluídas em um ciclo.
   */
  async getQuantidadeAvaliacoesConcluidasPorCiclo(idCiclo: string) {
    await this.validarCiclo(idCiclo);
    const [total, concluidas] = await Promise.all([
      this.prisma.avaliacao.count({ where: { idCiclo } }),
      this.prisma.avaliacao.count({ where: { idCiclo, status: preenchimentoStatus.CONCLUIDA } }),
    ]);
    return { TotalAvaliacoes: total, totalConcluidas: concluidas };
  }

  /**
   * Endpoint 3: Retorna a quantidade de unidades de negócio distintas.
   */
  async getQuantidadeUnidades() {
    const unidadesDistintas = await this.prisma.colaborador.findMany({
      where: { unidade: { not: null } },
      distinct: ['unidade'],
      select: { unidade: true },
    });
    return { quantidadeUnidades: unidadesDistintas.length };
  }

  /**
   * Endpoint 4: Retorna a contagem de avaliações por status em um ciclo.
   */
  async getStatusAvaliacoesPorCiclo(idCiclo: string) {
    await this.validarCiclo(idCiclo);
    const contagemPorStatus = await this.prisma.avaliacao.groupBy({
      by: ['status'],
      where: { idCiclo },
      _count: {
        status: true,
      },
    });

    // Formata a resposta para o formato desejado
    const resultado = {
      quantConcluidas: 0,
      quantPendentes: 0,
      quantEmAndamento: 0, // Supondo que você tenha esse status
    };

    for (const grupo of contagemPorStatus) {
      if (grupo.status === preenchimentoStatus.CONCLUIDA) {
        resultado.quantConcluidas = grupo._count.status;
      } else if (grupo.status === preenchimentoStatus.PENDENTE) {
        resultado.quantPendentes = grupo._count.status;
      } else if (grupo.status === preenchimentoStatus.EM_RASCUNHO) {
        resultado.quantEmAndamento = grupo._count.status;
      }
      // Adicione outros status se necessário
    }
    return resultado;
  }

  /**
   * Endpoint 5: Retorna o progresso de conclusão de avaliações por unidade.
   */
  async getProgressoPorUnidade(idCiclo: string) {
    await this.validarCiclo(idCiclo);
    
    // Busca todas as avaliações do ciclo, incluindo a unidade do avaliado
    const avaliacoes = await this.prisma.avaliacao.findMany({
      where: { idCiclo },
      include: {
        avaliado: { select: { unidade: true } },
      },
    });

    // Processa os dados em memória para agrupar por unidade
    const progresso = {};

    for (const avaliacao of avaliacoes) {
      const unidade = avaliacao.avaliado.unidade || 'Sem Unidade';
      if (!progresso[unidade]) {
        progresso[unidade] = { nomeUnidade: unidade, quantConcluidas: 0, total: 0 };
      }
      progresso[unidade].total++;
      if (avaliacao.status === preenchimentoStatus.CONCLUIDA) {
        progresso[unidade].quantConcluidas++;
      }
    }
    return Object.values(progresso); // Converte o objeto para o array de resposta
  }

  /**
   * Endpoint 6: Retorna o progresso de conclusão de avaliações por trilha.
   */
  async getProgressoPorTrilha(idCiclo: string) {
    await this.validarCiclo(idCiclo);
    
    // A lógica é idêntica à de unidade, mas buscando pela trilha de carreira
    const avaliacoes = await this.prisma.avaliacao.findMany({
      where: { idCiclo },
      include: {
        avaliado: { select: { trilhaCarreira: true } },
      },
    });

    const progresso = {};
    for (const avaliacao of avaliacoes) {
      const trilha = avaliacao.avaliado.trilhaCarreira || 'Sem Trilha';
      if (!progresso[trilha]) {
        progresso[trilha] = { nomeTrilha: trilha, quantConcluidas: 0, total: 0 };
      }
      progresso[trilha].total++;
      if (avaliacao.status === preenchimentoStatus.CONCLUIDA) {
        progresso[trilha].quantConcluidas++;
      }
    }
    return Object.values(progresso);
  }
  
  // Função auxiliar para evitar repetição de código
  private async validarCiclo(idCiclo: string) {
    const ciclo = await this.prisma.cicloAvaliacao.findUnique({ where: { idCiclo } });
    if (!ciclo) {
      throw new NotFoundException(`Ciclo com ID ${idCiclo} não encontrado.`);
    }
    return ciclo;
  }
}