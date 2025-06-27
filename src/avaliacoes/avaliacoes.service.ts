import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from 'src/database/prismaService';

@Injectable()
export class AvaliacoesService {
    private readonly logger = new Logger(AvaliacoesService.name);
    constructor(private readonly prisma: PrismaService) {}

    // =================== MÉTODOS PÚBLICOS ===================

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

    async lancarAutoAvaliacoes(cicloId: string): Promise<void> {
        await this.verificarAutoAvaliacoesLancadas(cicloId);
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
                    tipoAvaliacao: 'AUTOAVALIACAO',
                    status: 'PENDENTE',
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

    async lancarAvaliacaoLiderColaborador(idCiclo: string): Promise<void> {
        await this.verificarAvaliacoesLiderColaboradorLancadas(idCiclo);
        this.logger.log(`Iniciando lançamento de avaliações líder-colaborador para ciclo ${idCiclo}`);
        
        // Buscar todas as relações líder-colaborador do ciclo
        const lideresColaboradores = await this.prisma.liderColaborador.findMany({
            where: { idCiclo },
            include: {
                lider: true,
                colaborador: true
            }
        });
        
        if (lideresColaboradores.length === 0) {
            this.logger.warn(`Nenhuma relação líder-colaborador encontrada para este ciclo. Processo encerrado.`);
            return;
        }
        
        await this.prisma.$transaction(async (tx) => {
            for (const relacao of lideresColaboradores) {
                try {
                    // Buscar critérios específicos para este colaborador
                    const criterios = await this.buscarCriteriosParaColaborador(
                        idCiclo,
                        relacao.colaborador.cargo,
                        relacao.colaborador.trilhaCarreira,
                        relacao.colaborador.unidade
                    );
                    
                    if (criterios.length === 0) {
                        this.logger.warn(
                            `Nenhum critério encontrado para colaborador ${relacao.colaborador.nomeCompleto}. ` +
                            `Pulando avaliação líder-colaborador.`
                        );
                        continue;
                    }
                    
                    // Criar a avaliação principal
                    const avaliacao = await tx.avaliacao.create({
                        data: {
                            idCiclo,
                            idAvaliador: relacao.idLider,
                            idAvaliado: relacao.idColaborador,
                            tipoAvaliacao: 'LIDER_COLABORADOR',
                            status: 'PENDENTE',
                            // Criar a estrutura específica de avaliação líder-colaborador
                            avaliacaoLiderColaborador: {
                                create: {
                                    // Criar cards para cada critério
                                    cardAvaliacaoLiderColaborador: {
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
                        `Avaliação líder-colaborador criada: Líder ${relacao.lider.nomeCompleto} -> ` +
                        `Colaborador ${relacao.colaborador.nomeCompleto} com ${criterios.length} critérios`
                    );
                    
                } catch (error) {
                    this.logger.error(
                        `Erro ao criar avaliação líder-colaborador: ${error.message}`,
                        error.stack
                    );
                    // Continua o processo mesmo com erro em uma avaliação específica
                }
            }
        });
        
        this.logger.log(`Processo de lançamento de avaliações líder-colaborador concluído`);
    }

    async lancarAvaliacaoColaboradorMentor(idCiclo: string): Promise<void> {
        await this.verificarAvaliacoesColaboradorMentorLancadas(idCiclo);
        this.logger.log(`Iniciando lançamento de avaliações colaborador-mentor para ciclo ${idCiclo}`);
        
        // Buscar todas as relações mentor-colaborador do ciclo
        const mentoresColaboradores = await this.prisma.mentorColaborador.findMany({
            where: { idCiclo },
            include: {
                mentor: true,
                colaborador: true
            }
        });
        
        if (mentoresColaboradores.length === 0) {
            this.logger.warn(`Nenhuma relação mentor-colaborador encontrada para este ciclo. Processo encerrado.`);
            return;
        }
        
        await this.prisma.$transaction(async (tx) => {
            for (const relacao of mentoresColaboradores) {
                try {
                    // Criar a avaliação principal
                    const avaliacao = await tx.avaliacao.create({
                        data: {
                            idCiclo,
                            idAvaliador: relacao.idColaborador, // Colaborador avalia
                            idAvaliado: relacao.idMentor,       // Mentor é avaliado
                            tipoAvaliacao: 'COLABORADOR_MENTOR',
                            status: 'PENDENTE',
                            // Criar a estrutura específica de avaliação colaborador-mentor
                            avaliacaoColaboradorMentor: {
                                create: {}
                            }
                        }
                    });
                    
                    this.logger.log(
                        `Avaliação colaborador-mentor criada: Colaborador ${relacao.colaborador.nomeCompleto} -> ` +
                        `Mentor ${relacao.mentor.nomeCompleto}`
                    );
                    
                } catch (error) {
                    this.logger.error(
                        `Erro ao criar avaliação colaborador-mentor: ${error.message}`,
                        error.stack
                    );
                    // Continua o processo mesmo com erro em uma avaliação específica
                }
            }
        });
        
        this.logger.log(`Processo de lançamento de avaliações colaborador-mentor concluído`);
    }


    // =================== MÉTODOS PRIVADOS ===================

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

    private async verificarAutoAvaliacoesLancadas(idCiclo: string): Promise<void> {
        const jaLancadas = await this.prisma.avaliacao.findFirst({
            where: {
                idCiclo,
                tipoAvaliacao: 'AUTOAVALIACAO',
            },
        });
        if (jaLancadas) {
            throw new HttpException('Autoavaliações já foram lançadas para este ciclo.', HttpStatus.CONFLICT);
        }
    }

    private async verificarAvaliacoesLiderColaboradorLancadas(idCiclo: string): Promise<void> {
        const jaLancadas = await this.prisma.avaliacao.findFirst({
            where: {
                idCiclo,
                tipoAvaliacao: 'LIDER_COLABORADOR',
            },
        });
        if (jaLancadas) {
            throw new HttpException(
                'Avaliações de líder para colaborador já foram lançadas para este ciclo.',
                HttpStatus.CONFLICT
            );
        }
    }

    private async verificarAvaliacoesColaboradorMentorLancadas(idCiclo: string): Promise<void> {
        const jaLancadas = await this.prisma.avaliacao.findFirst({
            where: {
                idCiclo,
                tipoAvaliacao: 'COLABORADOR_MENTOR',
            },
        });
        if (jaLancadas) {
            throw new HttpException(
                'Avaliações de colaborador para mentor já foram lançadas para este ciclo.',
                HttpStatus.CONFLICT
            );
        }
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

    
}
