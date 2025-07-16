import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from 'src/database/prismaService';
import { Prisma } from '@prisma/client';
import { avaliacaoTipo, preenchimentoStatus } from '@prisma/client';
import { Motivacao, RelatorioItem, Status } from './avaliacoes.constants';
import { Decimal } from '@prisma/client/runtime/library';
import { HashService } from '../common/hash.service';

@Injectable()
export class AvaliacoesService {
    private readonly logger = new Logger(AvaliacoesService.name);
    constructor(
        private readonly prisma: PrismaService,
        private readonly hashService: HashService,
    ) { }

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
        relatorio.avaliacaopares = await this.lancarAvaliacaoPares(idCiclo);
        relatorio.avaliacaoLiderColaborador = await this.lancarAvaliacaoLiderColaborador(idCiclo);
        relatorio.avaliacaoColaboradorMentor = await this.lancarAvaliacaoColaboradorMentor(idCiclo)

        return { relatorio };
    }

    async lancarAvaliacaoPares(idCiclo: string): Promise<{ lancadas: number, existentes: number, erros: number }> {
        this.logger.log(`Iniciando lançamento de avaliações de pares para ciclo ${idCiclo}`);

        try {
            await this.gerarParesPorProjetos(idCiclo);

            const [pares, avaliacoesExistentes] = await Promise.all([
                this.prisma.pares.findMany({
                    where: { idCiclo },
                    select: { idColaborador1: true, idColaborador2: true }
                }),
                this.prisma.avaliacao.findMany({
                    where: { idCiclo, tipoAvaliacao: 'AVALIACAO_PARES' },
                    select: { idAvaliador: true, idAvaliado: true }
                })
            ]);
            this.logger.log(`Total de pares encontrados para o ciclo ${idCiclo}: ${pares.length}`);

            const avaliacaoSet = new Set(avaliacoesExistentes.map(a => `${a.idAvaliador}-${a.idAvaliado}`));
            const novasAvaliacoesParaCriar: Prisma.AvaliacaoCreateManyInput[] = [];

            for (const par of pares) {
                if (!par.idColaborador1 || !par.idColaborador2) continue;

                if (!avaliacaoSet.has(`${par.idColaborador1}-${par.idColaborador2}`)) {
                    novasAvaliacoesParaCriar.push({
                        idCiclo,
                        idAvaliador: par.idColaborador1,
                        idAvaliado: par.idColaborador2,
                        status: 'PENDENTE',
                        tipoAvaliacao: 'AVALIACAO_PARES',
                    });
                }
                if (!avaliacaoSet.has(`${par.idColaborador2}-${par.idColaborador1}`)) {
                    novasAvaliacoesParaCriar.push({
                        idCiclo,
                        idAvaliador: par.idColaborador2,
                        idAvaliado: par.idColaborador1,
                        status: 'PENDENTE',
                        tipoAvaliacao: 'AVALIACAO_PARES',
                    });
                }
            }

            const existentes = (pares.length * 2) - novasAvaliacoesParaCriar.length;
            if (novasAvaliacoesParaCriar.length === 0) {
                this.logger.log('Nenhuma nova avaliação de pares a ser lançada.');
                return { lancadas: 0, existentes, erros: 0 };
            }

            await this.prisma.$transaction(async (tx) => {
                await tx.avaliacao.createMany({
                    data: novasAvaliacoesParaCriar,
                });

                const chavesUnicas = novasAvaliacoesParaCriar.map(d => ({
                    idAvaliador: d.idAvaliador,
                    idAvaliado: d.idAvaliado,
                }));
                const avaliacoesCriadas = await tx.avaliacao.findMany({
                    where: { idCiclo, tipoAvaliacao: 'AVALIACAO_PARES', OR: chavesUnicas },
                    select: { idAvaliacao: true }
                });

                const dadosAvaliacaoPares = avaliacoesCriadas.map(a => ({
                    idAvaliacao: a.idAvaliacao
                }));

                await tx.avaliacaoPares.createMany({
                    data: dadosAvaliacaoPares,
                });
            });

            this.logger.log(`${novasAvaliacoesParaCriar.length} avaliações de pares lançadas com sucesso.`);
            return { lancadas: novasAvaliacoesParaCriar.length, existentes, erros: 0 };

        } catch (error) {
            this.logger.error(`Falha catastrófica ao lançar avaliações de pares para o ciclo ${idCiclo}`, error.stack);
            return { lancadas: 0, existentes: 0, erros: 1 };
        }
    }

    async lancarAutoAvaliacoes(idCiclo: string): Promise<{ lancadas: number, existentes: number, erros: number }> {
        this.logger.log(`Iniciando lançamento de autoavaliaçõess para ciclo ${idCiclo}`);
        const participantesDoCiclo = await this.prisma.colaboradorCiclo.findMany({
            where: {
                idCiclo: idCiclo
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
                idCiclo: idCiclo,
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
                    idCiclo,
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
                        idCiclo: idCiclo,
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

        await this.gerarLiderColaboradorPorProjetos(idCiclo);

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

        // Gera as relações mentor-colaborador para o ciclo antes de lançar avaliações
        await this.gerarMentorColaboradorPorCiclo(idCiclo);

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

        // Descriptografar justificativas
        const avaliacoesComJustificativasDescriptografadas = avaliacoes.map(avaliacao => {
            // Descriptografar justificativas de autoavaliação
            if (avaliacao.autoAvaliacao?.cardAutoAvaliacoes) {
                avaliacao.autoAvaliacao.cardAutoAvaliacoes = avaliacao.autoAvaliacao.cardAutoAvaliacoes.map(card => ({
                    ...card,
                    justificativa: card.justificativa ? this.hashService.decrypt(card.justificativa) : null
                }));
            }

            // Descriptografar justificativas de avaliação líder-colaborador
            if (avaliacao.avaliacaoLiderColaborador?.cardAvaliacaoLiderColaborador) {
                avaliacao.avaliacaoLiderColaborador.cardAvaliacaoLiderColaborador = avaliacao.avaliacaoLiderColaborador.cardAvaliacaoLiderColaborador.map(card => ({
                    ...card,
                    justificativa: card.justificativa ? this.hashService.decrypt(card.justificativa) : null
                }));
            }

            // Descriptografar justificativa de avaliação colaborador-mentor
            if (avaliacao.avaliacaoColaboradorMentor?.justificativa) {
                avaliacao.avaliacaoColaboradorMentor.justificativa = this.hashService.decrypt(avaliacao.avaliacaoColaboradorMentor.justificativa);
            }

            // Descriptografar pontos fortes e fracos de avaliação de pares
            if (avaliacao.avaliacaoPares) {
                if (avaliacao.avaliacaoPares.pontosFortes) {
                    avaliacao.avaliacaoPares.pontosFortes = this.hashService.decrypt(avaliacao.avaliacaoPares.pontosFortes);
                }
                if (avaliacao.avaliacaoPares.pontosFracos) {
                    avaliacao.avaliacaoPares.pontosFracos = this.hashService.decrypt(avaliacao.avaliacaoPares.pontosFracos);
                }
            }

            return avaliacao;
        });

        this.logger.log(`Encontradas ${avaliacoesComJustificativasDescriptografadas.length} avaliações`);
        return avaliacoesComJustificativasDescriptografadas;
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

        // Descriptografar justificativas
        const avaliacoesComJustificativasDescriptografadas = avaliacoes.map(avaliacao => {
            // Descriptografar justificativas de autoavaliação
            if (avaliacao.autoAvaliacao?.cardAutoAvaliacoes) {
                avaliacao.autoAvaliacao.cardAutoAvaliacoes = avaliacao.autoAvaliacao.cardAutoAvaliacoes.map(card => ({
                    ...card,
                    justificativa: card.justificativa ? this.hashService.decrypt(card.justificativa) : null
                }));
            }

            // Descriptografar justificativas de avaliação líder-colaborador
            if (avaliacao.avaliacaoLiderColaborador?.cardAvaliacaoLiderColaborador) {
                avaliacao.avaliacaoLiderColaborador.cardAvaliacaoLiderColaborador = avaliacao.avaliacaoLiderColaborador.cardAvaliacaoLiderColaborador.map(card => ({
                    ...card,
                    justificativa: card.justificativa ? this.hashService.decrypt(card.justificativa) : null
                }));
            }

            // Descriptografar justificativa de avaliação colaborador-mentor
            if (avaliacao.avaliacaoColaboradorMentor?.justificativa) {
                avaliacao.avaliacaoColaboradorMentor.justificativa = this.hashService.decrypt(avaliacao.avaliacaoColaboradorMentor.justificativa);
            }

            // Descriptografar pontos fortes e fracos de avaliação de pares
            if (avaliacao.avaliacaoPares) {
                if (avaliacao.avaliacaoPares.pontosFortes) {
                    avaliacao.avaliacaoPares.pontosFortes = this.hashService.decrypt(avaliacao.avaliacaoPares.pontosFortes);
                }
                if (avaliacao.avaliacaoPares.pontosFracos) {
                    avaliacao.avaliacaoPares.pontosFracos = this.hashService.decrypt(avaliacao.avaliacaoPares.pontosFracos);
                }
            }

            return avaliacao;
        });

        this.logger.log(`Encontradas ${avaliacoesComJustificativasDescriptografadas.length} avaliações`);
        return avaliacoesComJustificativasDescriptografadas;
    }

    async preencherAvaliacaoPares(
        idAvaliacao: string,
        status : Status,
        nota?: number,
        motivacao?: Motivacao,
        pontosFortes?: string,
        pontosFracos?: string
    ): Promise<void> {
        // Verificações extraídas
        const avaliacao = await this.prisma.avaliacao.findUnique({
            where: { idAvaliacao },
            include: { avaliacaoPares: true },
        });
        await this.verificarAvaliacaoExiste(idAvaliacao);
        this.verificarAvaliacaoTipo(avaliacao, 'AVALIACAO_PARES');
        this.verificarAvaliacaoStatus(avaliacao);
        
        const data: any = {};
        if (nota !== undefined) {
            this.verificarNota(nota);
            data.nota = nota;
        }
        if (motivacao !== undefined){
            data.motivadoTrabalharNovamente = motivacao
        }

        if (pontosFortes !== undefined){
            data.pontosFortes = this.hashService.hash(pontosFortes)
        }
        if (pontosFracos !== undefined){
            data.pontosFracos = this.hashService.hash(pontosFracos)
        }

        await this.prisma.avaliacaoPares.update({
            where: { idAvaliacao },
            data,
        });

        await this.prisma.avaliacao.update({
            where: { idAvaliacao },
            data: { status: status },
        });
    }

    async preencherAvaliacaoColaboradorMentor(
        idAvaliacao: string,
        status : Status,
        nota?: number,
        justificativa?: string
    ): Promise<void> {
        const avaliacao = await this.prisma.avaliacao.findUnique({
            where: { idAvaliacao },
            include: { avaliacaoColaboradorMentor: true },
        });
        await this.verificarAvaliacaoExiste(idAvaliacao);
        this.verificarAvaliacaoTipo(avaliacao, 'COLABORADOR_MENTOR');
        this.verificarAvaliacaoStatus(avaliacao);

        const data: any = {};
        if (nota !== undefined) {
            this.verificarNota(nota);
            data.nota = nota;
        }
        if (justificativa !== undefined) {
            data.justificativa = this.hashService.hash(justificativa);
        }
        
        await this.prisma.avaliacaoColaboradorMentor.update({
            where: { idAvaliacao },
            data,
        });

        await this.prisma.avaliacao.update({
            where: { idAvaliacao },
            data: { status: status }
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
        for (const criterio of criterios) {
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
                where: {
                    nomeCriterio: criterio.nome
                }
            })

            const peso = criterioAvaliativo?.peso ? criterioAvaliativo.peso.toNumber() : 1;
            soma += peso * criterio.nota;
            soma_pesos += peso;

            await this.prisma.cardAutoAvaliacao.update({
                where: { idCardAvaliacao: card.idCardAvaliacao },
                data: {
                    nota: criterio.nota,
                    justificativa: this.hashService.hash(criterio.justificativa)
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
            data: { notaFinal: nota_final }
        })
    }

    async preencherRascunhoAutoAvaliacao(idAvaliacao: string, criterios: { nome: string, nota: number, justificativa: string }[]): Promise<void> {
        const avaliacao = await this.prisma.avaliacao.findUnique({
            where: { idAvaliacao },
            include: { autoAvaliacao: true },
        });
        await this.verificarAvaliacaoExiste(idAvaliacao);
        this.verificarAvaliacaoTipo(avaliacao, 'AUTOAVALIACAO');
        this.verificarAvaliacaoStatus(avaliacao);

        // Verificar se o número de critérios não excede o número de cards existentes

        for (const criterio of criterios) {
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
                    justificativa: this.hashService.hash(criterio.justificativa)
                }
            });
        }

        await this.prisma.avaliacao.update({
            where: { idAvaliacao },
            data: { status: 'EM_RASCUNHO' },
        });
    }

    async preencherRascunhoLiderColaborador(idAvaliacao: string, criterios: { nome: string, nota: number, justificativa: string }[]): Promise<void> {
        const avaliacao = await this.prisma.avaliacao.findUnique({
            where: { idAvaliacao },
            include: { autoAvaliacao: true },
        });
        await this.verificarAvaliacaoExiste(idAvaliacao);
        this.verificarAvaliacaoTipo(avaliacao, 'LIDER_COLABORADOR');
        this.verificarAvaliacaoStatus(avaliacao);

        // Verificar se o número de critérios não excede o número de cards existentes

        for (const criterio of criterios) {
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

            await this.prisma.cardAvaliacaoLiderColaborador.update({
                where: { idCardAvaliacao: card.idCardAvaliacao },
                data: {
                    nota: criterio.nota,
                    justificativa: this.hashService.hash(criterio.justificativa)
                }
            });
        }

        await this.prisma.avaliacao.update({
            where: { idAvaliacao },
            data: { status: 'EM_RASCUNHO' },
        });
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
        for (const criterio of criterios) {
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
                where: {
                    nomeCriterio: criterio.nome
                }
            })
            const peso = criterioAvaliativo?.peso ? criterioAvaliativo.peso.toNumber() : 1;
            soma += peso * criterio.nota;
            soma_pesos += peso;

            await this.prisma.cardAvaliacaoLiderColaborador.update({
                where: { idCardAvaliacao: card.idCardAvaliacao },
                data: {
                    nota: criterio.nota,
                    justificativa: this.hashService.hash(criterio.justificativa)
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
            data: { notaFinal: nota_final }
        })
    }

    async discrepanciaColaborador(idColaborador: string, idCiclo?: string) {
        if (!this.isValidUUID(idColaborador)) {
            return {
                status: 400,
                message: 'ID do colaborador inválido'
            };
        }

        // Base do filtro
        const whereClause: any = {
            idAvaliado: idColaborador
        };

        // Adicionar filtro de ciclo se fornecido
        if (idCiclo && this.isValidUUID(idCiclo)) {
            whereClause.idCiclo = idCiclo;
        }

        try {
            // Buscar autoavaliações
            const autoAvaliacoes = await this.prisma.avaliacao.findMany({
                where: {
                    ...whereClause,
                    tipoAvaliacao: 'AUTOAVALIACAO',
                },
                include: {
                    autoAvaliacao: true
                }
            });

            // Buscar avaliações de pares
            const avaliacoesPares = await this.prisma.avaliacao.findMany({
                where: {
                    ...whereClause,
                    tipoAvaliacao: 'AVALIACAO_PARES',
                },
                include: {
                    avaliacaoPares: true
                }
            });

            // Buscar avaliações líder-colaborador
            const avaliacoesLider = await this.prisma.avaliacao.findMany({
                where: {
                    ...whereClause,
                    tipoAvaliacao: 'LIDER_COLABORADOR',
                },
                include: {
                    avaliacaoLiderColaborador: true
                }
            });

            // Calcular médias
            const mediaAutoAvaliacao = this.calcularMediaAutoAvaliacao(autoAvaliacoes);
            const mediaAvaliacaoPares = this.calcularMediaAvaliacaoPares(avaliacoesPares);
            const mediaAvaliacaoLider = this.calcularMediaAvaliacaoLider(avaliacoesLider);

            // Verificar se há dados suficientes para calcular discrepância
            const mediasValidas = [mediaAutoAvaliacao, mediaAvaliacaoPares, mediaAvaliacaoLider]
                .filter(media => media !== null);

            if (mediasValidas.length < 2) {
                return {
                    colaborador: idColaborador,
                    ciclo: idCiclo || 'todos',
                    avaliacoes: {
                        autoAvaliacao: {
                            quantidade: autoAvaliacoes.length,
                            media: mediaAutoAvaliacao
                        },
                        avaliacaoPares: {
                            quantidade: avaliacoesPares.length,
                            media: mediaAvaliacaoPares
                        },
                        avaliacaoLider: {
                            quantidade: avaliacoesLider.length,
                            media: mediaAvaliacaoLider
                        }
                    },
                    discrepancia: {
                        calculada: false,
                        motivo: 'Dados insuficientes para calcular discrepância (mínimo 2 tipos de avaliação)'
                    }
                };
            }

            // Calcular desvio padrão apenas com as médias válidas
            let desvioPadrao = 0;
            let nivelDiscrepancia = 'INDETERMINADO';

            if (mediasValidas.length === 3) {
                desvioPadrao = this.desvioPadrao(
                    mediaAutoAvaliacao!,
                    mediaAvaliacaoPares!,
                    mediaAvaliacaoLider!
                );
            } else if (mediasValidas.length === 2) {
                // Para duas notas, calcular diferença absoluta como métrica
                const diferenca = Math.abs(mediasValidas[0] - mediasValidas[1]);
                desvioPadrao = diferenca / Math.sqrt(2); // Normalizar para comparar com desvio padrão
            }

            // Classificar discrepância
            if (desvioPadrao <= 0.5) {
                nivelDiscrepancia = 'BAIXA';
            } else if (desvioPadrao <= 1.0) {
                nivelDiscrepancia = 'MÉDIA';
            } else if (desvioPadrao <= 1.5) {
                nivelDiscrepancia = 'ALTA';
            } else {
                nivelDiscrepancia = 'CRÍTICA';
            }

            return {
                colaborador: idColaborador,
                ciclo: idCiclo || 'todos',
                avaliacoes: {
                    autoAvaliacao: {
                        quantidade: autoAvaliacoes.length,
                        media: mediaAutoAvaliacao ? Number(mediaAutoAvaliacao.toFixed(2)) : null
                    },
                    avaliacaoPares: {
                        quantidade: avaliacoesPares.length,
                        media: mediaAvaliacaoPares ? Number(mediaAvaliacaoPares.toFixed(2)) : null
                    },
                    avaliacaoLider: {
                        quantidade: avaliacoesLider.length,
                        media: mediaAvaliacaoLider ? Number(mediaAvaliacaoLider.toFixed(2)) : null
                    }
                },
                discrepancia: {
                    calculada: true,
                    desvioPadrao: Number(desvioPadrao.toFixed(4)),
                    nivel: nivelDiscrepancia,
                    descricao: this.getDescricaoDiscrepancia(nivelDiscrepancia),
                    baseDados: `${mediasValidas.length} tipos de avaliação`
                }
            };

        } catch (error) {
            return {
                status: 500,
                message: 'Erro ao calcular discrepância: ' + error.message
            };
        }
    }

    async discrepanciaAllcolaboradores(idCiclo: string) {
        try {
            // Filtro base para colaboradores
            const whereClause: any = {};

            if (idCiclo && this.isValidUUID(idCiclo)) {
                whereClause.colaboradoresCiclos = {
                    some: { idCiclo: idCiclo }
                };
            }

            // Buscar todos os colaboradores (sem includes pesados)
            const colaboradores = await this.prisma.colaboradorCiclo.findMany({
                where: { idCiclo: idCiclo },
                include: {
                    colaborador: {
                        select: {
                            idColaborador: true,
                            nomeCompleto: true,
                            cargo: true,
                            trilhaCarreira: true,
                            unidade: true
                        }
                    }
                }
            });

            // Processar cada colaborador usando a função existente
            const relatorio: RelatorioItem[] = [];

            for (const colaborador of colaboradores) {
                const resultadoDiscrepancia = await this.discrepanciaColaborador(
                    colaborador.idColaborador,
                    idCiclo
                );

                // Verificar se o resultado tem erro
                if (resultadoDiscrepancia.status) {
                    this.logger.warn(`Erro ao calcular discrepância para ${colaborador.colaborador.nomeCompleto}: ${resultadoDiscrepancia.message}`);
                    continue;
                }

                // Extrair dados das avaliações
                const avaliacoes = resultadoDiscrepancia.avaliacoes;
                const discrepancia = resultadoDiscrepancia.discrepancia;

                if (avaliacoes && discrepancia) {
                    relatorio.push({
                        idColaborador: colaborador.idColaborador,
                        nomeColaborador: colaborador.colaborador.nomeCompleto,
                        cargoColaborador: colaborador.colaborador.cargo || 'Não informado',
                        trilhaColaborador: colaborador.colaborador.trilhaCarreira || null,
                        equipeColaborador: colaborador.colaborador.unidade || null,
                        notas: {
                            notaAuto: avaliacoes.autoAvaliacao?.media || null,
                            nota360media: avaliacoes.avaliacaoPares?.media || null,
                            notaGestor: avaliacoes.avaliacaoLider?.media || null,
                            discrepancia: discrepancia.calculada ? discrepancia.desvioPadrao : null
                        }
                    });
                }
            }
            return relatorio;

        } catch (error) {
            this.logger.error('Erro ao gerar relatório de discrepância de todos os colaboradores:', error);
            throw new HttpException('Erro ao gerar relatório de discrepância: ' + error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
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

    private desvioPadrao(nota1: number, nota2: number, nota3: number): number {
        const media = (nota1 + nota2 + nota3) / 3;
        const variancia = (Math.pow(nota1 - media, 2) + Math.pow(nota2 - media, 2) + Math.pow(nota3 - media, 2)) / 3;
        return Math.sqrt(variancia);
    }

    private calcularMediaAutoAvaliacao(avaliacoes: any[]): number | null {
        if (!avaliacoes || avaliacoes.length === 0) {
            return null;
        }

        const notasValidas = avaliacoes
            .filter(av => av.autoAvaliacao?.notaFinal !== null && av.autoAvaliacao?.notaFinal !== undefined)
            .map(av => parseFloat(av.autoAvaliacao.notaFinal.toString()));

        if (notasValidas.length === 0) {
            return null;
        }

        const soma = notasValidas.reduce((acc, nota) => acc + nota, 0);
        return soma / notasValidas.length;
    }


    private calcularMediaAvaliacaoPares(avaliacoes: any[]): number | null {
        if (!avaliacoes || avaliacoes.length === 0) {
            return null;
        }

        const notasValidas = avaliacoes
            .filter(av => av.avaliacaoPares?.nota !== null && av.avaliacaoPares?.nota !== undefined)
            .map(av => parseFloat(av.avaliacaoPares.nota.toString()));

        if (notasValidas.length === 0) {
            return null;
        }

        const soma = notasValidas.reduce((acc, nota) => acc + nota, 0);
        return soma / notasValidas.length;
    }


    private calcularMediaAvaliacaoLider(avaliacoes: any[]): number | null {
        if (!avaliacoes || avaliacoes.length === 0) {
            return null;
        }

        const notasValidas = avaliacoes
            .filter(av => av.avaliacaoLiderColaborador?.notaFinal !== null && av.avaliacaoLiderColaborador?.notaFinal !== undefined)
            .map(av => parseFloat(av.avaliacaoLiderColaborador.notaFinal.toString()));

        if (notasValidas.length === 0) {
            return null;
        }

        const soma = notasValidas.reduce((acc, nota) => acc + nota, 0);
        return soma / notasValidas.length;
    }

    private getDescricaoDiscrepancia(nivel: string): string {
        switch (nivel) {
            case 'BAIXA':
                return 'Notas consistentes';
            case 'MÉDIA':
                return 'Diferenças moderadas entre as notas';
            case 'ALTA':
                return 'Diferenças significativas entre as notas';
            case 'CRÍTICA':
                return 'Diferenças extremas entre as notas';
            default:
                return 'Nível de discrepância não identificado';
        }
    }

    private isValidUUID(uuid: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
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

    async getFormsAvaliacao(idAvaliacao: string) {
        // Buscar todos os cards de autoavaliação associados à avaliação
        const cardsAuto = await this.prisma.cardAutoAvaliacao.findMany({ where: { idAvaliacao } });

        // Buscar todos os critérios distintos pelos nomes encontrados nos cards
        const nomesCriterios = Array.from(new Set(cardsAuto.map(card => card.nomeCriterio)));
        const criterios = await this.prisma.criterioAvaliativo.findMany({
            where: { nomeCriterio: { in: nomesCriterios } }
        });

        // Mapear nomeCriterio => { pilar, descricao }
        const criterioInfo: Record<string, { pilar: string, descricao: string }> = {};
        for (const criterio of criterios) {
            criterioInfo[criterio.nomeCriterio] = {
                pilar: criterio.pilar || 'Outro',
                descricao: criterio.descricao || ''
            };
        }

        // Agrupar apenas nomeCriterio e descricao por pilar
        const resultado: Record<string, { nomeCriterio: string, descricao: string }[]> = {};
        for (const card of cardsAuto) {
            const info = criterioInfo[card.nomeCriterio] || { pilar: 'Outro', descricao: '' };
            const pilar = info.pilar;
            if (!resultado[pilar]) resultado[pilar] = [];
            // Evitar duplicidade de critérios no mesmo pilar
            if (!resultado[pilar].some(c => c.nomeCriterio === card.nomeCriterio)) {
                resultado[pilar].push({
                    nomeCriterio: card.nomeCriterio,
                    descricao: info.descricao
                });
            }
        }

        return resultado;
    }

    async getFormsLiderColaborador(idAvaliacao: string) {
        // Buscar todos os cards de autoavaliação associados à avaliação
        const cards = await this.prisma.cardAvaliacaoLiderColaborador.findMany({ where: { idAvaliacao } });

        // Buscar todos os critérios distintos pelos nomes encontrados nos cards
        const nomesCriterios = Array.from(new Set(cards.map(card => card.nomeCriterio)));
        const criterios = await this.prisma.criterioAvaliativo.findMany({
            where: { nomeCriterio: { in: nomesCriterios } }
        });

        // Mapear nomeCriterio => { pilar, descricao }
        const criterioInfo: Record<string, { pilar: string, descricao: string }> = {};
        for (const criterio of criterios) {
            criterioInfo[criterio.nomeCriterio] = {
                pilar: criterio.pilar || 'Outro',
                descricao: criterio.descricao || ''
            };
        }

        // Agrupar apenas nomeCriterio e descricao por pilar
        const resultado: Record<string, { nomeCriterio: string, descricao: string }[]> = {};
        for (const card of cards) {
            const info = criterioInfo[card.nomeCriterio] || { pilar: 'Outro', descricao: '' };
            const pilar = info.pilar;
            if (!resultado[pilar]) resultado[pilar] = [];
            // Evitar duplicidade de critérios no mesmo pilar
            if (!resultado[pilar].some(c => c.nomeCriterio === card.nomeCriterio)) {
                resultado[pilar].push({
                    nomeCriterio: card.nomeCriterio,
                    descricao: info.descricao
                });
            }
        }

        return resultado;
    }

    async gerarMentorColaboradorPorCiclo(idCiclo: string) {
        this.logger.log(`Iniciando a geração de relações mentor-colaborador para o ciclo: ${idCiclo}`);

        // Busca todos os colaboradores participantes do ciclo
        const participantes = await this.prisma.colaboradorCiclo.findMany({
            where: { idCiclo },
            include: {
                colaborador: {
                    include: { perfis: true, mentores: true }
                }
            }
        });

        let relacoesCriadas = 0;
        for (const participante of participantes) {
            const colaborador = participante.colaborador;
            // Verifica se o colaborador tem mentores definidos
            if (Array.isArray(colaborador.mentores) && colaborador.mentores.length > 0) {
                for (const mentor of colaborador.mentores) {
                    // Evita relação consigo mesmo
                    if (mentor.idColaborador === colaborador.idColaborador) continue;
                    await this.prisma.mentorColaborador.upsert({
                        where: {
                            idMentor_idColaborador_idCiclo: {
                                idMentor: mentor.idColaborador,
                                idColaborador: colaborador.idColaborador,
                                idCiclo: idCiclo
                            }
                        },
                        update: {},
                        create: {
                            idMentor: mentor.idColaborador,
                            idColaborador: colaborador.idColaborador,
                            idCiclo: idCiclo
                        }
                    });
                    relacoesCriadas++;
                }
            }
        }
        this.logger.log(`${relacoesCriadas} relações mentor-colaborador processadas para o ciclo ${idCiclo}.`);
        return { message: `${relacoesCriadas} relações mentor-colaborador processadas.` };
    }
    
    async gerarParesPorProjetos(idCiclo: string) {
        this.logger.log(`Iniciando a geração de pares para o ciclo: ${idCiclo}`);

        // 1. Busca apenas alocações de colaboradores que são ATIVOS e do perfil COLABORADOR_COMUM
        const alocacoesValidas = await this.prisma.alocacaoColaboradorProjeto.findMany({
            where: {
                colaborador: {
                    ativo: true,
                    perfis: {
                        some: {
                            tipoPerfil: 'COLABORADOR_COMUM',
                        },
                    },
                },
            },
        });

        // 2. Agrupa as alocações filtradas por projeto
        const alocacoesPorProjeto = alocacoesValidas.reduce((acc, alocacao) => {
            if (!acc[alocacao.idProjeto]) {
                acc[alocacao.idProjeto] = [];
            }
            acc[alocacao.idProjeto].push(alocacao);
            return acc;
        }, {});

        let paresCriados = 0;

        // 3. Itera sobre cada projeto para encontrar os pares
        for (const idProjeto in alocacoesPorProjeto) {
            const alocacoes = alocacoesPorProjeto[idProjeto];
            if (alocacoes.length < 2) continue;

            for (let i = 0; i < alocacoes.length; i++) {
                for (let j = i + 1; j < alocacoes.length; j++) {
                    const alocacaoA = alocacoes[i];
                    const alocacaoB = alocacoes[j];

                    // 4. Calcula o período de sobreposição de trabalho
                    const inicioSobreposicao = new Date(Math.max(alocacaoA.dataEntrada.getTime(), alocacaoB.dataEntrada.getTime()));
                    const fimA = alocacaoA.dataSaida || new Date(); // Considera hoje se a data de saída for nula
                    const fimB = alocacaoB.dataSaida || new Date();
                    const fimSobreposicao = new Date(Math.min(fimA.getTime(), fimB.getTime()));

                    if (fimSobreposicao > inicioSobreposicao) {
                        const diffMs = fimSobreposicao.getTime() - inicioSobreposicao.getTime();
                        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                        // 5. Se trabalharam juntos por mais de 30 dias, salva o par
                        if (diffDays > 30) {
                            const ids = [alocacaoA.idColaborador, alocacaoB.idColaborador].sort();
                            
                            await this.prisma.pares.upsert({
                                where: {
                                    idColaborador1_idColaborador2_idCiclo: {
                                        idColaborador1: ids[0],
                                        idColaborador2: ids[1],
                                        idCiclo: idCiclo,
                                    },
                                },
                                update: {
                                    diasTrabalhadosJuntos: diffDays,
                                },
                                create: {
                                    idColaborador1: ids[0],
                                    idColaborador2: ids[1],
                                    idCiclo: idCiclo,
                                    idProjeto: idProjeto,
                                    diasTrabalhadosJuntos: diffDays,
                                },
                            });
                            paresCriados++;
                        }
                    }
                }
            }
        }

        this.logger.log(`${paresCriados} pares únicos foram processados para o ciclo ${idCiclo}.`);
        return { message: `${paresCriados} pares únicos foram processados.` };
    }


    async gerarLiderColaboradorPorProjetos(idCiclo: string) {
        this.logger.log(`Iniciando a geração de relações líder-colaborador para o ciclo: ${idCiclo}`);

        const projetos = await this.prisma.projeto.findMany({
            where: { idLider: { not: null } },
            select: { idProjeto: true, idLider: true }
        });

        if (!projetos.length) {
            this.logger.warn('Nenhum projeto com líder definido encontrado.');
            return { message: 'Nenhum projeto com líder definido encontrado.' };
        }

        const alocacoes = await this.prisma.alocacaoColaboradorProjeto.findMany({
            where: { idProjeto: { in: projetos.map(p => p.idProjeto) } },
            select: { idProjeto: true, idColaborador: true }
        });

        const relacoesParaSalvar = new Set<string>();
        for (const projeto of projetos) {
            const alocacoesProjeto = alocacoes.filter(a => a.idProjeto === projeto.idProjeto);
            for (const alocacao of alocacoesProjeto) {
                if (alocacao.idColaborador === projeto.idLider) continue;
                relacoesParaSalvar.add(JSON.stringify({
                    idLider: projeto.idLider,
                    idColaborador: alocacao.idColaborador,
                    idCiclo,
                    idProjeto: projeto.idProjeto
                }));
            }
        }

        let relacoesCriadas = 0;
        for (const relacaoString of relacoesParaSalvar) {
            const relacao = JSON.parse(relacaoString);
            await this.prisma.liderColaborador.upsert({
                where: {
                    idLider_idColaborador_idCiclo: {
                        idLider: relacao.idLider,
                        idColaborador: relacao.idColaborador,
                        idCiclo: relacao.idCiclo
                    }
                },
                update: {},
                create: {
                    idLider: relacao.idLider,
                    idColaborador: relacao.idColaborador,
                    idCiclo: relacao.idCiclo,
                    idProjeto: relacao.idProjeto
                }
            });
            relacoesCriadas++;
        }

        this.logger.log(`${relacoesCriadas} relações líder-colaborador processadas para o ciclo ${idCiclo}.`);
        return { message: `${relacoesCriadas} relações líder-colaborador processadas.` };
    }

    async getLideradosPorCiclo(idColaborador: string, idCiclo: string) {
        // 1. Busca todas as relações líder-colaborador para o ciclo
        const relacoes = await this.prisma.liderColaborador.findMany({
            where: {
            idLider: idColaborador,
            idCiclo: idCiclo,
            },
            include: {
            colaborador: true,
            },
        });

        // 2. Busca avaliações de todos os liderados do ciclo, dos 3 tipos relevantes
        const avaliacoes = await this.prisma.avaliacao.findMany({
            where: {
            idCiclo,
            tipoAvaliacao: {
                in: ['AUTOAVALIACAO', 'AVALIACAO_PARES', 'LIDER_COLABORADOR'],
            },
            idAvaliado: {
                in: relacoes.map((r) => r.idColaborador),
            },
            },
            include: {
            autoAvaliacao: true,
            avaliacaoLiderColaborador: true,
            },
        });

        // 3. Organiza as avaliações por colaborador avaliado
        const avaliacoesMap = new Map<string, any[]>();
        for (const a of avaliacoes) {
            if (!avaliacoesMap.has(a.idAvaliado)) {
            avaliacoesMap.set(a.idAvaliado, []);
            }
            avaliacoesMap.get(a.idAvaliado)?.push(a);
        }

        // 4. Monta o objeto de retorno por colaborador liderado
        const liderados = relacoes.map((relacao) => {
            const colaborador = relacao.colaborador;
            const avals = avaliacoesMap.get(colaborador.idColaborador) || [];

            const auto = avals.find((a) => a.tipoAvaliacao === 'AUTOAVALIACAO');
            const lider = avals.find((a) => a.tipoAvaliacao === 'LIDER_COLABORADOR');
            const todasPares = avals.filter((a) => a.tipoAvaliacao === 'AVALIACAO_PARES');

            // 5. Lógica para status da avaliação 360
            let statusAvaliacao360 = 'PENDENTE';
            if (todasPares.length > 0 && todasPares.every((a) => a.status === 'CONCLUIDA')) {
            statusAvaliacao360 = 'CONCLUIDA';
            }


            return {
            idAvaliacaoLider: lider?.idAvaliacao,
            idColaborador: colaborador.idColaborador,
            nomeCompleto: colaborador.nomeCompleto,
            cargo: colaborador.cargo,
            notaAutoavaliacao: auto?.autoAvaliacao?.notaFinal || null,
            notaLider: lider?.avaliacaoLiderColaborador?.notaFinal || null,
            statusAutoavaliacao: (auto?.status ?? 'PENDENTE') as Status,
            statusAvaliacao360: statusAvaliacao360 as Status,
            };
        });

        // 7. Retorna dados do avaliador + lista dos liderados
        const lider = await this.prisma.colaborador.findUnique({
            where: { idColaborador },
            select: { nomeCompleto: true },
            });

        return {
            avaliador: {
                id: idColaborador,
                nomeLider: lider?.nomeCompleto ?? 'Nome não encontrado',
            },
            liderados,
        };

    }



}

