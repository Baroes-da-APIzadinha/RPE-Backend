import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prismaService';
import * as bcrypt from 'bcrypt';
import { CreateColaboradorDto, UpdateColaboradorDto } from './colaborador.dto';
import { perfilTipo } from '@prisma/client';
import { validarPerfisColaborador } from './colaborador.constants';
import { TrocarSenhaDto } from './colaborador.dto';
import { AvaliacoesService } from '../avaliacoes/avaliacoes.service';
import { EqualizacaoService } from 'src/equalizacao/equalizacao.service';
import { CicloService } from '../ciclo/ciclo.service';
import { avaliacaoTipo, preenchimentoStatus } from '@prisma/client';
import { CriteriosService } from '../criterios/criterios.service';

@Injectable()
export class ColaboradorService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly avaliacoesService: AvaliacoesService,
        private readonly cicloService: CicloService,
        private readonly criteriosService: CriteriosService,
        private readonly equalizacaoService: EqualizacaoService
    ) {}

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

        // Coletar perfis selecionados
        const perfis: string[] = [];
        if (admin) perfis.push('ADMIN');
        if (colaboradorComum) perfis.push('COLABORADOR_COMUM');
        if (gestor) perfis.push('GESTOR');
        if (rh) perfis.push('RH');
        if (mentor) perfis.push('MENTOR');
        if (lider) perfis.push('LIDER');
        if (membroComite) perfis.push('MEMBRO_COMITE');

        // Validação centralizada
        const erroValidacao = validarPerfisColaborador(perfis);
        if (erroValidacao) {
            return {
                status: 400,
                message: erroValidacao
            }
        }

        const colaborador = await this.prisma.colaborador.create({
            data: {
                ...colaboradorData,
                senha: senhaHash
            }
        });

        for (const perfil of perfis) {
            await this.associarPerfilColaborador(colaborador.idColaborador, perfil);
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

    async getProfile (idColaborador :string){
        const colaborador = await this.prisma.colaborador.findUnique({
            where: { idColaborador}
        })
        return colaborador
    }

    async getGestorColaborador(id: string, user?: any) {
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

        if (data.email) {
            const emailExists = await this.prisma.colaborador.findUnique({
                where: { email: data.email }
            });

            if (emailExists && emailExists.idColaborador !== id) {
                return {
                status: 400,
                message: 'Email já cadastrado'
                };
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

        // Permitir atualização do campo primeiroLogin
        const updateData: any = { ...data };
        if (typeof data.primeiroLogin !== 'undefined') {
            updateData.primeiroLogin = data.primeiroLogin;
        }

        return this.prisma.colaborador.update({
            where: { idColaborador: id },
            data: updateData
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

        // Buscar todos os critérios para mapear nomeCriterio -> pilar
        const criterios = await this.prisma.criterioAvaliativo.findMany();
        const criterioToPilar = Object.fromEntries(criterios.map(c => [c.nomeCriterio, c.pilar]));

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

            // Agrupar notas por pilar
            const pilarNotasMap: Record<string, number[]> = {};
            for (const avaliacao of avaliacoesLider) {
                const alc = avaliacao.avaliacaoLiderColaborador;
                if (alc && alc.cardAvaliacaoLiderColaborador) {
                    for (const card of alc.cardAvaliacaoLiderColaborador) {
                        if (card.nomeCriterio && card.nota !== null && card.nota !== undefined) {
                            const pilar = criterioToPilar[card.nomeCriterio] || 'Outro';
                            if (!pilarNotasMap[pilar]) pilarNotasMap[pilar] = [];
                            pilarNotasMap[pilar].push(Number(card.nota));
                        }
                    }
                }
            }
            // Calcular média por pilar
            const pilarNotas = Object.entries(pilarNotasMap).map(([pilarNome, notas]) => ({
                pilarNome,
                pilarNota: notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null
            }));
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

    async trocarSenhaPrimeiroLogin(id: string, dto: TrocarSenhaDto) {
        const colaborador = await this.prisma.colaborador.findUnique({ 
            where: { idColaborador: id },
            select: { senha: true, primeiroLogin: true }
        });
        if (!colaborador || !colaborador.primeiroLogin) {
            throw new Error('Usuário não está em primeiro login ou não existe');
        }
        const senhaCorreta = await bcrypt.compare(dto.senhaAtual, colaborador.senha);
        if (!senhaCorreta) {
            throw new Error('Senha atual incorreta');
        }
        const novaHash = await bcrypt.hash(dto.novaSenha, 10);
        await this.prisma.colaborador.update({
            where: { idColaborador: id },
            data: { senha: novaHash, primeiroLogin: false }
        });
        return { message: 'Senha alterada com sucesso' };
    }

    async getProgressoAtual(idColaborador: string) {
        // 1. Buscar ciclos EM_ANDAMENTO em que o colaborador está associado
        const colaboradorCiclos = await this.prisma.colaboradorCiclo.findMany({
            where: { idColaborador },
            include: { ciclo: true },
        });
        const cicloAtual = colaboradorCiclos
            .map(cc => cc.ciclo)
            .find(c => c.status === 'EM_ANDAMENTO');
        if (!cicloAtual) return [];
        const idCiclo = cicloAtual.idCiclo;

        // 2. Buscar avaliações do colaborador no ciclo atual
        // Autoavaliação
        const auto = await this.prisma.avaliacao.findMany({
            where: {
                idCiclo,
                idAvaliador: idColaborador,
                tipoAvaliacao: 'AUTOAVALIACAO',
            },
        });
        // 360 (pares)
        const pares = await this.prisma.avaliacao.findMany({
            where: {
                idCiclo,
                idAvaliador: idColaborador,
                tipoAvaliacao: 'AVALIACAO_PARES',
            },
        });
        // Lider/mentor
        const lider = await this.prisma.avaliacao.findMany({
            where: {
                idCiclo,
                idAvaliador: idColaborador,
                tipoAvaliacao: 'LIDER_COLABORADOR',
            },
        });
        const mentor = await this.prisma.avaliacao.findMany({
            where: {
                idCiclo,
                idAvaliador: idColaborador,
                tipoAvaliacao: 'COLABORADOR_MENTOR',
            },
        });

        // 3. Calcular porcentagem de preenchimento
        function calc(arr: any[]) {
            if (!arr.length) return 0;
            const concluidas = arr.filter(a => a.status === 'CONCLUIDA').length;
            return Math.round((concluidas / arr.length) * 100);
        }
        return [
            { TipoAvaliacao: 'auto', porcentagemPreenchimento: calc(auto) },
            { TipoAvaliacao: '360', porcentagemPreenchimento: calc(pares) },
            { TipoAvaliacao: 'Lider/mentor', porcentagemPreenchimento: calc([...lider, ...mentor]) },
        ];
    }


    async getInfoMentorados(idMentor: string, idCiclo: string) {
        // Busca todos os mentorados associados ao mentor
        const mentorias = await this.prisma.mentorColaborador.findMany({
            where: { idMentor, idCiclo },
            select: { idColaborador: true }
        });
        const idsMentorados = mentorias.map(m => m.idColaborador);
        if (!idsMentorados.length) return [];
        // Busca dados dos mentorados
        const mentorados = await this.prisma.colaborador.findMany({
            where: { idColaborador: { in: idsMentorados } },
            select: {
                idColaborador: true,
                nomeCompleto: true,
                cargo: true,
                trilhaCarreira: true
            }
        });
        // Busca notaFinal de equalização para cada mentorado
        const result: any[] = [];
        for (const mentorado of mentorados) {
            const equalizacao = await this.equalizacaoService.getEqualizacaoColaboradorCiclo(mentorado.idColaborador, idCiclo);
            result.push({
                idMentorado: mentorado.idColaborador,
                nomeMentorado: mentorado.nomeCompleto,
                cargoMentorado: mentorado.cargo,
                trilhaMentorado: mentorado.trilhaCarreira,
                mediaFinal: equalizacao ? equalizacao.notaAjustada : null
            });
        }
        return result;
    }

    async listarPerfisColaborador(idColaborador: string) {
        if (!this.isValidUUID(idColaborador)) {
            return {
                status: 400,
                message: 'ID do colaborador inválido'
            }
        }
        const perfis = await this.prisma.colaboradorPerfil.findMany({
            where: { idColaborador },
            select: { tipoPerfil: true }
        });
        return perfis.map(p => p.tipoPerfil);
    }

    async removerPerfilColaborador(idColaborador: string, tipoPerfil: string) {
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
        // Verifica se existe a associação
        const associado = await this.prisma.colaboradorPerfil.findUnique({
            where: {
                idColaborador_tipoPerfil: {
                    idColaborador,
                    tipoPerfil: tipoPerfil as perfilTipo
                }
            }
        });
        if (!associado) {
            return {
                status: 404,
                message: 'Perfil não associado ao colaborador'
            }
        }
        // Remove a associação
        return this.prisma.colaboradorPerfil.delete({
            where: {
                idColaborador_tipoPerfil: {
                    idColaborador,
                    tipoPerfil: tipoPerfil as perfilTipo
                }
            }
        });
    }
}