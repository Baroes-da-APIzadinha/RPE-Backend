import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prismaService';
import * as bcrypt from 'bcrypt';
import { CreateColaboradorDto, UpdateColaboradorDto } from './colaborador.dto';
import { perfilTipo } from '@prisma/client';

@Injectable()
export class ColaboradorService {
    constructor(private readonly prisma: PrismaService) {}

    async criarColaborador(data: CreateColaboradorDto) {
        const salt = await bcrypt.genSalt();
        const senhaHash = await bcrypt.hash(data.senha, salt);

        const alredyExists = await this.prisma.colaborador.findUnique({
            where: { email: data.email}
        });

        if (alredyExists) {
            return {
                status: 400,
                message: 'Colaborador já existe'
            }
        }

        return this.prisma.colaborador.create({
            data: {
                ...data,
                senha: senhaHash
            }
        });
    }

    async removerColaborador(id: string) {
        if (!this.isValidUUID(id)) {
            return {
                status: 400,
                message: 'ID do colaborador inválido'
            }
        }

        const colaborador = await this.prisma.colaborador.findUnique({
            where: { idColaborador: id }
        });

        if (!colaborador) {
            return {
                status: 404,
                message: 'Colaborador não encontrado'
            }
        }

        return this.prisma.colaborador.delete({
            where: { idColaborador: id }
        });
    }

    async getColaborador(id: string) {
        if (!this.isValidUUID(id)) {
            return {
                status: 400,
                message: 'ID do colaborador inválido'
            }
        }

        const colaborador = await this.prisma.colaborador.findUnique({
            where: { idColaborador: id }
        });

        if (!colaborador) {
            return {
                status: 404,
                message: 'Colaborador não encontrado'
            }
        }

        return colaborador;
    }

    async updateColaborador(id: string, data: UpdateColaboradorDto) {
        if (!this.isValidUUID(id)) {
            return {
                status: 400,
                message: 'ID do colaborador inválido'
            }
        }
        const emailExists = await this.prisma.colaborador.findUnique({
            where: { email: data.email}
        });

        if (emailExists) {
            return {
                status: 400,
                message: 'Email já cadastrado'
            }
        }

        const colaborador = await this.prisma.colaborador.findUnique({
            where: { idColaborador: id }
        });

        if (!colaborador) {
            return {
                status: 404,
                message: 'Colaborador não encontrado'
            }
        }

        // Se a senha for fornecida, fazer o hash
        if (data.senha) {
            const salt = await bcrypt.genSalt();
            data.senha = await bcrypt.hash(data.senha, salt);
        }

        return this.prisma.colaborador.update({
            where: { idColaborador: id },
            data
        });
    }

    async associarPerfilColaborador(idColaborador: string, tipoPerfil: string) {
        if (!this.isValidUUID(idColaborador)) {
            return {
                status: 400,
                message: 'ID do colaborador inválido'
            }
        }
        // Verifica se o colaborador existe
        const colaborador = await this.prisma.colaborador.findUnique({
            where: { idColaborador }
        });
        if (!colaborador) {
            return {
                status: 404,
                message: 'Colaborador não encontrado'
            }
        }
        // Valida se o tipoPerfil é válido
        if (!Object.values(perfilTipo).includes(tipoPerfil as perfilTipo)) {
            return {
                status: 400,
                message: 'Tipo de perfil inválido'
            }
        }
        // Verifica se já existe a associação
        const jaAssociado = await this.prisma.colaboradorPerfil.findUnique({
            where: {
                idColaborador_tipoPerfil: {
                    idColaborador,
                    tipoPerfil: tipoPerfil as perfilTipo
                }
            }
        });
        if (jaAssociado) {
            return {
                status: 400,
                message: 'Perfil já associado ao colaborador'
            }
        }
        // Cria a associação
        return this.prisma.colaboradorPerfil.create({
            data: {
                idColaborador,
                tipoPerfil: tipoPerfil as perfilTipo
            }
        });
    }

    private isValidUUID(uuid: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }
}