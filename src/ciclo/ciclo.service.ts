import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/database/prismaService';
import { CreateCicloDto, UpdateCicloDto } from './ciclo.dto';
import { cicloStatus, Prisma, avaliacaoTipo } from '@prisma/client';


const tempoMinimo = 20;
const tempoMaximo = 40;

// Pega o momento atual em UTC
const hoje = new Date();
hoje.setHours(-3, 0, 0, 0);
console.log(hoje)

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

    async createCiclo(data: CreateCicloDto) {
        console.log(hoje.getDate())

        const cicloEmAndamento = await this.prisma.cicloAvaliacao.findFirst({
            where: {
                status: 'EM_ANDAMENTO'
            }
        })
        if (cicloEmAndamento) {
            return {
                status: 400,
                message: 'Já existe um ciclo em andamento'
            }
        }

        const dataInicio = this.createData(data.dataInicioAno, data.dataInicioMes, data.dataInicioDia);
        const dataFim = this.createData(data.dataFimAno, data.dataFimMes, data.dataFimDia);

        if (!dataInicio || !dataFim) {
            return {
                status: 400,
                message: 'Data de início ou fim inválida.'
            }
        }

        if (dataInicio > dataFim ) {
            return {
                status: 400,
                message: 'Data de início não pode ser maior que a data de fim'
            }
        }
    
        if (dataInicio < hoje || dataFim < hoje) {
            return {
                status: 400,
                message: 'Data de início ou fim não pode ser menor que o dia atual'
            }
        }

        const diffMs = dataFim.getTime() - dataInicio.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays < tempoMinimo) {
            return { status: 400, message: `O ciclo deve ter pelo menos ${tempoMinimo} dias de duração.` };
        }
        if (diffDays > tempoMaximo) {
            return { status: 400, message: `O ciclo não pode ter mais de ${tempoMaximo} dias de duração.` };
        }

        

        const cicloNameExists = await this.prisma.cicloAvaliacao.findFirst({
            where: {
                nomeCiclo: data.nome
            }
        })
        if (cicloNameExists) {
            return {
                status: 400,
                message: 'Ciclo com este nome já existe'
            }
        }


        return this.prisma.cicloAvaliacao.create({
            data: {
                nomeCiclo: data.nome,
                dataInicio: dataInicio,
                dataFim: dataFim,
                status: data.status as cicloStatus
            }
        })
    }

    async deleteCiclo(id: string) {

        if (!this.isValidUUID(id)) {
            return {
                status: 400,
                message: 'ID do ciclo inválido'
            }
        }

        const cicloExists = await this.prisma.cicloAvaliacao.findUnique({
            where: {
                idCiclo: id
            }
        })

        if (!cicloExists) {
            return {
                status: 404,
                message: 'Ciclo não encontrado'
            }
        }

        await this.prisma.cicloAvaliacao.delete({
            where: {
                idCiclo: id
            }
        })
        return {
            status: 200,
            message: 'Ciclo removido com sucesso',
            data: cicloExists
        }
    }

    async getCiclo(id: string) {
        if (!this.isValidUUID(id)) {
            return {
                status: 400,
                message: 'ID do ciclo inválido'
            }
        }

        const cicloExists = await this.prisma.cicloAvaliacao.findUnique({
            where: {
                idCiclo: id
            }
        })

        if (!cicloExists) {
            return {
                status: 404,
                message: 'Ciclo não encontrado'
            }
        }
        return {
            status: 200,
            message: 'Ciclo encontrado com sucesso',
            data: cicloExists
        }
    }   

    async updateCiclo(id: string, data: UpdateCicloDto) {
        if (!this.isValidUUID(id)) {
            return {
                status: 400,
                message: 'ID do ciclo inválido'
            }
        }

        const cicloExists = await this.prisma.cicloAvaliacao.findUnique({
            where: {
                idCiclo: id
            }
        })

        if (!cicloExists) {
            return {
                status: 404,
                message: 'Ciclo não encontrado'
            }
        }

        // Monta as datas a partir dos campos recebidos ou mantém as antigas
        let dataInicio = cicloExists.dataInicio;
        let dataFim = cicloExists.dataFim;
        
        if (data.dataInicioAno && data.dataInicioMes && data.dataInicioDia) {
            dataInicio = new Date(data.dataInicioAno, data.dataInicioMes -1, data.dataInicioDia);
            if (!this.isDataValida(data.dataInicioAno, data.dataInicioMes, data.dataInicioDia)) {
                return {
                    status: 400,
                    message: 'Data de início inválida.'
                }
            }
           
        }
        if (data.dataFimAno && data.dataFimMes && data.dataFimDia) {
            dataFim = new Date(data.dataFimAno, data.dataFimMes -1, data.dataFimDia);
            if (!this.isDataValida(data.dataFimAno, data.dataFimMes, data.dataFimDia)) {
                return {
                    status: 400,
                    message: 'Data de fim inválida.'
                }
            }
        }

        if (dataInicio > dataFim ) {
            return {
                status: 400,
                message: 'Data de início não pode ser maior que a data de fim'
            }
        }
        if (dataInicio < new Date() || dataFim < new Date()) {
            return {
                status: 400,
                message: 'Data de início ou fim não pode ser menor que a data atual'
            }
        }

        const diffMs = dataFim.getTime() - dataInicio.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays < tempoMinimo) {
            return { status: 400, message: `O ciclo deve ter pelo menos ${tempoMinimo} dias de duração.` };
        }
        if (diffDays > tempoMaximo) {
            return { status: 400, message: `O ciclo não pode ter mais de ${tempoMaximo} dias de duração.` };
        }

        return this.prisma.cicloAvaliacao.update({
            where: {
                idCiclo: id
            },
            data: {
                ...data,
                dataInicio,
                dataFim
            }
        })
    }   

    async getCiclos() {
        return this.prisma.cicloAvaliacao.findMany({
            orderBy: {
                dataInicio: 'desc'
            }
        })
    }

    async getCiclosAtivos() {
        const ciclos = await this.prisma.cicloAvaliacao.findMany({
            where: {
                status: 'EM_ANDAMENTO'
            }
        });

        return ciclos.map(ciclo => {
            const dataFim = new Date(ciclo.dataFim);
            const diffMs = dataFim.getTime() - hoje.getTime();

            // Converter para dias, horas, minutos
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
            const diffMinutes = Math.floor((diffMs / (1000 * 60)) % 60);

            return {
                id: ciclo.idCiclo,
                nome: ciclo.nomeCiclo,
                tempoRestante: `${diffDays} dias, ${diffHours} horas, ${diffMinutes} minutos`
            };
        });
    }

    async getHistoricoCiclos() {
        const ciclos = await this.prisma.cicloAvaliacao.findMany({
            where: {
                status: 'FECHADO'
            }
        });

        return ciclos.map(ciclo => ({
            id: ciclo.idCiclo,
            nome: ciclo.nomeCiclo,
            dataEncerramento: ciclo.dataFim,
            status: ciclo.status
        }));
    }



    private isValidUUID(uuid: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    private isDataValida(ano: number, mes: number, dia: number): boolean {
        // mes: 1-12
        const data = new Date(ano, mes - 1, dia);
        return (
            data.getFullYear() === ano &&
            data.getMonth() === mes - 1 &&
            data.getDate() === dia
        );
    }

    private createData(ano: number, mes: number, dia: number) {
        // Pega o momento atual em UTC
        const date = new Date(ano, mes - 1, dia);
        if(this.isDataValida(ano, mes, dia)) {
            return date;
        }
        return null;
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

        // ================== INÍCIO DA CORREÇÃO CRÍTICA ==================
        // ETAPA 2: Coleta de dados - BUSCA CORRETA DOS PARTICIPANTES
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
        // =================== FIM DA CORREÇÃO CRÍTICA ====================

        const mapaGestaoDoCiclo = await this.prisma.gestorColaborador.findMany({
            where: { idCiclo: idCiclo }
        });
        console.log('DEBUG: Relações de gestão encontradas para este ciclo:', mapaGestaoDoCiclo);

        // Usando a tipagem correta do Prisma
        const novasAvaliacoes: Prisma.AvaliacaoCreateManyInput[] = [];

        // ETAPA 3: Geração dos registros - Agora o loop é sobre os participantes corretos
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

        // ETAPA 4: Inserção em massa (continua igual)
        if (novasAvaliacoes.length > 0) {
            const resultado = await this.prisma.avaliacao.createMany({ data: novasAvaliacoes });
            this.logger.log(`${resultado.count} avaliações geradas com SUCESSO para o ciclo ${idCiclo}.`);
        } else {
            this.logger.warn(`Nenhuma avaliação foi gerada para o ciclo ${idCiclo}. Verifique os dados.`);
        }
    }

}
