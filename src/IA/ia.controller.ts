import { Controller, Get, Param, Post } from '@nestjs/common';
import { IaService } from './ia.service';

@Controller('ia')
export class IaController {
    constructor(private readonly iaService: IaService) {}

    @Get('avaliar/:idColaborador/:idCiclo')
    async avaliarColaborador(@Param('idColaborador') idColaborador: string, @Param('idCiclo') idCiclo: string): Promise<string> {
        try {
            const resultado = await this.iaService.avaliarColaborador(idColaborador, idCiclo);
            return resultado;
        } catch (error) {
            console.error('Erro ao avaliar colaborador:', error);
            throw error;
        }
    }

    @Get('avaliacoes/:idColaborador/:idCiclo')
    async getAvaliacoesIA(
        @Param('idColaborador') idColaborador: string,
        @Param('idCiclo') idCiclo: string
    ): Promise<any[]> {
        return this.iaService.getAvaliacoesIA(idColaborador, idCiclo);
    }

    @Get('miniavaliar/:idColaborador/:idCiclo')
    async miniAvaliarColaborador(@Param('idColaborador') idColaborador: string, @Param('idCiclo') idCiclo: string): Promise<string> {
        try {
            const resultado = await this.iaService.miniAvaliarColaborador(idColaborador, idCiclo);
            return resultado;
        } catch (error) {
            console.error('Erro ao avaliar colaborador:', error);
            throw error;
        }
    }
    @Get('brutalfacts/:idColaborador/:idCiclo')
    async getAll_Infos_Colaborador(@Param('idColaborador') idColaborador: string, @Param('idCiclo') idCiclo: string): Promise<any> {
        try {
            const resultado = await this.iaService.getAll_Infos_Colaborador(idColaborador, idCiclo);
            return resultado;
        } catch (error) {
            console.error('Erro ao buscar avaliações + equalização do colaborador', error);
            throw error;
        }
    }

    @Post('gerarbrutalfacts/:idColaborador/:idCiclo')
    async gerarBrutalFacts(
        @Param('idColaborador') idColaborador: string,
        @Param('idCiclo') idCiclo: string
    ): Promise<string> {
        try {
            const resultado = await this.iaService.gerarBrutalFacts(idColaborador, idCiclo);
            return resultado;
        } catch (error) {
            console.error('Erro ao gerar Brutal Facts:', error);
            throw error;
        }
    }
}
