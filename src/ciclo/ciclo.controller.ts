import { Body, Controller, Delete, Get, Param, Post, Put, Patch, HttpCode, HttpStatus, Inject, forwardRef, Req } from '@nestjs/common';
import { CicloService } from './ciclo.service';
import { CreateCicloDto, UpdateCicloDto } from './ciclo.dto';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CiclosStatus } from './cicloStatus.service';

@Controller('ciclo')
export class CicloController {
    constructor(
        private readonly cicloService: CicloService,
        private readonly auditoriaService: AuditoriaService,
        private readonly ciclosStatus: CiclosStatus,
    ) { }

    @Post()
    async criarCiclo(@Body() data: CreateCicloDto, @Req() req) {
        const result = await this.cicloService.createCiclo(data);
        await this.auditoriaService.log({
            userId: req.user?.userId,
            action: 'criar_ciclo',
            resource: 'Ciclo',
            details: { ...data, result },
            ip: req.ip,
        });
        return result;
    }

    @Delete(':id')
    async removerCiclo(@Param('id') id: string, @Req() req) {
        const result = await this.cicloService.deleteCiclo(id);
        await this.auditoriaService.log({
            userId: req.user?.userId,
            action: 'remover_ciclo',
            resource: 'Ciclo',
            details: { id, result },
            ip: req.ip,
        });
        return result;
    }


    @Put(':id')
    async atualizarCiclo(@Param('id') id: string, @Body() data: UpdateCicloDto, @Req() req) {
        const result = await this.cicloService.updateCiclo(id, data);
        await this.auditoriaService.log({
            userId: req.user?.userId,
            action: 'atualizar_ciclo',
            resource: 'Ciclo',
            details: { id, ...data, result },
            ip: req.ip,
        });
        return result;
    }

    @Patch('status')
    async changeStatus(@Body() body: { idCiclo: string, current_status: string; next_status: string }) {
        const relatorio = await this.ciclosStatus.changeStatus(body.idCiclo, body.current_status, body.next_status);
        return { message: 'Status atualizado com sucesso',
            relatorio
         };
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
