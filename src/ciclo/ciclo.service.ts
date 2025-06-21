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

const TEMPO_MINIMO_DIAS = 20;
const TEMPO_MAXIMO_DIAS = 40;

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
        3, 0, 0, 0,
    ),
);

// Tipos auxiliares para correção
type AvaliacaoCreateManyInput = {
  idCiclo: string;
  idAvaliado: string;
  idAvaliador: string;
  tipo: string;
};

type RelacaoGestor = {
  idColaborador: string;
  idGestor: string;
  idCiclo: string;
  idGestorMentorado: string;
};

@Injectable()
export class CicloService {
    constructor(private readonly prisma: PrismaService) {}
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
            data.dataFimDia,
            true,
        );

        await this._validarDatas(dataInicio, dataFim);
        this._validarPadraoNomeCiclo(data.nome);
        await this._validarNomeUnico(data.nome);

        const status = this._isSameDay(dataInicio, hoje)
            ? cicloStatus.EM_ANDAMENTO
            : cicloStatus.AGENDADO;

        return this.prisma.cicloAvaliacao.create({
            data: {
                nomeCiclo: data.nome,
                dataInicio,
                dataFim,
                status,
            },
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
                      data.dataFimDia,
                      true,
                  )
                : cicloExistente.dataFim;

        await this._validarDatas(dataInicio, dataFim);

        if (data.nome && data.nome !== cicloExistente.nomeCiclo) {
            this._validarPadraoNomeCiclo(data.nome);
            await this._validarNomeUnico(data.nome);
        }

        const status = this._isSameDay(dataInicio, hoje)
            ? cicloStatus.EM_ANDAMENTO
            : cicloStatus.AGENDADO;

        return this.prisma.cicloAvaliacao.update({
            where: { idCiclo: id },
            data: {
                nomeCiclo: data.nome,
                dataInicio,
                dataFim,
                status,
            },
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
                status: 'EM_ANDAMENTO',
            },
        });

        return ciclos.map((ciclo) => {
            const dataFim = new Date(ciclo.dataFim);
            const diffMs = dataFim.getTime() - hoje.getTime();

            // Converter para dias, horas, minutos
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
            const diffMinutes = Math.floor((diffMs / (1000 * 60)) % 60);

            return {
                id: ciclo.idCiclo,
                nome: ciclo.nomeCiclo,
                tempoRestante: `${diffDays} dias, ${diffHours} horas, ${diffMinutes} minutos`,
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
    ): Promise<void> {
        if (!dataInicio || !dataFim) {
            throw new BadRequestException('Data de início ou fim inválida.');
        }
        if (dataInicio > dataFim) {
            throw new BadRequestException(
                'Data de início não pode ser maior que a data de fim.',
            );
        }
        if (dataInicio.getTime() < hoje.getTime()) {
            throw new BadRequestException(
                'Data de início não pode ser menor que o dia atual.',
            );
        }

        const diffMs = dataFim.getTime() - dataInicio.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffDays < TEMPO_MINIMO_DIAS) {
            throw new BadRequestException(
                `O ciclo deve ter pelo menos ${TEMPO_MINIMO_DIAS} dias de duração.`,
            );
        }
        if (diffDays > TEMPO_MAXIMO_DIAS) {
            throw new BadRequestException(
                `O ciclo não pode ter mais de ${TEMPO_MAXIMO_DIAS} dias de duração.`,
            );
        }
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

    private _isValidUUID(uuid: string): boolean {
        const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    /**
     * Método principal chamado pelo controller.
     * Ele dispara a execução em background e retorna uma resposta imediata.
     */
    async lancarAvaliacoes(idCiclo: string) {
      this.executarLancamentoEmBackground(idCiclo).catch((error) => {
        this.logger.error(
          `Falha CRÍTICA ao executar o lançamento para o ciclo ${idCiclo}`,
          error.stack,
        );
      });

      return {
        statusCode: 202,
        message:
          'O lançamento das avaliações foi iniciado em segundo plano. Isso pode levar alguns minutos.',
      };
    }

    /**
     * Este método contém a lógica pesada e foi projetado para rodar em background.
     */
    private async executarLancamentoEmBackground(idCiclo: string): Promise<void> {
        this.logger.log(`Iniciando job de lançamento para o ciclo ID: ${idCiclo}`);

        // Validações (seu código aqui está bom)
        const ciclo = await this.prisma.cicloAvaliacao.findUnique({ where: { idCiclo } });
        if (!ciclo) {
            this.logger.error(`Ciclo ${idCiclo} não encontrado.`);
            throw new NotFoundException('O ciclo especificado não foi encontrado.');
        }
        const avaliacoesExistentes = await this.prisma.avaliacao.count({ where: { idCiclo } });
        if (avaliacoesExistentes > 0) {
            this.logger.warn(`Ciclo ${idCiclo} já possui avaliações lançadas.`);
            throw new ConflictException('Este ciclo de avaliação já foi lançado anteriormente.');
        }

        const participantesDoCiclo = await this.prisma.colaboradorCiclo.findMany({
            where: { idCiclo: idCiclo },
            include: {
                colaborador: true // Traz os dados do colaborador junto
            }
        });

        if (participantesDoCiclo.length === 0) {
            this.logger.warn(`Nenhum colaborador associado a este ciclo (${idCiclo}). Processo encerrado.`);
            return;
        }

        const mapaGestaoDoCiclo = await this.prisma.gestorColaborador.findMany({
            where: { idCiclo: idCiclo }
        });
        console.log('DEBUG: Relações de gestão encontradas para este ciclo:', mapaGestaoDoCiclo);

        // Usando a tipagem correta do Prisma
        const novasAvaliacoes: Prisma.AvaliacaoCreateManyInput[] = [];

        for (const participante of participantesDoCiclo) {
            const colaborador = participante.colaborador; // Pegamos os dados do colaborador aqui
            console.log(`--- DEBUG: Processando Colaborador ID: ${colaborador.idColaborador} ---`);
            
            novasAvaliacoes.push({
                idCiclo: idCiclo,
                idAvaliado: colaborador.idColaborador,
                idAvaliador: colaborador.idColaborador,
                tipo: "AUTOAVALIACAO", // Usando string ou o enum 'avaliacaoTipo.AUTOAVALIACAO'
            });

            const relacaoGestor = mapaGestaoDoCiclo.find(
                (rel) => rel.idColaborador === colaborador.idColaborador,
            );
            console.log(`DEBUG: Relação de gestor encontrada para este colaborador?`, relacaoGestor);

            if (relacaoGestor) {
                novasAvaliacoes.push({
                    idCiclo: idCiclo,
                    idAvaliado: colaborador.idColaborador,
                    idAvaliador: relacaoGestor.idGestor,
                    tipo: "GESTOR_LIDERADO",
                });
                novasAvaliacoes.push({
                    idCiclo: idCiclo,
                    idAvaliado: relacaoGestor.idGestor,
                    idAvaliador: colaborador.idColaborador,
                    tipo: "LIDERADO_GESTOR",
                });
            }
        }

        if (novasAvaliacoes.length > 0) {
            const resultado = await this.prisma.avaliacao.createMany({ data: novasAvaliacoes });
            this.logger.log(`${resultado.count} avaliações geradas com SUCESSO para o ciclo ${idCiclo}.`);
        } else {
            this.logger.warn(`Nenhuma avaliação foi gerada para o ciclo ${idCiclo}. Verifique os dados.`);
        }
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
        isDataFim: boolean = false,
    ): Date {
        if (!this._isDataValida(ano, mes, dia)) {
            throw new BadRequestException(`Data inválida fornecida: ${dia}/${mes}/${ano}`);
        }

        if (isDataFim) {
            // Cria a data no final do dia em Brasília (23:59:59.999), que é 02:59:59.999 do dia seguinte em UTC
            return new Date(
                Date.UTC(ano, mes - 1, dia, 23, 59, 59, 999) +
                    3 * 60 * 60 * 1000,
            );
        }
        // Cria a data no início do dia em Brasília (00:00:00), que é 03:00:00 em UTC
        return new Date(Date.UTC(ano, mes - 1, dia, 3, 0, 0, 0));
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
