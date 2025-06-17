import { Injectable } from '@nestjs/common';
import { Colaborador } from '@prisma/client';
import { PrismaService } from 'src/database/prismaService';
import * as bcrypt from 'bcrypt';
import { CreateColaboradorDto, UpdateColaboradorDto } from './colaborador.dto';

@Injectable()
export class ColaboradorService {
    constructor(private readonly prisma: PrismaService) {}

    async criarColaborador(data: CreateColaboradorDto   ) {
        const salt = await bcrypt.genSalt();
        const senhaHash = await bcrypt.hash(data.senha, salt);
        
        return this.prisma.colaborador.create({
            data: {
                ...data,
                senha: senhaHash
            }
        });
    }

    async removerColaborador(id: string) {
        return this.prisma.colaborador.delete({
            where: {idColaborador: id}
        })
    }

    async getColaborador(id: string) {
        return this.prisma.colaborador.findUnique({
            where: {idColaborador: id}
        })
    }
    async updateColaborador(id: string, data: UpdateColaboradorDto) {
        return this.prisma.colaborador.update({
            where: {idColaborador: id},
            data
        })
    }
 
}
