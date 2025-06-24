import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prismaService';
import { CreateAutoAvaliacaoDto, CreateAvaliacao360Dto } from './avaliacoes.dto';
import { avaliacaoTipo, preenchimentoStatus } from '@prisma/client';

@Injectable()
export class AvaliacoesService {
  constructor(private readonly prisma: PrismaService) {}

  async criarAutoAvaliacao(dto: CreateAutoAvaliacaoDto) {
    const { idCiclo, idColaborador, respostas } = dto;

    // ETAPA 1: Validar se o colaborador e o ciclo existem (boa prática)
    const colaborador = await this.prisma.colaborador.findUnique({ where: { idColaborador } });
    const ciclo = await this.prisma.cicloAvaliacao.findUnique({ where: { idCiclo } });

    if (!colaborador) {
      throw new NotFoundException(`Colaborador com ID ${idColaborador} não encontrado.`);
    }
    if (!ciclo) {
      throw new NotFoundException(`Ciclo com ID ${idCiclo} não encontrado.`);
    }
    
    // Validar se todos os IDs de critérios enviados existem
    const idsCriteriosEnviados = respostas.map(r => r.idCriterio);
    const criteriosNoBanco = await this.prisma.criterioAvaliativo.findMany({
      where: { idCriterio: { in: idsCriteriosEnviados } }
    });

    if (criteriosNoBanco.length !== idsCriteriosEnviados.length) {
      throw new BadRequestException('Um ou mais IDs de critérios enviados são inválidos.');
    }

    // ETAPA 2: Usar uma transação para garantir a integridade dos dados
    return this.prisma.$transaction(async (tx) => {
      // 2.1. Cria o registro principal da 'Avaliacao'
      const avaliacao = await tx.avaliacao.create({
        data: {
          idCiclo: idCiclo,
          idAvaliado: idColaborador,
          idAvaliador: idColaborador, // Na autoavaliação, são a mesma pessoa
          tipo: avaliacaoTipo.AUTOAVALIACAO,
          status: preenchimentoStatus.CONCLUIDA,
          dataPreenchimento: new Date(),
        },
      });

      // 2.2. Prepara os dados para os 'DetalheAvaliacao'
      const detalhesParaCriar = respostas.map((resposta) => ({
        idAvaliacao: avaliacao.idAvaliacao,
        idCriterio: resposta.idCriterio,
        nota: resposta.nota,
        justificativa: resposta.justificativa || '', // Garante que não seja nulo
      }));

      // 2.3. Cria todos os detalhes de uma vez com 'createMany' (muito eficiente)
      await tx.detalheAvaliacao.createMany({
        data: detalhesParaCriar,
      });

      // Retorna a avaliação principal com os detalhes incluídos para confirmação
      return tx.avaliacao.findUnique({
        where: { idAvaliacao: avaliacao.idAvaliacao },
        include: {
          detalhes: true, // Inclui os detalhes que acabamos de criar na resposta
        },
      });
    });
  }
  async criarAvaliacao360(dto: CreateAvaliacao360Dto) {
    const { 
      idCiclo, 
      idAvaliador, 
      emailAvaliado, 
      idProjeto,
      // ... बाकीचे dto गुणधर्म ...
    } = dto;

    // ETAPA 1: Validar todas as entidades
    // Busca o avaliado pelo email fornecido
    const avaliado = await this.prisma.colaborador.findUnique({ where: { email: emailAvaliado }});
    if (!avaliado) {
      throw new NotFoundException(`Colaborador a ser avaliado com email "${emailAvaliado}" não foi encontrado.`);
    }

    // Valida o avaliador, ciclo e projeto
    const [avaliador, ciclo, projeto] = await Promise.all([
      this.prisma.colaborador.findUnique({ where: { idColaborador: idAvaliador } }),
      this.prisma.cicloAvaliacao.findUnique({ where: { idCiclo } }),
      this.prisma.projeto.findUnique({ where: { idProjeto } })
    ]);

    if (!avaliador) throw new NotFoundException(`Avaliador com ID "${idAvaliador}" não encontrado.`);
    if (!ciclo) throw new NotFoundException(`Ciclo com ID "${idCiclo}" não encontrado.`);
    if (!projeto) throw new NotFoundException(`Projeto com ID "${idProjeto}" não encontrado.`);

    // ETAPA 2: Criar o registro da avaliação no banco
    return this.prisma.avaliacao.create({
      data: {
        idCiclo: idCiclo,
        idAvaliador: idAvaliador,
        idAvaliado: avaliado.idColaborador,
        tipo: avaliacaoTipo.AVALIACAO_PARES, // Usamos o tipo genérico para pares/360
        status: preenchimentoStatus.CONCLUIDA,
        dataPreenchimento: new Date(),
        
        // Salvando os novos campos da avaliação 360
        tempoJuntos: dto.tempoJuntos,
        trabalhariaNovamente: dto.trabalhariaNovamente,
        notaGeral: dto.notaGeral,
        pontosFortes: dto.pontosFortes,
        pontosMelhorar: dto.pontosMelhorar,
      },
    });
  }

  async listarPorColaborador(idColaborador: string) {
    return this.prisma.avaliacao.findMany({
      where: {
        idAvaliado: idColaborador,
      },
    });
  }
}
