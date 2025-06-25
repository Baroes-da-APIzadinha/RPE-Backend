import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/database/prismaService';

@Injectable()
export class AvaliacoesService {
    constructor(private readonly prisma: PrismaService) {}

    async lancarAvaliaçãoPares(idCiclo: string): Promise<void> {
        await this.verificarAvaliacoesParesLancadas(idCiclo);
        const where = { idCiclo };
        const pares = await this.prisma.pares.findMany({
            where,
            select: { idColaborador1: true, idColaborador2: true, idCiclo: true }
        });
        const avaliacoesData: any[] = [];
        for (const par of pares) {
            // A avalia B
            avaliacoesData.push({
                idCiclo: par.idCiclo,
                idAvaliador: par.idColaborador1,
                idAvaliado: par.idColaborador2,
                status: 'PENDENTE',
                tipoAvaliacao: 'AVALIACAO_PARES',
            });
            // B avalia A
            avaliacoesData.push({
                idCiclo: par.idCiclo,
                idAvaliador: par.idColaborador2,
                idAvaliado: par.idColaborador1,
                status: 'PENDENTE',
                tipoAvaliacao: 'AVALIACAO_PARES',
            });
        }
        if (avaliacoesData.length === 0) return;
        await this.prisma.$transaction(async (tx) => {
            for (const data of avaliacoesData) {
                const avaliacao = await tx.avaliacao.create({ data });
                await tx.avaliacaoPares.create({
                    data: {
                        idAvaliacao: avaliacao.idAvaliacao
                    }
                });
            }
        });
    }

    private async verificarAvaliacoesParesLancadas(idCiclo: string): Promise<void> {
        const jaLancadas = await this.prisma.avaliacao.findFirst({
            where: {
                idCiclo,
                tipoAvaliacao: 'AVALIACAO_PARES',
            },
        });
        if (jaLancadas) {
            throw new HttpException('Avaliações de pares já foram lançadas para este ciclo.', HttpStatus.CONFLICT);
        }
    }
}
