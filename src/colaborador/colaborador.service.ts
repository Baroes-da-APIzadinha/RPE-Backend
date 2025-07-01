import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prismaService';
import * as bcrypt from 'bcrypt';
import { CreateColaboradorDto, UpdateColaboradorDto } from './colaborador.dto';
import { perfilTipo } from '@prisma/client';

@Injectable()
export class ColaboradorService {
    constructor(private readonly prisma: PrismaService) {}

    async criarColaborador(data: CreateColaboradorDto) {
        const { admin, colaboradorComum, gestor, rh, mentor, lider, membroComite, ...colaboradorData } = data;
        const salt = await bcrypt.genSalt();
        const senhaHash = await bcrypt.hash(colaboradorData.senha, salt);

        const alredyExists = await this.prisma.colaborador.findUnique({
            where: { email: colaboradorData.email}
        });

        if (alredyExists) {
            return {
                status: 400,
                message: 'Colaborador já existe'
            }
        }

        const colaborador = await this.prisma.colaborador.create({
            data: {
                ...colaboradorData,
                senha: senhaHash
            }
        });

        if (admin) {
            await this.associarPerfilColaborador(colaborador.idColaborador, 'ADMIN');
        } 
        if (colaboradorComum) {
            await this.associarPerfilColaborador(colaborador.idColaborador, 'COLABORADOR_COMUM');
        } 
        if (gestor) {
            await this.associarPerfilColaborador(colaborador.idColaborador, 'GESTOR');
        } 
        if (rh) {
            await this.associarPerfilColaborador(colaborador.idColaborador, 'RH');
        } 
        if (mentor) {
            await this.associarPerfilColaborador(colaborador.idColaborador, 'MENTOR');
        } 
        if (lider) {
            await this.associarPerfilColaborador(colaborador.idColaborador, 'LIDER');
        } 
        if (membroComite) {
            await this.associarPerfilColaborador(colaborador.idColaborador, 'MEMBRO_COMITE');
        }

        return colaborador;
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

    async getAvaliacoesRecebidas(idColaborador: string) {
        // Conta todas as avaliações recebidas pelo colaborador
        const quantidadeAvaliacoes = await this.prisma.avaliacao.count({
            where: { idAvaliado: idColaborador },
        });
        return { quantidadeAvaliacoes };
      
    }
  
    async getAllColaborador() {
        // Busca todos os perfis COLABORADOR_COMUM
        const perfis = await this.prisma.colaboradorPerfil.findMany({
            where: { tipoPerfil: 'COLABORADOR_COMUM' },
            select: { idColaborador: true }
        });
        const ids = perfis.map(p => p.idColaborador);
        // Busca todos os colaboradores correspondentes, excluindo o campo senha
        const colaboradores = await this.prisma.colaborador.findMany({
            where: { idColaborador: { in: ids } },
            select: {
                idColaborador: true,
                nomeCompleto: true,
                email: true,
                trilhaCarreira: true,
                cargo: true,
                unidade: true
                // Adicione outros campos que deseja retornar, mas não inclua 'senha'
            }
        });
        return colaboradores;
    }

    async isColaborador(idColaborador: string): Promise<boolean> {
        const perfil = await this.prisma.colaboradorPerfil.findUnique({
            where: {
                idColaborador_tipoPerfil: {
                    idColaborador,
                    tipoPerfil: 'COLABORADOR_COMUM',
                },
            },
        });
        return !!perfil;
    }

    async isGestor(idColaborador: string): Promise<boolean> {
        if (!this.isValidUUID(idColaborador)) {
            return false;
        }
        const perfil = await this.prisma.colaboradorPerfil.findUnique({
            where: {
                idColaborador_tipoPerfil: {
                    idColaborador,
                    tipoPerfil: 'GESTOR',
                },
            },
        });
        return !!perfil;
    }

    async isRh(idColaborador: string): Promise<boolean> {
        if (!this.isValidUUID(idColaborador)) {
            return false;
        }
        const perfil = await this.prisma.colaboradorPerfil.findUnique({
            where: {
                idColaborador_tipoPerfil: {
                    idColaborador,
                    tipoPerfil: 'RH',
                },
            },
        });
        return !!perfil;
    }

    async isMembroComite(idColaborador: string): Promise<boolean> {
        if (!this.isValidUUID(idColaborador)) {
            return false;
        }
        const perfil = await this.prisma.colaboradorPerfil.findUnique({
            where: {
                idColaborador_tipoPerfil: {
                    idColaborador,
                    tipoPerfil: 'MEMBRO_COMITE',
                },
            },
        });
        return !!perfil;
    }

    async isAdmin(idColaborador: string): Promise<boolean> {
        if (!this.isValidUUID(idColaborador)) {
            return false;
        }
        const perfil = await this.prisma.colaboradorPerfil.findUnique({
            where: {
                idColaborador_tipoPerfil: {
                    idColaborador,
                    tipoPerfil: 'ADMIN',
                },
            },
        });
        return !!perfil;
    }

    async getHistoricoNotasPorCiclo(idColaborador: string) {
        // Buscar todos os ciclos em que o colaborador participou
        const colaboradorCiclos = await this.prisma.colaboradorCiclo.findMany({
            where: { idColaborador },
            include: { ciclo: true },
        });

        // Para cada ciclo, buscar avaliações do tipo LIDER_COLABORADOR para este colaborador
        const historico = await Promise.all(colaboradorCiclos.map(async (cc) => {
            const avaliacoesLider = await this.prisma.avaliacao.findMany({
                where: {
                    idCiclo: cc.idCiclo,
                    idAvaliado: idColaborador,
                    tipoAvaliacao: 'LIDER_COLABORADOR',
                },
                include: {
                    avaliacaoLiderColaborador: {
                        include: {
                            cardAvaliacaoLiderColaborador: true
                        }
                    }
                }
            });

            // Agrupar notas por pilar (nomeCriterio)
            const pilarNotas: { pilarNome: string, pilarNota: number }[] = [];
            for (const avaliacao of avaliacoesLider) {
                const alc = avaliacao.avaliacaoLiderColaborador;
                if (alc && alc.cardAvaliacaoLiderColaborador) {
                    for (const card of alc.cardAvaliacaoLiderColaborador) {
                        if (card.nomeCriterio && card.nota !== null && card.nota !== undefined) {
                            pilarNotas.push({ pilarNome: card.nomeCriterio, pilarNota: Number(card.nota) });
                        }
                    }
                }
            }
            return {
                ciclo: cc.ciclo.nomeCiclo,
                notas: pilarNotas
            };
        }));
        return historico;
    }

    async getHistoricoMediaNotasPorCiclo(idColaborador: string) {
        // Buscar todos os ciclos em que o colaborador participou
        const colaboradorCiclos = await this.prisma.colaboradorCiclo.findMany({
            where: { idColaborador },
            include: { ciclo: true },
        });

        // Para cada ciclo, buscar avaliações do tipo LIDER_COLABORADOR para este colaborador
        const historico = await Promise.all(colaboradorCiclos.map(async (cc) => {
            const avaliacoesLider = await this.prisma.avaliacao.findMany({
                where: {
                    idCiclo: cc.idCiclo,
                    idAvaliado: idColaborador,
                    tipoAvaliacao: 'LIDER_COLABORADOR',
                },
                include: {
                    avaliacaoLiderColaborador: {
                        include: {
                            cardAvaliacaoLiderColaborador: true
                        }
                    }
                }
            });

            // Coletar todas as notas dos cards
            const notas: number[] = [];
            for (const avaliacao of avaliacoesLider) {
                const alc = avaliacao.avaliacaoLiderColaborador;
                if (alc && alc.cardAvaliacaoLiderColaborador) {
                    for (const card of alc.cardAvaliacaoLiderColaborador) {
                        if (card.nota !== null && card.nota !== undefined) {
                            notas.push(Number(card.nota));
                        }
                    }
                }
            }
            // Calcular média das notas do ciclo
            const cicloNota = notas.length > 0 ? notas.reduce((a, b) => a + b, 0) / notas.length : null;
            return {
                cicloNome: cc.ciclo.nomeCiclo,
                cicloNota
            };
        }));
        return historico;
    }
}