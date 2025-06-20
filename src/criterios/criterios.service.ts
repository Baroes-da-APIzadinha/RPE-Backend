import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prismaService';
import { pilarCriterio } from '@prisma/client';
import { CreateCriterioDto, UpdateCriterioDto } from './criterios.dto';

@Injectable()
export class CriteriosService {
    constructor(private prisma: PrismaService) {}
    
    async getCriterios() {
        return this.prisma.criterioAvaliativo.findMany({
        orderBy: {
            idCriterio: 'asc',
        },
        });
    }
    
    async getCriterio(id: string) {
        return this.prisma.criterioAvaliativo.findUnique({
        where: { idCriterio: id },
        });
    }

    async getCriterioPorPilar(pilar: pilarCriterio) {
        return this.prisma.criterioAvaliativo.findMany({
            where: { pilar },
        });
    }
    
    async createCriterio(data: CreateCriterioDto) {
        return this.prisma.criterioAvaliativo.create({
        data,
        });
    }
    
    async updateCriterio(id: string, data: UpdateCriterioDto) {
        return this.prisma.criterioAvaliativo.update({
        where: { idCriterio: id },
        data: {
            ...data,
            dataUltimaModificacao: new Date(),
        },
        });
    }
    
    async deleteCriterio(id: string) {
        return this.prisma.criterioAvaliativo.delete({
        where: { idCriterio: id },
        });
    }
}