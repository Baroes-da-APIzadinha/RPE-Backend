import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prismaService';
import { CreateAvaliacaoDto } from './avaliacao.dto';
import { Parser } from 'json2csv';

@Injectable()
export class AvaliacaoService {
  constructor(private prisma: PrismaService) {}

  async criarAvaliacao(data: CreateAvaliacaoDto) {
    const avaliacao = await this.prisma.avaliacao.create({
      data: {
        idCiclo: data.idCiclo,
        idAvaliador: data.idAvaliador,
        idAvaliado: data.idAvaliado,
        tipo: data.tipo,
        status: 'CONCLUIDA',
        dataPreenchimento: new Date(),
        detalhes: {
          create: data.detalhes.map((d) => ({
            idCriterio: d.idCriterio,
            nota: d.nota,
            justificativa: d.justificativa,
          })),
        },
      },
      include: { detalhes: true },
    });
    return avaliacao;
  }

  async listarEnviadas(idAvaliador: string) {
    return this.prisma.avaliacao.findMany({
      where: { idAvaliador },
      include: { detalhes: true },
    });
  }

  async listarRecebidas(idAvaliado: string) {
    return this.prisma.avaliacao.findMany({
      where: { idAvaliado },
      include: { detalhes: true },
    });
  }

  async exportarAvaliacoes() {
    const avaliacoes = await this.prisma.avaliacao.findMany({
      include: { detalhes: true },
    });
    const parser = new Parser();
    return parser.parse(avaliacoes);
  }
} 