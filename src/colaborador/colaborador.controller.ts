import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, Req, Patch } from '@nestjs/common';
import { ColaboradorService } from './colaborador.service';
import { CreateColaboradorDto, UpdateColaboradorDto, AssociatePerfilDto, TrocarSenhaDto } from './colaborador.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { validarPerfisColaborador } from './colaborador.constants';
import { Cargo, Trilha, Unidade } from './colaborador.constants';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { EqualizacaoService } from '../equalizacao/equalizacao.service';


@Controller('colaborador')
export class ColaboradorController {
    constructor(
        private readonly colaboradorService: ColaboradorService,
        private readonly auditoriaService: AuditoriaService,
        private readonly equalizacaoService: EqualizacaoService
    ) { }
  

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'RH')
    @Post()
    async criarColaborador(@Body() data: CreateColaboradorDto) {
        return this.colaboradorService.criarColaborador(data);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'RH')
    @Delete(':id')
    async removerColaborador(@Param('id') id: string, @Req() req) {
        const result = await this.colaboradorService.removerColaborador(id);
        await this.auditoriaService.log({
            userId: req.user?.idColaborador,
            action: 'delete',
            resource: 'Colaborador',
            details: { deletedId: id },
            ip: req.ip,
        });
        return result;
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'RH')
    @Get('get-all-colaboradores')
    async getAllColaboradores() {
        return this.colaboradorService.getAllColaborador();
    }

    @Get('constantes')
    async getColaboradorConstantes() {
        return {
            trilhas: Object.values(Trilha),
            cargos: Object.values(Cargo),
            unidades: Object.values(Unidade),
        };
    }
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('MENTOR')
    @Get('mentorados/:idMentor/:idCiclo')
    async getInfoMentorados(@Param('idMentor') idMentor: string, @Param('idCiclo') idCiclo: string) {
        return this.colaboradorService.getInfoMentorados(idMentor, idCiclo);
    }

    @UseGuards(JwtAuthGuard)
    @Get('/gestor/:id')
    async getGestorColaborador(@Param('id') id: string, @Req() req) {
        return this.colaboradorService.getGestorColaborador(id, req.user);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    async getProfile(@Param('id') idColaborador: string) {
        return this.colaboradorService.getProfile(idColaborador);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Put(':id')
    async atualizarColaborador(@Param('id') id: string, @Body() data: UpdateColaboradorDto) {
        return this.colaboradorService.updateColaborador(id, data);
    }

    @Patch(':id/trocar-senha')
    async trocarSenhaPrimeiroLogin(
      @Param('id') id: string,
      @Body() dto: TrocarSenhaDto
    ) {
      return this.colaboradorService.trocarSenhaPrimeiroLogin(id, dto);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Post('associar-perfil')
    async associarPerfil(@Body() data: AssociatePerfilDto) {
        return this.colaboradorService.associarPerfilColaborador(data.idColaborador, data.tipoPerfil);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Post('associar-ciclo')
    async associarCiclo(@Body() data: any) {
        return this.colaboradorService.associarColaboradorCiclo(data.idColaborador, data.idCiclo);
    }

    @UseGuards(JwtAuthGuard)
    @Get('avaliacoes-recebidas/:idColaborador')
    async getAvaliacoesRecebidas(@Param('idColaborador') idColaborador: string) {
        return this.colaboradorService.getAvaliacoesRecebidas(idColaborador);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('RH', 'COLABORADOR_COMUM')
    @Get('pilar/historico/:idColaborador')
    async getHistoricoNotasPorCiclo(@Param('idColaborador') idColaborador: string) {
        return this.colaboradorService.getHistoricoNotasPorCiclo(idColaborador);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('RH', 'COLABORADOR_COMUM')
    @Get('notas/historico/:idColaborador')
    async getHistoricoMediaNotasPorCiclo(@Param('idColaborador') idColaborador: string) {
        return this.colaboradorService.getHistoricoMediaNotasPorCiclo(idColaborador);
    }

    @UseGuards(JwtAuthGuard)
    @Get('progresso-atual/:idColaborador')
    async getProgressoAtual(@Param('idColaborador') idColaborador: string) {
        return this.colaboradorService.getProgressoAtual(idColaborador);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Get('perfis')
    listarPerfisPossiveis() {
        return Object.values(require('@prisma/client').perfilTipo);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Get(':id/perfis')
    async listarPerfisColaborador(@Param('id') id: string) {
        return this.colaboradorService.listarPerfisColaborador(id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Delete(':id/remover-perfil/:perfil')
    async removerPerfilColaborador(@Param('id') id: string, @Param('perfil') perfil: string) {
        return this.colaboradorService.removerPerfilColaborador(id, perfil);
    }
}
