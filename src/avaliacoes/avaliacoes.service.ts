import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from 'src/database/prismaService';
import { avaliacaoTipo, preenchimentoStatus } from '@prisma/client';

@Injectable()
export class AvaliacoesService {
    private readonly logger = new Logger(AvaliacoesService.name);
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
                status: preenchimentoStatus.PENDENTE,
                tipoAvaliacao: avaliacaoTipo.AVALIACAO_PARES,
            });
            // B avalia A
            avaliacoesData.push({
                idCiclo: par.idCiclo,
                idAvaliador: par.idColaborador2,
                idAvaliado: par.idColaborador1,
                status: preenchimentoStatus.PENDENTE,
                tipoAvaliacao: avaliacaoTipo.AVALIACAO_PARES,
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
                tipoAvaliacao: avaliacaoTipo.AVALIACAO_PARES,
            },
        });
        if (jaLancadas) {
            throw new HttpException('Avaliações de pares já foram lançadas para este ciclo.', HttpStatus.CONFLICT);
        }
    }

    async lancarAutoAvaliacoes(cicloId: string): Promise<void> {
        const participantesDoCiclo = await this.prisma.colaboradorCiclo.findMany({
            where: { idCiclo: cicloId}, include: { colaborador: true }
        });
        if (participantesDoCiclo.length === 0) {
            this.logger.warn(`Nenhum colaborador associado a este ciclo. Processo encerrado.`);
            return;
        }

        for (const participante of participantesDoCiclo) {
            const colaborador = participante.colaborador;
            try {
            // 3. Buscar critérios específicos para este colaborador
            const criterios = await this.buscarCriteriosParaColaborador(
                cicloId, 
                colaborador.cargo, 
                colaborador.trilhaCarreira, 
                colaborador.unidade
            );
            
            if (criterios.length === 0) {
                this.logger.warn(
                    `Nenhum critério encontrado para colaborador ${colaborador.nomeCompleto} `+
                    `(Cargo: ${colaborador.cargo}, Trilha: ${colaborador.trilhaCarreira}, `+
                    `Unidade: ${colaborador.unidade}). Pulando autoavaliação.`
                );
                continue;
            }
            
            // 4. Criar avaliação principal
            const avaliacao = await this.prisma.avaliacao.create({
                data: {
                    idCiclo: cicloId,
                    idAvaliado: colaborador.idColaborador,
                    idAvaliador: colaborador.idColaborador,
                    tipoAvaliacao: avaliacaoTipo.AUTOAVALIACAO,
                    status: preenchimentoStatus.PENDENTE,
                    // 5. Criar autoAvaliação relacionada
                    autoAvaliacao: {
                        create: {
                            // 6. Criar cards de avaliação para cada critério
                            cardAutoAvaliacoes: {
                                createMany: {
                                    data: criterios.map(criterio => ({
                                        nomeCriterio: criterio.nomeCriterio,
                                    }))
                                }
                            }
                        }
                    }
                }
            });
            
            this.logger.log(
                `Autoavaliação criada com sucesso para ${colaborador.nomeCompleto} `+
                `com ${criterios.length} critérios`
            );
        } catch (error) {
            this.logger.error(
                `Erro ao criar autoavaliação para ${colaborador.nomeCompleto}: ${error.message}`,
                error.stack
            );
            }
        }
        this.logger.log(`Processo de lançamento de autoavaliações concluído`);
    }


    private async buscarCriteriosParaColaborador(
        idCiclo: string,
        cargo?: string | null,
        trilhaCarreira?: string | null,
        unidade?: string | null
    ): Promise<Array<{ idCriterio: string; nomeCriterio: string }>> {
        // Buscar associações de critérios para o ciclo que correspondam ao perfil do colaborador
        // Ordenação de prioridade: específico > geral
        const associacoesCriterios = await this.prisma.associacaoCriterioCiclo.findMany({
            where: {
                idCiclo,
                AND: [
                    {
                        OR: [
                            { cargo: cargo || null },
                            { cargo: null }
                        ]
                    },
                    {
                        OR: [
                            { trilhaCarreira: trilhaCarreira || null },
                            { trilhaCarreira: null }
                        ]
                    },
                    {
                        OR: [
                            { unidade: unidade || null },
                            { unidade: null }
                        ]
                    }
                ]
            },
            include: {
                criterio: true
            },
            orderBy: [
                // Priorizar critérios mais específicos (não nulos)
                { cargo: cargo ? 'desc' : 'asc' },
                { trilhaCarreira: trilhaCarreira ? 'desc' : 'asc' },
                { unidade: unidade ? 'desc' : 'asc' }
            ]
        });

        // Eliminar duplicatas, mantendo apenas o critério mais específico
        const criterioMap = new Map<string, { idCriterio: string; nomeCriterio: string }>();
        
        for (const associacao of associacoesCriterios) {
            // Se ainda não temos este critério OU o que temos é menos específico
            if (!criterioMap.has(associacao.idCriterio)) {
                criterioMap.set(associacao.idCriterio, {
                    idCriterio: associacao.criterio.idCriterio,
                    nomeCriterio: associacao.criterio.nomeCriterio
                });
            }
        }
        
        return Array.from(criterioMap.values());
    }

    async listarAvaliacoesComite() {
        // Busca todas as equalizações, agrupando por colaborador avaliado
        const equalizacoes = await this.prisma.equalizacao.findMany({
            include: {
                alvo: {
                    select: { idColaborador: true, nomeCompleto: true }
                },
                membroComite: {
                    select: { idColaborador: true, nomeCompleto: true }
                }
            },
            orderBy: { dataEqualizacao: 'desc' }
        });

        // Agrupa por colaborador avaliado
        const agrupado: Record<string, any> = {};
        for (const eq of equalizacoes) {
            const id = eq.idAvaliado;
            if (!agrupado[id]) {
                agrupado[id] = {
                    colaborador: eq.alvo,
                    equalizacoes: []
                };
            }
            agrupado[id].equalizacoes.push({
                idEqualizacao: eq.idEqualizacao,
                membroComite: eq.membroComite,
                notaAjustada: eq.notaAjustada,
                justificativa: eq.justificativa,
                status: eq.status,
                dataEqualizacao: eq.dataEqualizacao
            });
        }
        // Retorna como array
        return Object.values(agrupado);
    }

    /**
     * Busca o histórico de avaliações em que o usuário é líder
     */
    async historicoComoLider(userId: string) {
        // Busca todos os ciclos em que o usuário é líder
        const liderancas = await this.prisma.liderColaborador.findMany({
            where: { idLider: userId },
            select: { idColaborador: true, idCiclo: true }
        });
        if (liderancas.length === 0) return [];
        // Busca avaliações dos liderados nesses ciclos
        const avaliacoes = await this.prisma.avaliacao.findMany({
            where: {
                tipoAvaliacao: avaliacaoTipo.LIDER_COLABORADOR,
                OR: liderancas.map(l => ({
                    idAvaliado: l.idColaborador,
                    idCiclo: l.idCiclo
                }))
            },
            include: {
                avaliado: { select: { idColaborador: true, nomeCompleto: true } },
                ciclo: { select: { idCiclo: true, nomeCiclo: true } },
                avaliacaoLiderColaborador: true
            },
            orderBy: { idCiclo: 'desc' }
        });
        return avaliacoes;
    }
}
