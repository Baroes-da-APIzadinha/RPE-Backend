import { Controller, Param, Query } from '@nestjs/common';
import { Post, Body, Get } from '@nestjs/common';
import { AvaliacoesService } from './avaliacoes.service';
import { avaliacaoTipo, preenchimentoStatus } from '@prisma/client';
import { AvaliacaoColaboradorMentorDto, AvaliacaoParesDto, PreencherAuto_ou_Lider_Dto } from './avaliacoes.dto';
import { Logger } from '@nestjs/common';

interface LancarAvaliacaoDto {
    idCiclo: string;
}

@Controller('avaliacoes')
export class AvaliacoesController {

    private readonly logger = new Logger(AvaliacoesController.name);

    constructor(private readonly service: AvaliacoesService) { }


    @Post()
    async lancarAvaliacoes(@Body('idCiclo') idCiclo: string) {
        const resultado = await this.service.lancarAvaliacoes(idCiclo);
        this.logger.log(`Relatório de lançamento de avaliações: ${JSON.stringify(resultado.relatorio)}`);
        return { message: 'Avaliações lançadas com sucesso', relatorio: resultado.relatorio };
    }


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

    @Post('preencher-avaliacao-pares')
    async preencherAvaliacaoPares(@Body() dto: AvaliacaoParesDto) {
        await this.service.preencherAvaliacaoPares(dto.idAvaliacao, dto.nota, dto.motivacao, dto.pontosFortes, dto.pontosFracos);
        return { message: 'Avaliação preenchida com sucesso!' };
    }

    @Post('preencher-avaliacao-colaborador-mentor')
    async preencherAvaliacaoColaboradorMentor(@Body() dto: AvaliacaoColaboradorMentorDto) {
        await this.service.preencherAvaliacaoColaboradorMentor(dto.idAvaliacao, dto.nota, dto.justificativa);
        return { message: 'Avaliação preenchida com sucesso!' };
    }

    @Post('preencher-auto-avaliacao')
    async preencherAutoAvaliacao(@Body() dto: PreencherAuto_ou_Lider_Dto): Promise<{ message: string; idAvaliacao: string }> {
        await this.service.preencherAutoAvaliacao(dto.idAvaliacao, dto.criterios);
        return {
            message: 'Autoavaliação preenchida com sucesso!',
            idAvaliacao: dto.idAvaliacao
        };
    }

    @Post('preencher-lider-colaborador')
    async preencherAvaliacaoLiderColaborador(@Body() dto: PreencherAuto_ou_Lider_Dto): Promise<{ message: string; idAvaliacao: string }> {
        await this.service.preencherAvaliacaoLiderColaborador(dto.idAvaliacao, dto.criterios);
        return {
            message: 'Avaliação lider-colaborador preenchida com sucesso!',
            idAvaliacao: dto.idAvaliacao
        };
    }

    @Post('lancar-auto-avaliacoes')
    async lancarAutoAvaliacao(@Body() dto: LancarAvaliacaoDto) {
        const resultado = await this.service.lancarAutoAvaliacoes(dto.idCiclo);
        this.logger.log(`Relatório de lançamento de avaliações: ${JSON.stringify(resultado)}`);
        return { message: 'Autoavaliações lançadas com sucesso', relatorio: resultado };
    }

    @Post('lancar-pares')
    async lancarAvaliaçãoPares(@Body('idCiclo') idCiclo: string) {
        const resultado = await this.service.lancarAvaliaçãoPares(idCiclo);
        this.logger.log(`Relatório de lançamento de avaliações: ${JSON.stringify(resultado)}`);
        return { message: 'Avaliações de pares lançadas com sucesso', relatorio: resultado };
    }

    @Post('lancar-lider-colaborador')
    async lancarAvaliacaoLiderColaborador(@Body('idCiclo') idCiclo: string) {
        const resultado = await this.service.lancarAvaliacaoLiderColaborador(idCiclo);
        this.logger.log(`Relatório de lançamento de avaliações: ${JSON.stringify(resultado)}`);
        return { message: 'Avaliações lider-colaborador lançadas com sucesso', relatorio: resultado };
    }

    @Post('lancar-colaborador-mentor')
    async lancarAvaliacaoColaboradorMentor(@Body('idCiclo') idCiclo: string) {
        const resultado = await this.service.lancarAvaliacaoColaboradorMentor(idCiclo);
        this.logger.log(`Relatório de lançamento de avaliações: ${JSON.stringify(resultado)}`);
        return { message: 'Avaliações colaborador-mentor lançadas com sucesso', relatorio: resultado };
    }

}
