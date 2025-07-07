import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, Req, Patch } from '@nestjs/common';
import { ColaboradorService } from './colaborador.service';
import { CreateColaboradorDto, UpdateColaboradorDto, AssociatePerfilDto, TrocarSenhaDto } from './colaborador.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { validarPerfisColaborador } from './colaborador.constants';
import { Cargo, Trilha, Unidade } from './colaborador.constants';



@Controller('colaborador')
export class ColaboradorController {
    constructor(private readonly colaboradorService: ColaboradorService) { }


    @Post()
    async criarColaborador(@Body() data: CreateColaboradorDto) {
        return this.colaboradorService.criarColaborador(data);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Delete(':id')
    async removerColaborador(@Param('id') id: string) {
        return this.colaboradorService.removerColaborador(id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
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
    @Roles('ADMIN', 'COLABORADOR_COMUM')
    @Get(':id')
    async getColaborador(@Param('id') id: string, @Req() req) {
        return this.colaboradorService.getColaborador(id, req.user);
    }


    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
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


    @Post('associar-perfil')
    async associarPerfil(@Body() data: AssociatePerfilDto) {

        return this.colaboradorService.associarPerfilColaborador(data.idColaborador, data.tipoPerfil);
    }

    @Post('associar-ciclo')
    async associarCiclo(@Body() data: any) {
        return this.colaboradorService.associarColaboradorCiclo(data.idColaborador, data.idCiclo);
    }


    @Get('avaliacoes-recebidas/:idColaborador')
    async getAvaliacoesRecebidas(@Param('idColaborador') idColaborador: string) {
        return this.colaboradorService.getAvaliacoesRecebidas(idColaborador);
    }

    @Get('notas/historico/:idColaborador')
    async getHistoricoNotasPorCiclo(@Param('idColaborador') idColaborador: string) {
        return this.colaboradorService.getHistoricoNotasPorCiclo(idColaborador);
    }

    @Get('pilar/historico/:idColaborador')
    async getHistoricoMediaNotasPorCiclo(@Param('idColaborador') idColaborador: string) {
        return this.colaboradorService.getHistoricoMediaNotasPorCiclo(idColaborador);
    }

    @Post('validar-perfis')
    async validarPerfis(@Body('perfis') perfis: string[]) {
        const resultado = validarPerfisColaborador(perfis);
        return { valido: resultado === null, mensagem: resultado };
    }

    @Get('progresso-atual/:idColaborador')
    async getProgressoAtual(@Param('idColaborador') idColaborador: string) {
        return this.colaboradorService.getProgressoAtual(idColaborador);
    }

}
