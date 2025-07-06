import { Controller, Get, Param } from '@nestjs/common';
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

}
