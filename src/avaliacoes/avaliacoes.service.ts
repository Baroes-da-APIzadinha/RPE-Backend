import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from 'src/database/prismaService';
import { avaliacaoTipo, preenchimentoStatus } from '@prisma/client';
import { Motivacao } from './avaliacoes.contants';

@Injectable()
export class AvaliacoesService {
    private readonly logger = new Logger(AvaliacoesService.name);
    constructor(private readonly prisma: PrismaService) { }

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
            where: { idCiclo: cicloId }, include: { colaborador: true }
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
                        `Nenhum critério encontrado para colaborador ${colaborador.nomeCompleto} ` +
                        `(Cargo: ${colaborador.cargo}, Trilha: ${colaborador.trilhaCarreira}, ` +
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
                    `Autoavaliação criada com sucesso para ${colaborador.nomeCompleto} ` +
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

    async getAvaliacoesPorUsuarioTipo(
        idColaborador: string,
        idCiclo: string,
        tipoAvaliacao?: avaliacaoTipo // Use o enum do Prisma para tipos de avaliação
    ): Promise<any> {
        this.logger.log(
            `Buscando avaliações para colaborador ${idColaborador}, ciclo ${idCiclo}, ` +
            `tipo ${tipoAvaliacao || 'todos os tipos'}`
        );

        // Construir objeto de filtro base
        const whereFilter: any = {
            idCiclo,
            idAvaliador: idColaborador
        };

        // Adicionar filtro por tipo se fornecido
        if (tipoAvaliacao) {
            whereFilter.tipoAvaliacao = tipoAvaliacao;
        }

        const avaliacoes = await this.prisma.avaliacao.findMany({
            where: whereFilter,
            include: {
                avaliacaoPares: true,
                avaliacaoColaboradorMentor: true,
                autoAvaliacao: {
                    include: {
                        cardAutoAvaliacoes: true
                    }
                },
                avaliacaoLiderColaborador: {
                    include: {
                        cardAvaliacaoLiderColaborador: true
                    }
                },
                ciclo: true,
                avaliador: {
                    select: {
                        nomeCompleto: true
                    }
                },
                avaliado: {
                    select: {
                        nomeCompleto: true,
                    }
                }
            },
            orderBy: {
                tipoAvaliacao: 'asc'
            }
        });

        this.logger.log(`Encontradas ${avaliacoes.length} avaliações`);
        return avaliacoes;
    }

    async getAvaliacoesPorCicloStatus(
        idCiclo: string,
        status?: preenchimentoStatus  // Usando o enum preenchimentoStatus do Prisma
    ): Promise<any> {
        this.logger.log(
            `Buscando avaliações para ciclo ${idCiclo}, status ${status || 'todos'}`
        );

        // Construir objeto de filtro base
        const whereFilter: any = {
            idCiclo
        };

        // Adicionar filtro por status se fornecido
        if (status) {
            whereFilter.status = status;
        }

        const avaliacoes = await this.prisma.avaliacao.findMany({
            where: whereFilter,
            include: {
                autoAvaliacao: {
                    include: {
                        cardAutoAvaliacoes: true
                    }
                },
                avaliacaoPares: true,
                avaliacaoLiderColaborador: {
                    include: {
                        cardAvaliacaoLiderColaborador: true
                    }
                },
                avaliacaoColaboradorMentor: true,
                ciclo: true,
                avaliador: {
                    select: {
                        nomeCompleto: true
                    }
                },
                avaliado: {
                    select: {
                        nomeCompleto: true
                    }
                }
            },
            orderBy: [
                { status: 'asc' },
                { tipoAvaliacao: 'asc' }
            ]
        });

        this.logger.log(`Encontradas ${avaliacoes.length} avaliações`);
        return avaliacoes;
    }

    async preencherAvaliacaoPares(
        idAvaliacao: string,
        nota: number,
        motivacao: Motivacao,
        pontosFortes: string,
        pontosFracos: string
      ): Promise<void> {
        // Verificações extraídas
        const avaliacao = await this.prisma.avaliacao.findUnique({
          where: { idAvaliacao },
          include: { avaliacaoPares: true },
        });
        await this.verificarAvaliacaoExiste(idAvaliacao);
        this.verificarAvaliacaoTipo(avaliacao, 'AVALIACAO_PARES');
        this.verificarAvaliacaoStatus(avaliacao);
        this.verificarNota(nota);

        await this.prisma.avaliacaoPares.update({
            where: { idAvaliacao },
            data: {
                nota, // Prisma converte number para Decimal
                motivadoTrabalharNovamente: motivacao,
                pontosFortes,
                pontosFracos,
            },
        });
        await this.prisma.avaliacao.update({
            where: { idAvaliacao },
            data: { status: 'CONCLUIDA' },
        });
    }

    async preencherAvaliacaoColaboradorMentor(
        idAvaliacao: string,
        nota: number,
        justificativa: string
    ): Promise<void> {
        const avaliacao = await this.prisma.avaliacao.findUnique({
            where: { idAvaliacao },
            include: { avaliacaoColaboradorMentor: true },
        });
        await this.verificarAvaliacaoExiste(idAvaliacao);
        this.verificarAvaliacaoTipo(avaliacao, 'COLABORADOR_MENTOR');
        this.verificarAvaliacaoStatus(avaliacao);
        this.verificarNota(nota);

        await this.prisma.avaliacaoColaboradorMentor.update({
            where: { idAvaliacao },
            data: { nota, justificativa },
        });

        await this.prisma.avaliacao.update({
            where: {idAvaliacao},
            data: {status: 'CONCLUIDA'}
        })
    }

    async preencherAutoAvaliacao( idAvaliacao: string, criterios: {nome: string, nota: number, justificativa: string}[]) : Promise<void> {

        const avaliacao = await this.prisma.avaliacao.findUnique({
            where: { idAvaliacao },
            include: { autoAvaliacao: true },
        });
        await this.verificarAvaliacaoExiste(idAvaliacao);
        this.verificarAvaliacaoTipo(avaliacao, 'AUTOAVALIACAO');
        this.verificarAvaliacaoStatus(avaliacao);

        for(const criterio of criterios){
            this.verificarNota(criterio.nota);
            
            const card = await this.prisma.cardAutoAvaliacao.findFirst({
                where: {
                    idAvaliacao: idAvaliacao,
                    nomeCriterio: criterio.nome
                }
            });
            
            if (!card) {
                throw new HttpException(`Card não encontrado para critério: ${criterio.nome}`, HttpStatus.NOT_FOUND);
            }
            
            await this.prisma.cardAutoAvaliacao.update({
                where: { idCardAvaliacao: card.idCardAvaliacao },
                data: {
                    nota: criterio.nota,
                    justificativa: criterio.justificativa
                }
            });
        }
        
        await this.prisma.avaliacao.update({
            where: { idAvaliacao },
            data: { status: 'CONCLUIDA' },
        });
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

    private async verificarAvaliacaoExiste(idAvaliacao: string) {
        
        const avaliacao = await this.prisma.avaliacao.findUnique({ where: { idAvaliacao } });
        if (!avaliacao) {
            throw new HttpException('Avaliação não encontrada.', HttpStatus.NOT_FOUND);
        }
        return avaliacao;
    }

    private verificarAvaliacaoStatus(avaliacao: any) {
        if (avaliacao.status === 'CONCLUIDA') {
            throw new HttpException('Avaliação já foi concluída.', HttpStatus.BAD_REQUEST);
        }
    }

    private verificarAvaliacaoTipo(avaliacao: any, tipoEsperado: avaliacaoTipo) {
        if (avaliacao.tipoAvaliacao !== tipoEsperado) {
            throw new HttpException(`Avaliação não é do tipo ${tipoEsperado}.`, HttpStatus.BAD_REQUEST);
        }
    }

    private verificarNota(nota: number) {
        if (nota < 0 || nota > 5) {
            throw new HttpException('Nota inválida. Deve estar entre 0 e 5.', HttpStatus.BAD_REQUEST);
        }
        // Só aceita múltiplos de 0.5
        if (Math.abs(nota * 10) % 5 !== 0) {
            throw new HttpException('Nota inválida. Só são permitidos valores como 0.0, 0.5, 1.0, ..., 5.0', HttpStatus.BAD_REQUEST);
        }
    }
}
