import { Body, Controller, Delete, Get, Param, Post, Put, HttpCode, HttpStatus, UseGuards,} from '@nestjs/common';
import { CicloService } from './ciclo.service';
import { CreateCicloDto, UpdateCicloDto } from './ciclo.dto';

@Controller('ciclo')
export class CicloController {
    constructor(private readonly cicloService: CicloService) {}

    @Post(':idCiclo/lancar-avaliacoes')
    // @UseGuards(AuthGuard('jwt'), RolesGuard) // Exemplo de como proteger a rota
    // @Roles('RH')
    @HttpCode(HttpStatus.ACCEPTED)
    async lancarAvaliacoes(@Param('idCiclo') idCiclo: string) {
        // A validação do ID (se é um UUID válido, por exemplo) pode ser feita com um Pipe do NestJS
        return this.cicloService.lancarAvaliacoes(idCiclo);
    }

    @Post('criar')
    async criarCiclo(@Body() data: CreateCicloDto) {
        console.log("controller")
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
