import {
    Injectable,
    Logger,
    BadRequestException,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/database/prismaService';
import { CreateCicloDto, UpdateCicloDto } from './ciclo.dto';
import { cicloStatus, CicloAvaliacao, Prisma } from '@prisma/client';

const TEMPO_MINIMO_DIAS = 0;
const TEMPO_MAXIMO_DIAS = 180;

// Pega o momento atual em UTC
const agora = new Date();

// Para obter a data de "hoje" em Brasília, subtraímos 3 horas do tempo UTC atual.
const agoraEmBrasilia = new Date(agora.getTime() - 3 * 60 * 60 * 1000);

// Agora, construímos a data 'hoje' para representar o início do dia em Brasília (00:00:00),
// que corresponde às 03:00:00 em UTC, usando a data correta de Brasília.
const hoje = new Date(
    Date.UTC(
        agoraEmBrasilia.getUTCFullYear(),
        agoraEmBrasilia.getUTCMonth(),
        agoraEmBrasilia.getUTCDate(),
        0, 0, 0, 0,
    ),
);


@Injectable()
export class CicloService {
    constructor(private readonly prisma: PrismaService) { }
    private readonly logger = new Logger(CicloService.name);

    async createCiclo(data: CreateCicloDto): Promise<CicloAvaliacao> {
        const dataInicio = this._createData(
            data.dataInicioAno,
            data.dataInicioMes,
            data.dataInicioDia,
        );

        const dataFim = this._createData(
            data.dataFimAno,
            data.dataFimMes,
            data.dataFimDia
        );

        await this._validarDatas(dataInicio, dataFim, data.duracaoEmAndamentoDias, data.duracaoEmRevisaoDias, data.duracaoEmEqualizacaoDias);
        this._validarPadraoNomeCiclo(data.nome);
        await this._validarNomeUnico(data.nome);
        const status = this._isSameDay(dataInicio, hoje)
            ? cicloStatus.EM_ANDAMENTO
            : cicloStatus.AGENDADO;

        // Cria o ciclo
        const ciclo = await this.prisma.cicloAvaliacao.create({
            data: {
                nomeCiclo: data.nome,
                dataInicio,
                dataFim,
                status,
                duracaoEmAndamentoDias: data.duracaoEmAndamentoDias,
                duracaoEmRevisaoDias: data.duracaoEmRevisaoDias,
                duracaoEmEqualizacaoDias: data.duracaoEmEqualizacaoDias,
            },
        });

        await this._associarColaboradoresAtivosAoCiclo(ciclo.idCiclo);

        return ciclo;
    }

    private async _associarColaboradoresAtivosAoCiclo(idCiclo: string) {
        // Busca apenas colaboradores ativos (campo ativo === true)
        const colaboradores = await this.prisma.colaborador.findMany({
            where: { ativo: true }
        });
        if (!colaboradores.length) return;
        const dadosParaCriar = colaboradores.map(colab => ({
            idColaborador: colab.idColaborador,
            idCiclo,
        }));
        await this.prisma.colaboradorCiclo.createMany({
            data: dadosParaCriar,
            skipDuplicates: true,
        });
    }

    async updateCiclo(
        id: string,
        data: UpdateCicloDto,
    ): Promise<CicloAvaliacao> {
        const cicloExistente = await this._findCicloById(id);

        const dataInicio =
            data.dataInicioAno && data.dataInicioMes && data.dataInicioDia
                ? this._createData(
                    data.dataInicioAno,
                    data.dataInicioMes,
                    data.dataInicioDia,
                )
                : cicloExistente.dataInicio;

        const dataFim =
            data.dataFimAno && data.dataFimMes && data.dataFimDia
                ? this._createData(
                    data.dataFimAno,
                    data.dataFimMes,
                    data.dataFimDia
                )
                : cicloExistente.dataFim;

        // Usar valores existentes se não fornecidos no update
        const duracaoEmAndamentoDias = data.duracaoEmAndamentoDias ?? cicloExistente.duracaoEmAndamentoDias;
        const duracaoEmRevisaoDias = data.duracaoEmRevisaoDias ?? cicloExistente.duracaoEmRevisaoDias;
        const duracaoEmEqualizacaoDias = data.duracaoEmEqualizacaoDias ?? cicloExistente.duracaoEmEqualizacaoDias;

        // Validar datas apenas se foram fornecidas no update
        const datasFornecidas = data.dataInicioAno || data.dataFimAno;
        const duracoesFornecidas = data.duracaoEmAndamentoDias || data.duracaoEmRevisaoDias || data.duracaoEmEqualizacaoDias;

        // Só validar se pelo menos uma data ou duração foi fornecida
        if (datasFornecidas || duracoesFornecidas) {
            await this._validarDatas(dataInicio, dataFim, duracaoEmAndamentoDias, duracaoEmRevisaoDias, duracaoEmEqualizacaoDias, id);
        }

        if (data.nome && data.nome !== cicloExistente.nomeCiclo) {
            this._validarPadraoNomeCiclo(data.nome);
            await this._validarNomeUnico(data.nome);
        }

        const status = this._isSameDay(dataInicio, hoje)
            ? cicloStatus.EM_ANDAMENTO
            : cicloStatus.AGENDADO;

        // Construir objeto de dados para atualização apenas com campos fornecidos
        const updateData: any = {};

        if (data.nome !== undefined) {
            updateData.nomeCiclo = data.nome;
        }
        if (data.dataInicioAno !== undefined) {
            updateData.dataInicio = dataInicio;
        }
        if (data.dataFimAno !== undefined) {
            updateData.dataFim = dataFim;
        }
        if (data.duracaoEmAndamentoDias !== undefined) {
            updateData.duracaoEmAndamentoDias = data.duracaoEmAndamentoDias;
        }
        if (data.duracaoEmRevisaoDias !== undefined) {
            updateData.duracaoEmRevisaoDias = data.duracaoEmRevisaoDias;
        }
        if (data.duracaoEmEqualizacaoDias !== undefined) {
            updateData.duracaoEmEqualizacaoDias = data.duracaoEmEqualizacaoDias;
        }

        await this.prisma.cicloAvaliacao.update({
            where: { idCiclo: id },
            data: updateData,
        });

        const statuss = await this._handleStatus(id)
        
        return this.prisma.cicloAvaliacao.update({
            where: { idCiclo: id },
            data: {status : statuss},
        });


    }

    async deleteCiclo(id: string): Promise<CicloAvaliacao> {
        const ciclo = await this._findCicloById(id);
        await this.prisma.cicloAvaliacao.delete({ where: { idCiclo: id } });
        return ciclo;
    }

    async getCiclo(id: string): Promise<CicloAvaliacao> {
        return this._findCicloById(id);
    }

    async getCiclos(): Promise<CicloAvaliacao[]> {
        return this.prisma.cicloAvaliacao.findMany({
            orderBy: {
                dataInicio: 'desc',
            },
        });
    }

    async getCiclosAtivos() {
        const ciclos = await this.prisma.cicloAvaliacao.findMany({
            where: {
                status: {
                    in: [
                        cicloStatus.AGENDADO,
                        cicloStatus.EM_ANDAMENTO,
                        cicloStatus.EM_REVISAO,
                        cicloStatus.EM_EQUALIZAÇÃO
                    ]
                }
            },
        });
        console.log(agoraEmBrasilia)
        return ciclos.map((ciclo) => {

            const dataFim = new Date(ciclo.dataFim);
            dataFim.setDate(dataFim.getDate() + 1); // Adiciona 1 dia à data de fim
            const diffMs = dataFim.getTime() - agoraEmBrasilia.getTime();

            // Converter para dias, horas, minutos
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
            const diffMinutes = Math.floor((diffMs / (1000 * 60)) % 60);

            return {
                id: ciclo.idCiclo,
                nome: ciclo.nomeCiclo,
                status: ciclo.status,
                dataFim: ciclo.dataFim,
                tempoRestante: `${diffDays} dias, ${diffHours} horas, ${diffMinutes} minutos`
            };
        });
    }

    async getHistoricoCiclos() {
        const ciclos = await this.prisma.cicloAvaliacao.findMany({
            where: {
                status: 'FECHADO',
            },
        });

        return ciclos.map((ciclo) => ({
            id: ciclo.idCiclo,
            nome: ciclo.nomeCiclo,
            dataEncerramento: ciclo.dataFim,
            status: ciclo.status,
        }));
    }

    // --- MÉTODOS PRIVADOS DE VALIDAÇÃO E AUXILIARES ---

    private async _findCicloById(id: string): Promise<CicloAvaliacao> {
        if (!this._isValidUUID(id)) {
            throw new BadRequestException('ID do ciclo inválido.');
        }
        const ciclo = await this.prisma.cicloAvaliacao.findUnique({
            where: { idCiclo: id },
        });
        if (!ciclo) {
            throw new NotFoundException('Ciclo não encontrado.');
        }
        return ciclo;
    }

    private async _validarDatas(
        dataInicio: Date,
        dataFim: Date,
        duracaoEmAndamentoDias: number,
        duracaoEmRevisaoDias: number,
        duracaoEmEqualizacaoDias: number,
        idCiclo?: string
    ): Promise<void> {
        if (!dataInicio || !dataFim) {
            throw new BadRequestException('Data de início ou fim inválida.');
        }
        if (dataInicio > dataFim) {
            throw new BadRequestException(
                'Data de início não pode ser maior que a data de fim.',
            );
        }
        if (idCiclo === undefined && dataInicio.getTime() < hoje.getTime()) {
            throw new BadRequestException(
                `Data de início ${dataInicio.toISOString()} não pode ser menor que o dia atual ${hoje.toISOString()}.`,
            );
        }

        const diffMs = dataFim.getTime() - dataInicio.getTime();
        const diffDays = (diffMs / (1000 * 60 * 60 * 24)) + 1;

        if (diffDays < TEMPO_MINIMO_DIAS) {
            throw new BadRequestException(
                `O ciclo deve ter pelo menos ${TEMPO_MINIMO_DIAS} dias de duração.`,
            );
        }
        if (diffDays > TEMPO_MAXIMO_DIAS) {
            throw new BadRequestException(
                `O ciclo não pode ter mais de ${TEMPO_MAXIMO_DIAS} dias de duração.`
            );
        }

        const somaDuracoes = duracaoEmAndamentoDias + duracaoEmRevisaoDias + duracaoEmEqualizacaoDias;
        if (somaDuracoes !== diffDays) {
            throw new BadRequestException(
                `soma das durações dos status do ciclo (${somaDuracoes} dias) deve ser igual ao número total de dias do ciclo ${diffDays} diffDays`
            );
        }

        // Verifica se já existe algum ciclo com datas sobrepostas
        const ciclosExistentes = await this.prisma.cicloAvaliacao.findMany({
            select: { idCiclo: true, dataInicio: true, dataFim: true }
        });

        for (const ciclo of ciclosExistentes) {
            // Se o novo ciclo começa antes do fim de um ciclo existente
            // e termina depois do início de um ciclo existente, há sobreposição
            if (ciclo.idCiclo !== idCiclo) {
                if (
                    (dataInicio <= ciclo.dataFim) &&
                    (dataFim >= ciclo.dataInicio)
                ) {
                    console.log(" ============")
                    console.log("COMPARATIVO")
                    console.log("Data inicio ", dataInicio, " e data inicio ciclo: ", ciclo.dataInicio)
                    console.log("Data fim ", dataFim, " e data fim ciclo: ", ciclo.dataFim)
                    throw new ConflictException(
                        `O período informado (${dataInicio.toISOString()} a ${dataFim.toISOString()}) sobrepõe o ciclo existente de ${ciclo.dataInicio.toISOString()} a ${ciclo.dataInicio.toISOString()}.`
                    );
                }

            }

        }

        // Validação: soma das durações dos status deve ser igual ao total de dias do ci
    }

    private async _validarNomeUnico(nome: string): Promise<void> {
        const cicloComMesmoNome = await this.prisma.cicloAvaliacao.findFirst({
            where: { nomeCiclo: nome },
        });
        if (cicloComMesmoNome) {
            throw new ConflictException('Já existe um ciclo com este nome.');
        }
    }

    private async _validarCicloEmAndamento(): Promise<void> {
        const cicloEmAndamento = await this.prisma.cicloAvaliacao.findFirst({
            where: { status: 'EM_ANDAMENTO' },
        });
        if (cicloEmAndamento) {
            throw new ConflictException('Já existe um ciclo em andamento.');
        }
    }

    private _isSameDay(date1: Date, date2: Date): boolean {
        return (
            date1.getUTCFullYear() === date2.getUTCFullYear() &&
            date1.getUTCMonth() === date2.getUTCMonth() &&
            date1.getUTCDate() === date2.getUTCDate()
        );
    }

    private async _handleStatus(idCiclo: string): Promise<cicloStatus | undefined> {
        const ciclo = await this.prisma.cicloAvaliacao.findFirst({
            where: { idCiclo }
        });

        if (!ciclo) {
            return undefined;
        }

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

        return newStatus;
    }

    private _isValidUUID(uuid: string): boolean {
        const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    private _isDataValida(ano: number, mes: number, dia: number): boolean {
        const data = new Date(Date.UTC(ano, mes - 1, dia));
        return (
            data.getUTCFullYear() === ano &&
            data.getUTCMonth() === mes - 1 &&
            data.getUTCDate() === dia
        );
    }

    private _createData(
        ano: number,
        mes: number,
        dia: number,
    ): Date {
        if (!this._isDataValida(ano, mes, dia)) {
            throw new BadRequestException(`Data inválida fornecida: ${dia}/${mes}/${ano}`);
        }
        // Cria a data no início do dia em Brasília (00:00:00), que é 03:00:00 em UTC
        return new Date(Date.UTC(ano, mes - 1, dia, 0, 0, 0, 0));
    }

    private _validarPadraoNomeCiclo(nome: string): void {
        const padrao = /^\d{4}\.\d{1}$/;
        if (!padrao.test(nome)) {
            throw new BadRequestException(
                'O nome do ciclo deve seguir o padrão AAAA.S (ex: 2024.1).',
            );
        }
    }
}
