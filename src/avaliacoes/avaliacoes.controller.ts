import { Controller, Get, Post, Body, UseGuards, Req, Query, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AvaliacoesService } from './avaliacoes.service';
import { avaliacaoTipo, preenchimentoStatus } from '@prisma/client';
import { AvaliacaoColaboradorMentorDto, AvaliacaoParesDto, PreencherAuto_ou_Lider_Dto } from './avaliacoes.dto';
import { Logger } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RelatorioItem } from './avaliacoes.constants';
import { AuditoriaService } from '../auditoria/auditoria.service';

interface LancarAvaliacaoDto {
    idCiclo: string;
}

@Controller('avaliacoes')
export class AvaliacoesController {

    private readonly logger = new Logger(AvaliacoesController.name);

    constructor(private readonly service: AvaliacoesService, private readonly auditoriaService: AuditoriaService) { }


    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'RH')
    @Post()
    async lancarAvaliacoes(@Body('idCiclo') idCiclo: string, @Req() req) {
        const resultado = await this.service.lancarAvaliacoes(idCiclo);
        this.logger.log(`Relatório de lançamento de avaliações: ${JSON.stringify(resultado.relatorio)}`);
        await this.auditoriaService.log({
            userId: req.user?.userId,
            action: 'lancar_avaliacoes',
            resource: 'Avaliacao',
            details: { idCiclo, relatorio: resultado.relatorio },
            ip: req.ip,
        });
        return { message: 'Avaliações lançadas com sucesso', relatorio: resultado.relatorio };
    }


    @UseGuards(JwtAuthGuard)
    @Get('tipo/usuario/:idColaborador')
    async getAvaliacoesPorUsuarioTipo(
        @Param('idColaborador') idColaborador: string,
        @Query('idCiclo') idCiclo: string,
        @Query('tipoAvaliacao') tipoAvaliacao?: avaliacaoTipo
    ) {
        const avaliacoes = await this.service.getAvaliacoesPorUsuarioTipo(
            idColaborador,
            idCiclo,
            tipoAvaliacao
        );

        return {
            success: true,
            count: avaliacoes.length,
            tipoFiltrado: tipoAvaliacao || 'todos',
            avaliacoes
        };
    }

    @UseGuards(JwtAuthGuard)
    @Get('status/:idCiclo')
    async getAvaliacoesPorCicloStatus(
        @Param('idCiclo') idCiclo: string,
        @Query('status') status?: preenchimentoStatus
    ) {
        const avaliacoes = await this.service.getAvaliacoesPorCicloStatus(
            idCiclo,
            status
        );

        return {
            success: true,
            count: avaliacoes.length,
            statusFiltrado: status || 'todos',
        };
    }

    @UseGuards(JwtAuthGuard)
    @Post('preencher-avaliacao-pares')
    async preencherAvaliacaoPares(@Body() dto: AvaliacaoParesDto, @Req() req) {
        await this.service.preencherAvaliacaoPares(dto.idAvaliacao, dto.nota, dto.motivacao, dto.pontosFortes, dto.pontosFracos);
        await this.auditoriaService.log({
            userId: req.user?.userId,
            action: 'preencher_avaliacao_pares',
            resource: 'Avaliacao',
            details: { ...dto },
            ip: req.ip,
        });
        return { message: 'Avaliação preenchida com sucesso!' };
    }

    @UseGuards(JwtAuthGuard)
    @Post('preencher-avaliacao-colaborador-mentor')
    async preencherAvaliacaoColaboradorMentor(@Body() dto: AvaliacaoColaboradorMentorDto, @Req() req) {
        await this.service.preencherAvaliacaoColaboradorMentor(dto.idAvaliacao, dto.nota, dto.justificativa);
        await this.auditoriaService.log({
            userId: req.user?.userId,
            action: 'preencher_avaliacao_colaborador_mentor',
            resource: 'Avaliacao',
            details: { ...dto },
            ip: req.ip,
        });
        return { message: 'Avaliação preenchida com sucesso!' };
    }

    @UseGuards(JwtAuthGuard)
    @Post('preencher-auto-avaliacao')
    async preencherAutoAvaliacao(@Body() dto: PreencherAuto_ou_Lider_Dto, @Req() req): Promise<{ message: string; idAvaliacao: string }> {
        await this.service.preencherAutoAvaliacao(dto.idAvaliacao, dto.criterios);
        await this.auditoriaService.log({
            userId: req.user?.userId,
            action: 'preencher_auto_avaliacao',
            resource: 'Avaliacao',
            details: { ...dto },
            ip: req.ip,
        });
        return {
            message: 'Autoavaliação preenchida com sucesso!',
            idAvaliacao: dto.idAvaliacao
        };
    }
    
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('LIDER')
    @Post('preencher-lider-colaborador')
    async preencherAvaliacaoLiderColaborador(@Body() dto: PreencherAuto_ou_Lider_Dto, @Req() req): Promise<{ message: string; idAvaliacao: string }> {
        await this.service.preencherAvaliacaoLiderColaborador(dto.idAvaliacao, dto.criterios);
        await this.auditoriaService.log({
            userId: req.user?.userId,
            action: 'preencher_lider_colaborador',
            resource: 'Avaliacao',
            details: { ...dto },
            ip: req.ip,
        });
        return {
            message: 'Avaliação lider-colaborador preenchida com sucesso!',
            idAvaliacao: dto.idAvaliacao
        };
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'RH')
    @Post('lancar-auto-avaliacoes')
    async lancarAutoAvaliacao(@Body() dto: LancarAvaliacaoDto, @Req() req) {
        const resultado = await this.service.lancarAutoAvaliacoes(dto.idCiclo);
        this.logger.log(`Relatório de lançamento de avaliações: ${JSON.stringify(resultado)}`);
        await this.auditoriaService.log({
            userId: req.user?.userId,
            action: 'lancar_auto_avaliacoes',
            resource: 'Avaliacao',
            details: { idCiclo: dto.idCiclo, relatorio: resultado },
            ip: req.ip,
        });
        return { message: 'Autoavaliações lançadas com sucesso', relatorio: resultado };
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'RH')
    @Post('lancar-pares')
    async lancarAvaliacaoPares(@Body('idCiclo') idCiclo: string, @Req() req) {
        const resultado = await this.service.lancarAvaliacaoPares(idCiclo);
        this.logger.log(`Relatório de lançamento de avaliações: ${JSON.stringify(resultado)}`);
        await this.auditoriaService.log({
            userId: req.user?.userId,
            action: 'lancar_avaliacao_pares',
            resource: 'Avaliacao',
            details: { idCiclo, relatorio: resultado },
            ip: req.ip,
        });
        return { message: 'Avaliações de pares lançadas com sucesso', relatorio: resultado };
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'RH')
    @Post('lancar-lider-colaborador')
    async lancarAvaliacaoLiderColaborador(@Body('idCiclo') idCiclo: string, @Req() req) {
        const resultado = await this.service.lancarAvaliacaoLiderColaborador(idCiclo);
        this.logger.log(`Relatório de lançamento de avaliações: ${JSON.stringify(resultado)}`);
        await this.auditoriaService.log({
            userId: req.user?.userId,
            action: 'lancar_lider_colaborador',
            resource: 'Avaliacao',
            details: { idCiclo, relatorio: resultado },
            ip: req.ip,
        });
        return { message: 'Avaliações lider-colaborador lançadas com sucesso', relatorio: resultado };
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'RH')
    @Post('lancar-colaborador-mentor')
    async lancarAvaliacaoColaboradorMentor(@Body('idCiclo') idCiclo: string, @Req() req) {
        const resultado = await this.service.lancarAvaliacaoColaboradorMentor(idCiclo);
        this.logger.log(`Relatório de lançamento de avaliações: ${JSON.stringify(resultado)}`);
        await this.auditoriaService.log({
            userId: req.user?.userId,
            action: 'lancar_colaborador_mentor',
            resource: 'Avaliacao',
            details: { idCiclo, relatorio: resultado },
            ip: req.ip,
        });
        return { message: 'Avaliações colaborador-mentor lançadas com sucesso', relatorio: resultado };
    }

    @UseGuards(JwtAuthGuard)
    @Get('comite')
    async listarAvaliacoesComite() {
        return this.service.listarAvaliacoesComite();
    }

    @UseGuards(JwtAuthGuard)
    @Get('historico-lider')
    async historicoComoLider(@Req() req) {
        const userId = req.user.userId;
        return this.service.historicoComoLider(userId);
    }

    @Get('notasAvaliacoes/:idColaborador/:idCiclo')
    async getNotasAvaliacoes(@Param('idColaborador') idColaborador: string, @Param('idCiclo') idCiclo: string) {
        return this.service.discrepanciaColaborador(idColaborador, idCiclo);
    }

    @Get('notasCiclo/:idCiclo')
    async getNotasCiclo(@Param('idCiclo') idCiclo: string): Promise<RelatorioItem[]> {
        const resultado = await this.service.discrepanciaAllcolaboradores(idCiclo);
        return resultado || []; // Return empty array if undefined
    }

    @UseGuards(JwtAuthGuard)
    @Get('forms-autoavaliacao/:idAvaliacao')
    async getFormsAutoAvaliacao(@Param('idAvaliacao') idAvaliacao: string) {
        return this.service.getFormsAvaliacao(idAvaliacao);
    }

    @UseGuards(JwtAuthGuard)
    @Get('forms-lider-colaborador/:idAvaliacao')
    async getFormsLiderColaborador(@Param('idAvaliacao') idAvaliacao: string) {
        return this.service.getFormsLiderColaborador(idAvaliacao);
    }

}
