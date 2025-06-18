import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prismaService';
import { CreateCicloDto, UpdateCicloDto } from './ciclo.dto';
import { cicloStatus } from '@prisma/client';


@Injectable()
export class CicloService {
    constructor(private readonly prisma: PrismaService) {}

    async createCiclo(data: CreateCicloDto) {

        if (data.dataInicio > data.dataFim ) {
            return {
                status: 400,
                message: 'Data de início não pode ser maior que a data de fim'
            }
        }
        if (data.dataInicio < new Date().toISOString() || data.dataFim < new Date().toISOString()) {
            return {
                status: 400,
                message: 'Data de início ou fim não pode ser menor que a data atual'
            }
        }
        if(data.status !== 'EM_ANDAMENTO' && data.status !== 'FECHADO') {
            return {
                status: 400,
                message: 'Status inválido, deve ser EM_ANDAMENTO ou FECHADO'
            }
        }

        return this.prisma.cicloAvaliacao.create({
            data: {
                nomeCiclo: data.nome,
                dataInicio: data.dataInicio,
                dataFim: data.dataFim,
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
        if (data.dataInicio > data.dataFim ) {
            return {
                status: 400,
                message: 'Data de início não pode ser maior que a data de fim'
            }
        }
        if (data.dataInicio < new Date().toISOString() || data.dataFim < new Date().toISOString()) {
            return {
                status: 400,
                message: 'Data de início ou fim não pode ser menor que a data atual'
            }
        }
        if(data.status !== 'EM_ANDAMENTO' && data.status !== 'FECHADO') {
            return {
                status: 400,
                message: 'Status inválido, deve ser EM_ANDAMENTO ou FECHADO'
            }
        }

        return this.prisma.cicloAvaliacao.update({
            where: {
                idCiclo: id
            },
            data
        })
    }   

    async getCiclos() {
        return this.prisma.cicloAvaliacao.findMany({
            orderBy: {
                dataInicio: 'desc'
            }
        })
    }


    private isValidUUID(uuid: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }


}
