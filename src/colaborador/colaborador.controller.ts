import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ColaboradorService } from './colaborador.service';
import { CreateColaboradorDto, UpdateColaboradorDto } from './colaborador.dto';

@Controller('colaborador')
export class ColaboradorController {
    constructor(private readonly colaboradorService: ColaboradorService) {}

    @Post()
    async criarColaborador(@Body() data: CreateColaboradorDto) {
        return this.colaboradorService.criarColaborador(data);
    }

    @Delete(':id')
    async removerColaborador(@Param('id') id: string) {
        return this.colaboradorService.removerColaborador(id);
    }

    @Get(':id')
    async getColaborador(@Param('id') id: string) {
        return this.colaboradorService.getColaborador(id);
    }

    @Put(':id')
    async atualizarColaborador(@Param('id') id: string, @Body() data: UpdateColaboradorDto) {
        return this.colaboradorService.updateColaborador(id, data);
    }

}
