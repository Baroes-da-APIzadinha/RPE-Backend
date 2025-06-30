import { Controller, Param, Query } from '@nestjs/common';
import { Post, Body, Get } from '@nestjs/common';
import { AvaliacoesService } from './avaliacoes.service';
import { avaliacaoTipo, preenchimentoStatus } from '@prisma/client';
import { AvaliacaoColaboradorMentorDto, AvaliacaoParesDto, PreencherAuto_ou_Lider_Dto } from './avaliacoes.dto';

interface LancarAvaliacaoDto {
    idCiclo: string;
}

@Controller('avaliacoes')
export class AvaliacoesController {

    constructor(private readonly service: AvaliacoesService) { }


    @Post()
    async lancarAvaliacoes(@Body('idCiclo') idCiclo: string) {
        await this.service.lancarAvaliacoes(idCiclo)
        return { message: 'Avaliações lançadas com sucesso' }
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
        console.log('DTO recebido:', dto);
        await this.service.lancarAutoAvaliacoes(dto.idCiclo);
        return { message: 'Avaliações lançadas com sucesso!' };
    }

    @Post('lancar-pares')
    async lancarPares(@Body('idCiclo') idCiclo: string) {
        await this.service.lancarAvaliaçãoPares(idCiclo);
        return { message: 'Avaliações de pares lançadas com sucesso!' };
    }

    @Post('lancar-lider-colaborador')
    async lancarLiderColaborador(@Body('idCiclo') idCiclo: string) {
        await this.service.lancarAvaliacaoLiderColaborador(idCiclo);
        return { message: 'Avaliações Lider-Colaborador lançadas com sucesso!' };
    }
    @Post('lancar-colaborador-mentor')
    async lancarColaboradorMentor(@Body('idCiclo') idCiclo: string) {
        await this.service.lancarAvaliacaoColaboradorMentor(idCiclo)
        return { message: 'Avaliações Colaborador-Mentor lançadas com sucesso' }
    }

}
