import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prismaService';
import { CreateCicloDto, UpdateCicloDto } from './ciclo.dto';
import { cicloStatus } from '@prisma/client';

const tempoMinimo = 20;
const tempoMaximo = 40;

// Pega o momento atual em UTC
const hoje = new Date();
hoje.setHours(-3, 0, 0, 0);
console.log(hoje)

@Injectable()
export class CicloService {
    constructor(private readonly prisma: PrismaService) {}

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

}
