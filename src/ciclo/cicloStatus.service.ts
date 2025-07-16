import { PrismaService } from 'src/database/prismaService';
import { cicloStatus, CicloAvaliacao, Prisma } from '@prisma/client';
import { Injectable, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AvaliacoesService } from 'src/avaliacoes/avaliacoes.service';
import { EqualizacaoService } from 'src/equalizacao/equalizacao.service';
import { CreateEqualizacaoDto } from 'src/equalizacao/equalizacao.dto';
import { CicloService } from './ciclo.service';



@Injectable()
export class CiclosStatus {
    constructor(
        private prisma: PrismaService,
        private avaliacoesService: AvaliacoesService,
        private equelizacoesService: EqualizacaoService,
        private cicloService: CicloService
    ) { }

    private readonly logger = new Logger(CiclosStatus.name);

    async findAll(): Promise<CicloAvaliacao[]> {
        return this.prisma.cicloAvaliacao.findMany();
    }

    async updateStatus(id: string, status: cicloStatus): Promise<void> {
        await this.prisma.cicloAvaliacao.update({
            where: { idCiclo: id },
            data: { status },
        });
    }

    @Cron('0 0 * * *', {
        timeZone: 'America/Sao_Paulo'
    })
    async handleCron() {
        this.logger.debug('Verificando status dos ciclos...');
        const ciclos = await this.findAll();
        const now = new Date();
        console.log('Data atual UTC:', now);

        // Criar variável 'hoje' apenas com data (sem horas)
        const hoje = new Date(now.getFullYear(), now.getMonth(), now.getDate(), -3, 0, 0, 0);
        console.log('Hoje (apenas data):', hoje);

        for (const ciclo of ciclos) {
            const inicio = new Date(ciclo.dataInicio);
            const fim = new Date(ciclo.dataFim);

            // Calcular as datas de transição baseadas nas durações
            const fimAndamento = new Date(inicio);
            fimAndamento.setDate(fimAndamento.getDate() + ciclo.duracaoEmAndamentoDias - 1);

            const inicioRevisao = new Date(fimAndamento);
            inicioRevisao.setDate(inicioRevisao.getDate() + 1);

            const fimRevisao = new Date(inicioRevisao);
            fimRevisao.setDate(fimRevisao.getDate() + ciclo.duracaoEmRevisaoDias - 1);

            const inicioEqualizacao = new Date(fimRevisao);
            inicioEqualizacao.setDate(inicioEqualizacao.getDate() + 1);

            const fimEqualizacao = new Date(inicioEqualizacao);
            fimEqualizacao.setDate(fimEqualizacao.getDate() + ciclo.duracaoEmEqualizacaoDias - 1);

            let newStatus: cicloStatus = ciclo.status; // Mantém o status atual por padrão

            // Lógica de transição de status
            if (hoje < inicio) {
                newStatus = cicloStatus.AGENDADO;
            } else if (hoje >= inicio && hoje <= fimAndamento) {
                newStatus = cicloStatus.EM_ANDAMENTO;

            } else if (hoje >= inicioRevisao && hoje <= fimRevisao) {
                newStatus = cicloStatus.EM_REVISAO;

            } else if (hoje >= inicioEqualizacao && hoje <= fimEqualizacao) {
                newStatus = cicloStatus.EM_EQUALIZAÇÃO;

            } else if (hoje > fim) {
                newStatus = cicloStatus.FECHADO;
            }

            if (newStatus !== ciclo.status) {
                let relatorio: any[] = [];

                try {
                    if (newStatus === cicloStatus.EM_ANDAMENTO) {
                        this.logger.log(`Lançando avaliações para o ciclo ${ciclo.nomeCiclo} (EM_ANDAMENTO)`);

                        const relatorio_AutoAvaliacao = await this.avaliacoesService.lancarAutoAvaliacoes(ciclo.idCiclo);
                        const relatorio_AvaliacaoPares = await this.avaliacoesService.lancarAvaliacaoPares(ciclo.idCiclo);
                        const relatorio_AvaliacaoMentor = await this.avaliacoesService.lancarAvaliacaoColaboradorMentor(ciclo.idCiclo);

                        relatorio.push({
                            tipo: 'Autoavaliação',
                            resultado: relatorio_AutoAvaliacao
                        });
                        relatorio.push({
                            tipo: 'Avaliação de Pares',
                            resultado: relatorio_AvaliacaoPares
                        });
                        relatorio.push({
                            tipo: 'Avaliação Colaborador-Mentor',
                            resultado: relatorio_AvaliacaoMentor
                        });

                    } else if (newStatus === cicloStatus.EM_REVISAO) {
                        this.logger.log(`Lançando avaliações para o ciclo ${ciclo.nomeCiclo} (EM_REVISAO)`);

                        const relatorio_AvaliacaoLider = await this.avaliacoesService.lancarAvaliacaoLiderColaborador(ciclo.idCiclo);

                        relatorio.push({
                            tipo: 'Avaliação Líder-Colaborador',
                            resultado: relatorio_AvaliacaoLider
                        });
                    } else if (newStatus === cicloStatus.EM_EQUALIZAÇÃO) {

                        await this.equelizacoesService.create({ idCiclo: ciclo.idCiclo });

                    }

                    await this.updateStatus(ciclo.idCiclo, newStatus);

                    this.logger.log(
                        `Ciclo ${ciclo.idCiclo} - "${ciclo.nomeCiclo}" teve o status alterado para: ${newStatus}`,
                    );

                    if (relatorio.length > 0) {
                        this.logger.log(`Relatório das avaliações lançadas para ${ciclo.nomeCiclo}:`);
                        relatorio.forEach((item, index) => {
                            this.logger.log(`  ${index + 1}. ${item.tipo}: ${JSON.stringify(item.resultado)}`);
                        });
                    }

                    this.logger.debug(
                        `Períodos: Andamento(${inicio.toISOString()} - ${fimAndamento.toISOString()}), ` +
                        `Revisão(${inicioRevisao.toISOString()} - ${fimRevisao.toISOString()}), ` +
                        `Equalização(${inicioEqualizacao.toISOString()} - ${fimEqualizacao.toISOString()})`
                    );

                } catch (error) {
                    this.logger.error(`Erro ao processar avaliações/equalizações para o ciclo ${ciclo.nomeCiclo}:`, error);
                    // Continua com a atualização de status mesmo se houver erro nas avaliações
                    await this.updateStatus(ciclo.idCiclo, newStatus);
                    this.logger.log(
                        `Apesar de algum erro, o ciclo ${ciclo.idCiclo} - "${ciclo.nomeCiclo}" teve o status alterado para: ${newStatus}`,
                    );
                }
            }
        }
        this.logger.debug('Verificação de status dos ciclos concluída.');
    }

    async changeStatus(idCiclo: string, current_status: string, next_status: string) {
        const ciclo = await this.prisma.cicloAvaliacao.findFirst({
            where: { idCiclo }
        });

        if (!ciclo) throw new BadRequestException('Ciclo not found');

        if (ciclo.status !== current_status) throw new ConflictException('Argumento current_status não condiz com o status atual do ciclo');

        console.log('Ciclo antes da mudança:', JSON.stringify(ciclo, null, 2));
        const now = new Date();
        const hoje = new Date(now.getFullYear(), now.getMonth(), now.getDate(), -3, 0, 0, 0);
        console.log('Data atual (hoje):', hoje.toISOString());
        const inicio = new Date(ciclo.dataInicio);
        const fim = new Date(ciclo.dataFim);

        console.log("Data inicio ciclo: ", ciclo.dataInicio)

        // Calcula o início de cada etapa
        const fimAndamento = new Date(inicio);
        fimAndamento.setDate(fimAndamento.getDate() + ciclo.duracaoEmAndamentoDias - 1);
        console.log('fimAndamento:', fimAndamento.toISOString());

        const inicioRevisao = new Date(fimAndamento);
        inicioRevisao.setDate(inicioRevisao.getDate() + 1);
        console.log('inicioRevisao:', inicioRevisao.toISOString());

        const fimRevisao = new Date(inicioRevisao);
        fimRevisao.setDate(fimRevisao.getDate() + ciclo.duracaoEmRevisaoDias - 1);
        console.log('fimRevisao:', fimRevisao.toISOString());

        const inicioEqualizacao = new Date(fimRevisao);
        inicioEqualizacao.setDate(inicioEqualizacao.getDate() + 1);
        console.log('inicioEqualizacao:', inicioEqualizacao.toISOString());

        const fimEqualizacao = new Date(inicioEqualizacao);
        fimEqualizacao.setDate(fimEqualizacao.getDate() + ciclo.duracaoEmEqualizacaoDias - 1);
        console.log('fimEqualizacao:', fimEqualizacao.toISOString());

        // Atualiza as durações conforme a etapa
        let updateData: any = {};
        let fechado: boolean = false
        let relatorio: any[] = [];

        if (current_status === 'AGENDADO' && next_status === 'EM_ANDAMENTO') {
            // Calcula dias faltando para o início
            const diasFaltando = Math.floor((inicio.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

            // Se já passou do início, diasFaltando será negativo ou zero
            const diasParaSomar = diasFaltando > 0 ? diasFaltando : 0;

            console.log("DIAS PARA SOMAR :", diasParaSomar)

            const relatorio_AutoAvaliacao = await this.avaliacoesService.lancarAutoAvaliacoes(ciclo.idCiclo);
            const relatorio_AvaliacaoPares = await this.avaliacoesService.lancarAvaliacaoPares(ciclo.idCiclo);
            const relatorio_AvaliacaoMentor = await this.avaliacoesService.lancarAvaliacaoColaboradorMentor(ciclo.idCiclo);

            relatorio.push({
                tipo: 'Autoavaliação',
                resultado: relatorio_AutoAvaliacao
            });
            relatorio.push({
                tipo: 'Avaliação de Pares',
                resultado: relatorio_AvaliacaoPares
            });
            relatorio.push({
                tipo: 'Avaliação Colaborador-Mentor',
                resultado: relatorio_AvaliacaoMentor
            });

            updateData = {
                status: next_status,
                duracaoEmAndamentoDias: ciclo.duracaoEmAndamentoDias + diasParaSomar,
                dataInicioAno: hoje.getFullYear(),
                dataInicioMes: hoje.getMonth() + 1,
                dataInicioDia: hoje.getDate() + 1
            };
        }
        else if (current_status === 'EM_ANDAMENTO' && next_status === 'EM_REVISAO') {
            // Dias já passados na etapa atual
            const diasPassados = Math.floor((hoje.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
            const diasRestantes = ciclo.duracaoEmAndamentoDias - diasPassados;
            // Garante que não seja negativo
            const diasParaSomar = diasRestantes > 0 ? diasRestantes : 0;

            console.log("DIAS PARA SOMAR :", diasParaSomar)

            updateData = {
                duracaoEmAndamentoDias: diasPassados,
                duracaoEmRevisaoDias: ciclo.duracaoEmRevisaoDias + diasParaSomar,
                status: next_status
            };

            const relatorio_AvaliacaoLider = await this.avaliacoesService.lancarAvaliacaoLiderColaborador(ciclo.idCiclo);

            relatorio.push({
                tipo: 'Avaliação Líder-Colaborador',
                resultado: relatorio_AvaliacaoLider
            });

        } else if (current_status === 'EM_REVISAO' && next_status === 'EM_EQUALIZAÇÃO') {
            const diasPassados = Math.floor((hoje.getTime() - inicioRevisao.getTime()) / (1000 * 60 * 60 * 24));
            const diasRestantes = ciclo.duracaoEmRevisaoDias - diasPassados;
            const diasParaSomar = diasRestantes > 0 ? diasRestantes : 0;

            console.log("DIAS PARA SOMAR :", diasParaSomar)
            await this.equelizacoesService.create({ idCiclo: ciclo.idCiclo });

            updateData = {
                duracaoEmRevisaoDias: diasPassados,
                duracaoEmEqualizacaoDias: ciclo.duracaoEmEqualizacaoDias + diasParaSomar,
                status: next_status
            };
        } else if (current_status === 'EM_EQUALIZAÇÃO' && next_status === 'FECHADO') {

            const diasFaltando = Math.floor((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
            const diasParaSubtrair = diasFaltando > 0 ? diasFaltando : 0;

            console.log("DIAS FALTANDO :", diasParaSubtrair)

            updateData = {
                status: next_status,
                duracaoEmEqualizacaoDias: ciclo.duracaoEmEqualizacaoDias - diasParaSubtrair,
                dataFim: hoje
            }

            const cicloAtualizado = await this.prisma.cicloAvaliacao.update({
                where: { idCiclo: idCiclo },
                data: updateData // update vazio, mas obrigatório
            });
            console.log('Ciclo depois da mudança:', JSON.stringify(cicloAtualizado, null, 2));

            fechado = true
        }

        console.log("")
        console.log("===========")
        console.log("UPDATED DATA:")
        console.log(updateData)
        console.log("===========")
        console.log("")

        if (fechado === false) {
            // Adicione outros casos se necessário
            const cicloAtualizado = await this.cicloService.updateCiclo(idCiclo, updateData)
            console.log('Ciclo depois da mudança:', JSON.stringify(cicloAtualizado, null, 2));
            return relatorio
        }
        // Adicione outros casos se necessário
    }

}