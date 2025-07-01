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

    async getColaborador(id: string, user?: any) {
        if (!this.isValidUUID(id)) {
            return {
                status: 400,
                message: 'ID do colaborador inválido'
            }
        }

        // Se for ADMIN, retorna normalmente
        if (user && user.roles && user.roles.includes('ADMIN')) {
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

        // Se for GESTOR, só pode acessar seus liderados
        if (user && user.roles && user.roles.includes('GESTOR')) {
            const relacao = await this.prisma.gestorColaborador.findFirst({
                where: {
                    idGestor: user.userId,
                    idColaborador: id
                }
            });
            if (!relacao) {
                return {
                    status: 403,
                    message: 'Acesso negado: colaborador não é liderado deste gestor.'
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

        // Outros perfis: acesso negado
        return {
            status: 403,
            message: 'Acesso negado.'
        }
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

    async associarColaboradorCiclo(idColaborador: string, idCiclo: string) {
        if (!this.isValidUUID(idColaborador) || !this.isValidUUID(idCiclo)) {
            return {
                status: 400,
                message: 'ID do colaborador ou ciclo inválido'
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
        // Verifica se o ciclo existe
        const ciclo = await this.prisma.cicloAvaliacao.findUnique({
            where: { idCiclo }
        });
        if (!ciclo) {
            return {
                status: 404,
                message: 'Ciclo não encontrado'
            }
        }
        // Verifica se já existe a associação
        const jaAssociado = await this.prisma.colaboradorCiclo.findFirst({
            where: {
                idColaborador,
                idCiclo
            }
        });
        if (jaAssociado) {
            return {
                status: 400,
                message: 'Colaborador já está associado a este ciclo'
            }
        }
        // Cria a associação
        return this.prisma.colaboradorCiclo.create({
            data: {
                idColaborador,
                idCiclo
            }
        });
    }

    async getColaboradoresAtivos() {
        // Buscar ciclo ativo
        const cicloAtivo = await this.prisma.cicloAvaliacao.findFirst({
            where: { status: 'EM_ANDAMENTO' },
        });
        if (!cicloAtivo) {
            return {
                status: 404,
                mensagem: 'Nenhum ciclo em andamento',
            };
        }
        // Buscar colaboradores participantes do ciclo ativo
        const participantes = await this.prisma.colaboradorCiclo.findMany({
            where: { idCiclo: cicloAtivo.idCiclo },
            include: { colaborador: true },
        });
        // Calcular tempo restante
        const dataFim = new Date(cicloAtivo.dataFim);
        const agora = new Date();
        const diffMs = dataFim.getTime() - agora.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
        const diffMinutes = Math.floor((diffMs / (1000 * 60)) % 60);
        const tempoRestante = `${diffDays} dias, ${diffHours} horas, ${diffMinutes} minutos`;
        // Montar resposta
        return participantes.map((p) => ({
            id: p.colaborador.idColaborador,
            nome: p.colaborador.nomeCompleto,
            tempoRestante,
        }));
    }
}