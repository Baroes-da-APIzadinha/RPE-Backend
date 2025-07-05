import { PrismaService } from 'src/database/prismaService';
import { cicloStatus, CicloAvaliacao, Prisma} from '@prisma/client';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CiclosStatus {
  constructor(private prisma: PrismaService) {}

  private readonly logger = new Logger(CiclosStatus.name);

  async findAll(): Promise<CicloAvaliacao[]> {
    return this.prisma.cicloAvaliacao.findMany();
  }

  async updateStatus(id: string, status: cicloStatus): Promise<void> {
    await this.prisma.cicloAvaliacao.update({
      where: { idCiclo: id },
      data: { status },
    });
  }

  @Cron('00 00 * * *', {
    timeZone: 'America/Sao_Paulo'
  })
  async handleCron() {
    this.logger.debug('Verificando status dos ciclos...');
    const ciclos = await this.findAll();
    const now = new Date();
    console.log('Data atual UTC:', now);

    // Criar variável 'hoje' apenas com data (sem horas)
    const hoje = new Date(now.getFullYear(), now.getMonth(), now.getDate(), -3, 0, 0, 0);
    console.log('Hoje (apenas data):', hoje);

    for (const ciclo of ciclos) {
      const inicio = new Date(ciclo.dataInicio);
      const fim = new Date(ciclo.dataFim);
      
      // Calcular as datas de transição baseadas nas durações
      const fimAndamento = new Date(inicio);
      fimAndamento.setDate(fimAndamento.getDate() + ciclo.duracaoEmAndamentoDias - 1);
      
      const inicioRevisao = new Date(fimAndamento);
      inicioRevisao.setDate(inicioRevisao.getDate() + 1);
      
      const fimRevisao = new Date(inicioRevisao);
      fimRevisao.setDate(fimRevisao.getDate() + ciclo.duracaoEmRevisaoDias - 1);
      
      const inicioEqualizacao = new Date(fimRevisao);
      inicioEqualizacao.setDate(inicioEqualizacao.getDate() + 1);
      
      const fimEqualizacao = new Date(inicioEqualizacao);
      fimEqualizacao.setDate(fimEqualizacao.getDate() + ciclo.duracaoEmEqualizacaoDias - 1);

      let newStatus: cicloStatus = ciclo.status; // Mantém o status atual por padrão

      // Lógica de transição de status
      if (hoje < inicio) {
        newStatus = cicloStatus.AGENDADO;
      } else if (hoje >= inicio && hoje <= fimAndamento) {
        newStatus = cicloStatus.EM_ANDAMENTO;
      } else if (hoje >= inicioRevisao && hoje <= fimRevisao) {
        newStatus = cicloStatus.EM_REVISAO;
      } else if (hoje >= inicioEqualizacao && hoje <= fimEqualizacao) {
        newStatus = cicloStatus.EM_EQUALIZAÇÃO;
      } else if (hoje > fim) {
        newStatus = cicloStatus.FECHADO;
      }

      if (newStatus !== ciclo.status) {
        await this.updateStatus(ciclo.idCiclo, newStatus);
        this.logger.log(
          `Ciclo ${ciclo.idCiclo} - "${ciclo.nomeCiclo}" teve o status alterado para: ${newStatus}`,
        );
        this.logger.debug(
          `Períodos: Andamento(${inicio.toISOString()} - ${fimAndamento.toISOString()}), ` +
          `Revisão(${inicioRevisao.toISOString()} - ${fimRevisao.toISOString()}), ` +
          `Equalização(${inicioEqualizacao.toISOString()} - ${fimEqualizacao.toISOString()})`
        );
      }
    }
    this.logger.debug('Verificação de status dos ciclos concluída.');
  }


}