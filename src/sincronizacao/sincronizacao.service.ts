import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../database/prismaService';
import { firstValueFrom } from 'rxjs';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';


interface ErpColaboradorDto {
  id: string;
  nomeCompleto: string;
  email: string;
  cargo: string;
  unidade: string;
  trilhaCarreira: string;
}

interface ErpProjetoDto {
  id: string; 
  nomeProjeto: string;
  status: any;
}

interface ErpAlocacaoDto {
  id: string;
  idColaborador: string;
  idProjeto: string;
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

  @Cron(CronExpression.EVERY_DAY_AT_10PM)
  async handleCronSincronizacao() {
    this.logger.log('🚀 Iniciando rotina de sincronização completa com o ERP (automática)...');
    await this.executarSincronizacaoCompleta();
  }

  async dispararSincronizacaoManual() {
    this.logger.log('🚀 Iniciando rotina de sincronização completa com o ERP (manual)...');
    return await this.executarSincronizacaoCompleta();
  }

  private async executarSincronizacaoCompleta() {
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

      await this.sincronizarColaboradores(colaboradoresErp);
      await this.sincronizarProjetos(projetosErp, colaboradoresErp);
      await this.sincronizarAlocacoes(alocacoesErp, colaboradoresErp, projetosErp);

      this.logger.log('✅ Sincronização completa com o ERP concluída com sucesso!');
      return {
        message: 'Sincronização completa com o ERP concluída com sucesso!',
        colaboradores: colaboradoresErp.length,
        projetos: projetosErp.length,
        alocacoes: alocacoesErp.length,
      };
    } catch (error) {
      this.logger.error('❌ Falha na sincronização com o ERP.', error.stack);
      throw error;
    }
  }

  private async sincronizarColaboradores(colaboradoresErp: any[]) {
    const salt = await bcrypt.genSalt();
    // Para mapear id do ERP para id do banco
    const mapaIdErpParaIdRpe = new Map<string, string>();

    for (const data of colaboradoresErp) {
      const colaborador = await this.prisma.colaborador.upsert({
        where: { email: data.email },
        update: {
          nomeCompleto: data.nomeCompleto, cargo: data.cargo,
          unidade: data.unidade, trilhaCarreira: data.trilhaCarreira,
        },
        create: {
          email: data.email, nomeCompleto: data.nomeCompleto,
          cargo: data.cargo, unidade: data.unidade,
          trilhaCarreira: data.trilhaCarreira, senha: await bcrypt.hash('senha123', salt),
        },
      });

      // Mapeia id do ERP para id do banco
      if (data.id) {
        mapaIdErpParaIdRpe.set(data.id, colaborador.idColaborador);
      }

      if (Array.isArray(data.perfis) && data.perfis.length > 0) {
        const perfisToInsert = data.perfis.map((tipoPerfil: string) => ({
          idColaborador: colaborador.idColaborador,
          tipoPerfil: tipoPerfil,
        }));
        await this.prisma.colaboradorPerfil.createMany({
          data: perfisToInsert,
          skipDuplicates: true,
        });
      }
    }

      // Buscar ciclo ativo para usar nas relações
    const cicloAtivo = await this.prisma.cicloAvaliacao.findFirst({
      where: {
        status: {
          in: ['EM_ANDAMENTO', 'AGENDADO', 'EM_REVISAO', 'EM_EQUALIZAÇÃO']
        }
      },
      orderBy: { dataInicio: 'desc' }
    });
    const cicloId = cicloAtivo ? cicloAtivo.idCiclo : null;

    for (const data of colaboradoresErp) {
      // Adiciona gestores
      if (Array.isArray(data.gestores) && data.gestores.length > 0 && cicloId) {
        for (const idGestorErp of data.gestores) {
          const idGestorRpe = mapaIdErpParaIdRpe.get(idGestorErp);
          const idColaboradorRpe = mapaIdErpParaIdRpe.get(data.id);
          if (idGestorRpe && idColaboradorRpe) {
            await this.prisma.gestorColaborador.upsert({
              where: {
                idGestor_idColaborador_idCiclo: {
                  idGestor: idGestorRpe,
                  idColaborador: idColaboradorRpe,
                  idCiclo: cicloId
                }
              },
              update: {},
              create: {
                idGestor: idGestorRpe,
                idColaborador: idColaboradorRpe,
                idCiclo: cicloId
              }
            });
          }
        }
      }
      // Adiciona mentores
      if (Array.isArray(data.mentores) && data.mentores.length > 0 && cicloId) {
        for (const idMentorErp of data.mentores) {
          const idMentorRpe = mapaIdErpParaIdRpe.get(idMentorErp);
          const idColaboradorRpe = mapaIdErpParaIdRpe.get(data.id);
          if (idMentorRpe && idColaboradorRpe) {
            await this.prisma.mentorColaborador.upsert({
              where: {
                idMentor_idColaborador_idCiclo: {
                  idMentor: idMentorRpe,
                  idColaborador: idColaboradorRpe,
                  idCiclo: cicloId
                }
              },
              update: {},
              create: {
                idMentor: idMentorRpe,
                idColaborador: idColaboradorRpe,
                idCiclo: cicloId
              }
            });
          }
        }
      }
    }
    this.logger.log(`  - ✔️ ${colaboradoresErp.length} colaboradores sincronizados (criados/atualizados, perfis e relações gestor/mentor preenchidos).`);
  }

  private async sincronizarProjetos(projetosErp: any[], colaboradoresErp: any[] = []) {
    const mapaErpColaboradorIdParaEmail = new Map(colaboradoresErp.map(c => [c.id, c.email]));
    const colaboradoresRpe = await this.prisma.colaborador.findMany({ select: { idColaborador: true, email: true } });
    const mapaEmailParaIdRpe = new Map(colaboradoresRpe.map(c => [c.email, c.idColaborador]));

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
  }

  private async sincronizarAlocacoes(alocacoesErp: any[], colaboradoresErp: any[], projetosErp: any[]) {
    const mapaErpColaboradorIdParaEmail = new Map(colaboradoresErp.map(c => [c.id, c.email]));
    const mapaErpProjetoIdParaNome = new Map(projetosErp.map(p => [p.id, p.nomeProjeto]));

    const colaboradoresRpe = await this.prisma.colaborador.findMany({ select: { idColaborador: true, email: true } });
    const projetosRpe = await this.prisma.projeto.findMany({ select: { idProjeto: true, nomeProjeto: true } });
    const mapaEmailParaIdRpe = new Map(colaboradoresRpe.map(c => [c.email, c.idColaborador]));
    const mapaNomeProjetoParaIdRpe = new Map(projetosRpe.map(p => [p.nomeProjeto, p.idProjeto]));

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

    if (dadosParaCriar.length > 0) {
        const resultadoCreate = await this.prisma.alocacaoColaboradorProjeto.createMany({
            data: dadosParaCriar,
        });
        this.logger.log(`  - ✔️ ${resultadoCreate.count} novas alocações inseridas.`);
    }
  }
}