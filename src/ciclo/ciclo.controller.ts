import { Body, Controller, Delete, Get, Param, Post, Put, HttpCode, HttpStatus, Inject, forwardRef } from '@nestjs/common';
import { CicloService } from './ciclo.service';
import { CreateCicloDto, UpdateCicloDto } from './ciclo.dto';
import { AvaliacoesService } from '../avaliacoes/avaliacoes.service';

@Controller('ciclo')
export class CicloController {
    constructor(
        private readonly cicloService: CicloService,
        private readonly avaliacoesService: AvaliacoesService,
    ) {}

    @Post(':idCiclo/lancar-avaliacoes')
    @HttpCode(HttpStatus.ACCEPTED)
    async lancarAvaliacoes(@Param('idCiclo') idCiclo: string) {
        return this.avaliacoesService.lancarAvaliacoes(idCiclo);
    }

    @Post('criar')
    async criarCiclo(@Body() data: CreateCicloDto) {
        return this.cicloService.createCiclo(data);
    }

    @Delete('remover/:id')
    async removerCiclo(@Param('id') id: string) {
        return this.cicloService.deleteCiclo(id);
    }

    @Get('get/:id')
    async getCiclo(@Param('id') id: string) {
        return this.cicloService.getCiclo(id);
    }

    @Put('atualizar/:id')
    async atualizarCiclo(@Param('id') id: string, @Body() data: UpdateCicloDto) {
        return this.cicloService.updateCiclo(id, data);
    }

    @Get('get-all')
    async getCiclos() {
        return this.cicloService.getCiclos();
    }

    @Get('get-ativos')
    async getCiclosAtivos() {
        return this.cicloService.getCiclosAtivos();
    }

    @Get('get-historico')
    async getHistoricoCiclos() {
        return this.cicloService.getHistoricoCiclos();
    }
}
