import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../database/prismaService';
import { firstValueFrom } from 'rxjs';
import { Prisma } from '@prisma/client';

// Interfaces para tipar os dados que esperamos do ERP
interface ErpColaboradorDto {
  id: string; // ID do ERP
  nomeCompleto: string;
  email: string;
  cargo: string;
  unidade: string;
  trilhaCarreira: string;
}

interface ErpProjetoDto {
  id: string; // ID do ERP
  nomeProjeto: string;
  status: any;
}

interface ErpAlocacaoDto {
  id: string;
  idColaborador: string; // ID do Colaborador no ERP
  idProjeto: string;     // ID do Projeto no ERP
  dataEntrada: string;
  dataSaida: string | null;
}

@Injectable()
export class SincronizacaoService {
  private readonly logger = new Logger(SincronizacaoService.name);
  private readonly ERP_URL = 'http://localhost:3001';

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES) // Alterado para um intervalo mais realista
  async handleCronSincronizacao() {
    this.logger.log('🚀 Iniciando rotina de sincronização completa com o ERP...');

    try {
      const [colaboradoresResponse, projetosResponse, alocacoesResponse] = await Promise.all([
        firstValueFrom(this.httpService.get<any[]>(`${this.ERP_URL}/colaboradores`)),
        firstValueFrom(this.httpService.get<any[]>(`${this.ERP_URL}/projetos`)),
        firstValueFrom(this.httpService.get<any[]>(`${this.ERP_URL}/alocacoes`)),
      ]);

      const colaboradoresErp = colaboradoresResponse.data;
      const projetosErp = projetosResponse.data;
      const alocacoesErp = alocacoesResponse.data;

      this.logger.log(`🔍 Encontrados no ERP: ${colaboradoresErp.length} colaboradores, ${projetosErp.length} projetos, ${alocacoesErp.length} alocações.`);

      // A ordem é importante: primeiro sincroniza as entidades principais, depois as relações
      await this.sincronizarColaboradores(colaboradoresErp);
      await this.sincronizarProjetos(projetosErp, colaboradoresErp);
      await this.sincronizarAlocacoes(alocacoesErp, colaboradoresErp, projetosErp);

      this.logger.log('✅ Sincronização completa com o ERP concluída com sucesso!');
    } catch (error) {
      this.logger.error('❌ Falha na sincronização com o ERP.', error.stack);
    }
  }

  /**
   * Sincroniza colaboradores: cria, atualiza e REMOVE os que não existem mais no ERP.
   */
  private async sincronizarColaboradores(colaboradoresErp: any[]) {
    const emailsDoErp = colaboradoresErp.map(c => c.email);
    
    // 1. Cria e atualiza os colaboradores vindos do ERP
    for (const data of colaboradoresErp) {
      await this.prisma.colaborador.upsert({
        where: { email: data.email },
        update: {
          nomeCompleto: data.nomeCompleto, cargo: data.cargo,
          unidade: data.unidade, trilhaCarreira: data.trilhaCarreira,
        },
        create: {
          email: data.email, nomeCompleto: data.nomeCompleto,
          cargo: data.cargo, unidade: data.unidade,
          trilhaCarreira: data.trilhaCarreira, senha: 'senha_padrao_para_novos_usuarios_do_erp',
        },
      });
    }
    this.logger.log(`  - ✔️ ${colaboradoresErp.length} colaboradores sincronizados (criados/atualizados).`);

    // 2. Remove os colaboradores que estão no RPE mas não vieram na lista do ERP
    const resultadoDelete = await this.prisma.colaborador.deleteMany({
        where: {
            email: {
                notIn: emailsDoErp,
            }
        }
    });

    if (resultadoDelete.count > 0) {
        this.logger.log(`  - ✔️ ${resultadoDelete.count} colaboradores órfãos removidos.`);
    }
  }

  /**
   * Sincroniza projetos: cria, atualiza e REMOVE os que não existem mais no ERP.
   */
  private async sincronizarProjetos(projetosErp: any[], colaboradoresErp: any[] = []) {
    const nomesDeProjetosDoErp = projetosErp.map(p => p.nomeProjeto);

    // Prepara mapa de id ERP do colaborador para email
    const mapaErpColaboradorIdParaEmail = new Map(colaboradoresErp.map(c => [c.id, c.email]));
    // Busca todos os colaboradores do RPE
    const colaboradoresRpe = await this.prisma.colaborador.findMany({ select: { idColaborador: true, email: true } });
    const mapaEmailParaIdRpe = new Map(colaboradoresRpe.map(c => [c.email, c.idColaborador]));

    // 1. Cria e atualiza os projetos vindos do ERP
    for (const data of projetosErp) {
      let idLiderRpe: string | undefined = undefined;
      if (data.idLider) {
        const emailLider = mapaErpColaboradorIdParaEmail.get(data.idLider);
        idLiderRpe = mapaEmailParaIdRpe.get(emailLider);
      }
      await this.prisma.projeto.upsert({
        where: { nomeProjeto: data.nomeProjeto },
        update: { status: data.status as any, idLider: idLiderRpe },
        create: { nomeProjeto: data.nomeProjeto, status: data.status as any, idLider: idLiderRpe },
      });
    }
    this.logger.log(`  - ✔️ ${projetosErp.length} projetos sincronizados (criados/atualizados).`);

    // 2. Remove os projetos órfãos
    const resultadoDelete = await this.prisma.projeto.deleteMany({
        where: {
            nomeProjeto: {
                notIn: nomesDeProjetosDoErp,
            }
        }
    });
    if (resultadoDelete.count > 0) {
        this.logger.log(`  - ✔️ ${resultadoDelete.count} projetos órfãos removidos.`);
    }
  }

  /**
   * Sincroniza as alocações. A abordagem mais segura é apagar todas as alocações
   * e recriá-las com os dados mais recentes do ERP.
   */
  private async sincronizarAlocacoes(alocacoesErp: any[], colaboradoresErp: any[], projetosErp: any[]) {
    // 1. Apaga todas as alocações existentes para garantir um estado limpo
    const { count } = await this.prisma.alocacaoColaboradorProjeto.deleteMany({});
    if (count > 0) {
        this.logger.log(`  - ✔️ ${count} alocações antigas removidas.`);
    }

    // 2. Prepara os mapas de tradução
    const mapaErpColaboradorIdParaEmail = new Map(colaboradoresErp.map(c => [c.id, c.email]));
    const mapaErpProjetoIdParaNome = new Map(projetosErp.map(p => [p.id, p.nomeProjeto]));

    // 3. Busca os IDs internos do RPE para todos os colaboradores e projetos de uma vez
    const colaboradoresRpe = await this.prisma.colaborador.findMany({ select: { idColaborador: true, email: true } });
    const projetosRpe = await this.prisma.projeto.findMany({ select: { idProjeto: true, nomeProjeto: true } });
    const mapaEmailParaIdRpe = new Map(colaboradoresRpe.map(c => [c.email, c.idColaborador]));
    const mapaNomeProjetoParaIdRpe = new Map(projetosRpe.map(p => [p.nomeProjeto, p.idProjeto]));

    // 4. Prepara os dados para a inserção em massa
    const dadosParaCriar: Prisma.AlocacaoColaboradorProjetoCreateManyInput[] = [];
    for (const alocacaoErp of alocacoesErp) {
      const emailColaborador = mapaErpColaboradorIdParaEmail.get(alocacaoErp.idColaborador);
      const nomeProjeto = mapaErpProjetoIdParaNome.get(alocacaoErp.idProjeto);
      
      const idColaboradorRpe = mapaEmailParaIdRpe.get(emailColaborador);
      const idProjetoRpe = mapaNomeProjetoParaIdRpe.get(nomeProjeto);

      if (idColaboradorRpe && idProjetoRpe) {
        dadosParaCriar.push({
          idColaborador: idColaboradorRpe,
          idProjeto: idProjetoRpe,
          dataEntrada: new Date(alocacaoErp.dataEntrada),
          dataSaida: alocacaoErp.dataSaida ? new Date(alocacaoErp.dataSaida) : null,
        });
      }
    }

    // 5. Insere todas as novas alocações de uma só vez
    if (dadosParaCriar.length > 0) {
        const resultadoCreate = await this.prisma.alocacaoColaboradorProjeto.createMany({
            data: dadosParaCriar,
        });
        this.logger.log(`  - ✔️ ${resultadoCreate.count} novas alocações inseridas.`);
    }
  }
}