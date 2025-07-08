import { Body, Controller, Delete, Get, Param, Post, Put, Patch, HttpCode, HttpStatus, Inject, forwardRef } from '@nestjs/common';
import { CicloService } from './ciclo.service';
import { CreateCicloDto, UpdateCicloDto} from './ciclo.dto';

@Controller('ciclo')
export class CicloController {
    constructor(
        private readonly cicloService: CicloService,
    ) {}

    @Post()
    async criarCiclo(@Body() data: CreateCicloDto) {
        return this.cicloService.createCiclo(data);
    }

    @Delete(':id')
    async removerCiclo(@Param('id') id: string) {
        return this.cicloService.deleteCiclo(id);
    }


    @Put(':id')
    async atualizarCiclo(@Param('id') id: string, @Body() data: UpdateCicloDto) {
        return this.cicloService.updateCiclo(id, data);
    }

    @Patch(':id')
    async atualizarCicloParcial(@Param('id') id: string, @Body() data: UpdateCicloDto) {
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

    @Get(':id')
    async getCiclo(@Param('id') id: string) {
        return this.cicloService.getCiclo(id);
    }
}
