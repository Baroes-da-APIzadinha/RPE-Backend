import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prismaService';

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
    
    async createCriterio(data: any) {
        return this.prisma.criterioAvaliativo.create({
        data,
        });
    }
    
    async updateCriterio(id: string, data: any) {
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