import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from 'src/database/prismaService';
import { avaliacaoTipo, preenchimentoStatus } from '@prisma/client';
import { Motivacao } from './avaliacoes.contants';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AvaliacoesService {
    private readonly logger = new Logger(AvaliacoesService.name);
    constructor(private readonly prisma: PrismaService) { }

    // =================== MÉTODOS PÚBLICOS ===================

    async lancarAvaliacoes(idCiclo: string): Promise<{ relatorio: any }> {
        await this.verificarCicloAtivo(idCiclo);

        // Relatório geral
        const relatorio = {
            autoavaliacao: { lancadas: 0, existentes: 0, erros: 0 },
            avaliacaopares: { lancadas: 0, existentes: 0, erros: 0 },
            avaliacaoLiderColaborador: { lancadas: 0, existentes: 0, erros: 0 },
            avaliacaoColaboradorMentor: { lancadas: 0, existentes: 0, erros: 0 }
        };

        relatorio.autoavaliacao = await this.lancarAutoAvaliacoes(idCiclo);
        relatorio.avaliacaopares = await this.lancarAvaliaçãoPares(idCiclo);
        relatorio.avaliacaoLiderColaborador = await this.lancarAvaliacaoLiderColaborador(idCiclo);
        relatorio.avaliacaoColaboradorMentor = await this.lancarAvaliacaoColaboradorMentor(idCiclo)

        return { relatorio };
    }

    async lancarAvaliaçãoPares(idCiclo: string): Promise<{ lancadas: number, existentes: number, erros: number }> {
        const where = { idCiclo };
        const pares = await this.prisma.pares.findMany({
            where,
            select: { idColaborador1: true, idColaborador2: true, idCiclo: true }
        });

        // Buscar todas as avaliações de pares já existentes para o ciclo
        const avaliacoesExistentes = await this.prisma.avaliacao.findMany({
            where: {
                idCiclo,
                tipoAvaliacao: 'AVALIACAO_PARES'
            },
            select: { idAvaliador: true, idAvaliado: true }
        });
        const avaliacaoSet = new Set(avaliacoesExistentes.map(a => `${a.idAvaliador}-${a.idAvaliado}`));

        let lancadas = 0, existentes = 0, erros = 0;
        const avaliacoesData: any[] = [];
        for (const par of pares) {
            // Pular se algum id for nulo
            if (!par.idColaborador1 || !par.idColaborador2) continue;

            // A avalia B
            const chaveAB = `${par.idColaborador1}-${par.idColaborador2}`;
            if (avaliacaoSet.has(chaveAB)) {
                existentes++;
            } else {
                avaliacoesData.push({
                    idCiclo: par.idCiclo,
                    idAvaliador: par.idColaborador1,
                    idAvaliado: par.idColaborador2,
                    status: 'PENDENTE',
                    tipoAvaliacao: 'AVALIACAO_PARES',
                });
            }

            // B avalia A
            const chaveBA = `${par.idColaborador2}-${par.idColaborador1}`;
            if (avaliacaoSet.has(chaveBA)) {
                existentes++;
            } else {
                avaliacoesData.push({
                    idCiclo: par.idCiclo,
                    idAvaliador: par.idColaborador2,
                    idAvaliado: par.idColaborador1,
                    status: 'PENDENTE',
                    tipoAvaliacao: 'AVALIACAO_PARES',
                });
            }
        }
        if (avaliacoesData.length === 0) return { lancadas, existentes, erros };

        await this.prisma.$transaction(async (tx) => {
            for (const data of avaliacoesData) {
                try {
                    const avaliacao = await tx.avaliacao.create({ data });
                    await tx.avaliacaoPares.create({
                        data: {
                            idAvaliacao: avaliacao.idAvaliacao
                        }
                    });
                    lancadas++;
                } catch (error) {
                    erros++;
                }
            }
        });

        return { lancadas, existentes, erros };
    }

    async lancarAutoAvaliacoes(cicloId: string): Promise<{ lancadas: number, existentes: number, erros: number }> {
        const participantesDoCiclo = await this.prisma.colaboradorCiclo.findMany({
            where: {
                idCiclo: cicloId
            },
            include: {
                colaborador: {
                    include: {
                        perfis: true
                    }
                }
            }
        });

        if (participantesDoCiclo.length === 0) {
            this.logger.warn(`Nenhum colaborador associado a este ciclo. Processo encerrado.`);
            return { lancadas: 0, existentes: 0, erros: 0 };
        }

        // Filtrar apenas colaboradores com perfil COLABORADOR_COMUM
        const colaboradoresComuns = participantesDoCiclo.filter(participante =>
            participante.colaborador.perfis.some(perfil => perfil.tipoPerfil === 'COLABORADOR_COMUM')
        );

        if (colaboradoresComuns.length === 0) {
            this.logger.warn(`Nenhum colaborador com perfil COLABORADOR_COMUM encontrado neste ciclo. Processo encerrado.`);
            return { lancadas: 0, existentes: 0, erros: 0 };
        }

        // Buscar todas as autoavaliações já existentes para o ciclo
        const avaliacoesExistentes = await this.prisma.avaliacao.findMany({
            where: {
                idCiclo: cicloId,
                tipoAvaliacao: 'AUTOAVALIACAO'
            },
            select: { idAvaliado: true }
        });
        const avaliadosSet = new Set(avaliacoesExistentes.map(a => a.idAvaliado));

        let lancadas = 0, existentes = 0, erros = 0;

        for (const participante of colaboradoresComuns) {
            const colaborador = participante.colaborador;
            if (avaliadosSet.has(colaborador.idColaborador)) {
                this.logger.warn(`Autoavaliação já existe para ${colaborador.nomeCompleto}, pulando.`);
                existentes++;
                continue;
            }
            try {
                const criterios = await this.buscarCriteriosParaColaborador(
                    cicloId,
                    this.toStrUndef(colaborador.cargo),
                    this.toStrUndef(colaborador.trilhaCarreira),
                    this.toStrUndef(colaborador.unidade)
                );

                if (criterios.length === 0) {
                    this.logger.warn(
                        `Nenhum critério encontrado para colaborador ${colaborador.nomeCompleto} ` +
                        `(Cargo: ${colaborador.cargo}, Trilha: ${colaborador.trilhaCarreira}, ` +
                        `Unidade: ${colaborador.unidade}). Pulando autoavaliação.`
                    );
                    erros++;
                    continue;
                }

                await this.prisma.avaliacao.create({
                    data: {
                        idCiclo: cicloId,
                        idAvaliado: colaborador.idColaborador,
                        idAvaliador: colaborador.idColaborador,
                        tipoAvaliacao: 'AUTOAVALIACAO',
                        status: 'PENDENTE',
                        autoAvaliacao: {
                            create: {
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
                lancadas++;
                this.logger.log(
                    `Autoavaliação criada com sucesso para ${colaborador.nomeCompleto} ` +
                    `com ${criterios.length} critérios`
                );
            } catch (error) {
                this.logger.error(
                    `Erro ao criar autoavaliação para ${colaborador.nomeCompleto}: ${error.message}`,
                    error.stack
                );
                erros++;
            }
        }
        this.logger.log(`Processo de lançamento de autoavaliações concluído`);
        return { lancadas, existentes, erros };
    }

    async lancarAvaliacaoLiderColaborador(idCiclo: string): Promise<{ lancadas: number, existentes: number, erros: number }> {
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
            return { lancadas: 0, existentes: 0, erros: 0 };
        }

        // Buscar todas as avaliações já existentes desse tipo para o ciclo
        const avaliacoesExistentes = await this.prisma.avaliacao.findMany({
            where: {
                idCiclo,
                tipoAvaliacao: 'LIDER_COLABORADOR'
            },
            select: { idAvaliador: true, idAvaliado: true }
        });
        const avaliacaoSet = new Set(avaliacoesExistentes.map(a => `${a.idAvaliador}-${a.idAvaliado}`));

        let lancadas = 0, existentes = 0, erros = 0;

        await this.prisma.$transaction(async (tx) => {
            for (const relacao of lideresColaboradores) {
                const chave = `${relacao.idLider}-${relacao.idColaborador}`;
                if (avaliacaoSet.has(chave)) {
                    existentes++;
                    continue;
                }
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
                        erros++;
                        continue;
                    }

                    // Criar a avaliação principal
                    await tx.avaliacao.create({
                        data: {
                            idCiclo,
                            idAvaliador: relacao.idLider,
                            idAvaliado: relacao.idColaborador,
                            tipoAvaliacao: 'LIDER_COLABORADOR',
                            status: 'PENDENTE',
                            avaliacaoLiderColaborador: {
                                create: {
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

                    lancadas++;
                    this.logger.log(
                        `Avaliação líder-colaborador criada: Líder ${relacao.lider.nomeCompleto} -> ` +
                        `Colaborador ${relacao.colaborador.nomeCompleto} com ${criterios.length} critérios`
                    );

                } catch (error) {
                    this.logger.error(
                        `Erro ao criar avaliação líder-colaborador: ${error.message}`,
                        error.stack
                    );
                    erros++;
                }
            }
        });

        this.logger.log(`Processo de lançamento de avaliações líder-colaborador concluído`);
        return { lancadas, existentes, erros };
    }

    async lancarAvaliacaoColaboradorMentor(idCiclo: string): Promise<{ lancadas: number, existentes: number, erros: number }> {
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
            return { lancadas: 0, existentes: 0, erros: 0 };
        }

        // Buscar todas as avaliações já existentes desse tipo para o ciclo
        const avaliacoesExistentes = await this.prisma.avaliacao.findMany({
            where: {
                idCiclo,
                tipoAvaliacao: 'COLABORADOR_MENTOR'
            },
            select: { idAvaliador: true, idAvaliado: true }
        });
        const avaliacaoSet = new Set(avaliacoesExistentes.map(a => `${a.idAvaliador}-${a.idAvaliado}`));

        let lancadas = 0, existentes = 0, erros = 0;

        await this.prisma.$transaction(async (tx) => {
            for (const relacao of mentoresColaboradores) {
                const chave = `${relacao.idColaborador}-${relacao.idMentor}`;
                if (avaliacaoSet.has(chave)) {
                    existentes++;
                    continue;
                }
                try {
                    // Criar a avaliação principal
                    await tx.avaliacao.create({
                        data: {
                            idCiclo,
                            idAvaliador: relacao.idColaborador, // Colaborador avalia
                            idAvaliado: relacao.idMentor,       // Mentor é avaliado
                            tipoAvaliacao: 'COLABORADOR_MENTOR',
                            status: 'PENDENTE',
                            avaliacaoColaboradorMentor: {
                                create: {}
                            }
                        }
                    });

                    lancadas++;
                    this.logger.log(
                        `Avaliação colaborador-mentor criada: Colaborador ${relacao.colaborador.nomeCompleto} -> ` +
                        `Mentor ${relacao.mentor.nomeCompleto}`
                    );

                } catch (error) {
                    this.logger.error(
                        `Erro ao criar avaliação colaborador-mentor: ${error.message}`,
                        error.stack
                    );
                    erros++;
                }
            }
        });

        this.logger.log(`Processo de lançamento de avaliações colaborador-mentor concluído`);
        return { lancadas, existentes, erros };
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
            where: { idAvaliacao },
            data: { status: 'CONCLUIDA' }
        })
    }

    async preencherAutoAvaliacao(idAvaliacao: string, criterios: { nome: string, nota: number, justificativa: string }[]): Promise<void> {
        const avaliacao = await this.prisma.avaliacao.findUnique({
            where: { idAvaliacao },
            include: { autoAvaliacao: true },
        });
        await this.verificarAvaliacaoExiste(idAvaliacao);
        this.verificarAvaliacaoTipo(avaliacao, 'AUTOAVALIACAO');
        this.verificarAvaliacaoStatus(avaliacao);

        // Verificar se o número de critérios não excede o número de cards existentes
        await this.verificarQuantidadeCriterios(idAvaliacao, criterios.length, 1);

        let soma = 0;
        let soma_pesos = 0;
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

            const criterioAvaliativo = await this.prisma.criterioAvaliativo.findFirst({
                where : {
                    nomeCriterio : criterio.nome
                }
            })

            const peso = criterioAvaliativo?.peso ? criterioAvaliativo.peso.toNumber() : 1;
            soma += peso * criterio.nota;
            soma_pesos += peso;
            
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
        
        let nota_final = soma_pesos > 0 ? soma / soma_pesos : 0;

        await this.prisma.autoAvaliacao.update({
            where: { idAvaliacao },
            data: {notaFinal: nota_final}
        })
    }

    async preencherAvaliacaoLiderColaborador(idAvaliacao: string, criterios: { nome: string, nota: number, justificativa: string }[]): Promise<void> {
        const avaliacao = await this.prisma.avaliacao.findUnique({
            where: { idAvaliacao },
            include: { avaliacaoLiderColaborador: true },
        });
        await this.verificarAvaliacaoExiste(idAvaliacao);
        this.verificarAvaliacaoTipo(avaliacao, 'LIDER_COLABORADOR');
        this.verificarAvaliacaoStatus(avaliacao);
        await this.verificarQuantidadeCriterios(idAvaliacao, criterios.length, 2);

        let soma = 0;
        let soma_pesos = 0;
        for(const criterio of criterios){
            this.verificarNota(criterio.nota);
            
            const card = await this.prisma.cardAvaliacaoLiderColaborador.findFirst({
                where: {
                    idAvaliacao: idAvaliacao,
                    nomeCriterio: criterio.nome
                }
            });
            
            if (!card) {
                throw new HttpException(`Card não encontrado para critério: ${criterio.nome}`, HttpStatus.NOT_FOUND);
            }
            
            const criterioAvaliativo = await this.prisma.criterioAvaliativo.findFirst({
                where : {
                    nomeCriterio : criterio.nome
                }
            })
            const peso = criterioAvaliativo?.peso ? criterioAvaliativo.peso.toNumber() : 1;
            soma += peso * criterio.nota;
            soma_pesos += peso;
            
            await this.prisma.cardAvaliacaoLiderColaborador.update({
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
        
        let nota_final = soma_pesos > 0 ? soma / soma_pesos : 0;

        await this.prisma.avaliacaoLiderColaborador.update({
            where: { idAvaliacao },
            data: {notaFinal: nota_final}
        })
    }

    // =================== MÉTODOS PRIVADOS ===================

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

    private async verificarQuantidadeCriterios(idAvaliacao: string, quantidadeCriteriosEnviados: number, tipo: number): Promise<void> {


        if (!tipo || tipo !== 1 && tipo !== 2 || typeof tipo !== 'number') {
            throw new HttpException(
                `Tipo nao enviado ou incorreto pra funcao verificarQuantidadeCriterio no arquivo avaliacoes.service.`,
                HttpStatus.BAD_REQUEST
            );
        }
        if (tipo === 1) {
            const quantidadeCardsExistentes1 = await this.prisma.cardAutoAvaliacao.count({
                where: { idAvaliacao }
            });

            if (quantidadeCriteriosEnviados !== quantidadeCardsExistentes1) {
                throw new HttpException(
                    `Quantidade de critérios enviados (${quantidadeCriteriosEnviados}) é diferente da quantidade de cards de avaliação existentes (${quantidadeCardsExistentes1}).`,
                    HttpStatus.BAD_REQUEST
                );
            }
        }

        else if (tipo === 2) {
            const quantidadeCardsExistentes2 = await this.prisma.cardAvaliacaoLiderColaborador.count({
                where: { idAvaliacao }
            });

            if (quantidadeCriteriosEnviados !== quantidadeCardsExistentes2) {
                throw new HttpException(
                    `Quantidade de critérios enviados (${quantidadeCriteriosEnviados}) é diferente da quantidade de cards de avaliação existentes (${quantidadeCardsExistentes2}).`,
                    HttpStatus.BAD_REQUEST
                );
            }
        }


    }

    private async verificarCicloAtivo(idCiclo: string): Promise<void> {
        const ciclo = await this.prisma.cicloAvaliacao.findUnique({
            where: { idCiclo }
        });

        if (!ciclo) {
            throw new HttpException(
                `Ciclo de avaliação com ID ${idCiclo} não encontrado.`,
                HttpStatus.NOT_FOUND
            );
        }

        if (ciclo.status === 'FECHADO') {
            throw new HttpException(
                `Ciclo de avaliação '${ciclo.nomeCiclo}' está fechado e não permite operações.`,
                HttpStatus.BAD_REQUEST
            );
        }


        this.logger.debug(
            `Ciclo de avaliação '${ciclo.nomeCiclo}' verificado e ativo para operações.`
        );
    }

    private toStrUndef(value?: string | null): string | undefined {
        return value || undefined;
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
