import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Req } from '@nestjs/common';
import { CriteriosService } from './criterios.service';
import { pilarCriterio } from '@prisma/client';
import { CreateCriterioDto, UpdateCriterioDto } from './criterios.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Controller('criterios')
export class CriteriosController {
    constructor(private readonly criteriosService: CriteriosService, private readonly auditoriaService: AuditoriaService) {}

    @UseGuards(JwtAuthGuard)
    @Get()
    async getCriterios() {
        return this.criteriosService.getCriterios();
    }

    @UseGuards(JwtAuthGuard)
    @Get('pilar/:pilar')
    async getCriterioPorPilar(@Param('pilar') pilar: pilarCriterio) {
        return this.criteriosService.getCriterioPorPilar(pilar);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    async getCriterio(@Param('id') id: string) {
        return this.criteriosService.getCriterio(id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'RH')
    @Post()
    async createCriterio(@Body() data: CreateCriterioDto, @Req() req) {
        const result = await this.criteriosService.createCriterio(data);
        await this.auditoriaService.log({
            userId: req.user?.userId,
            action: 'criar_criterio',
            resource: 'Criterio',
            details: { ...data, result },
            ip: req.ip,
        });
        return result;
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'RH')
    @Patch(':id')
    async updateCriterio(@Param('id') id: string, @Body() data: UpdateCriterioDto, @Req() req) {
        const result = await this.criteriosService.updateCriterio(id, data);
        await this.auditoriaService.log({
            userId: req.user?.userId,
            action: 'atualizar_criterio',
            resource: 'Criterio',
            details: { id, ...data, result },
            ip: req.ip,
        });
        return result;
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'RH')
    @Delete(':id')
    async deleteCriterio(@Param('id') id: string, @Req() req) {
        const result = await this.criteriosService.deleteCriterio(id);
        await this.auditoriaService.log({
            userId: req.user?.userId,
            action: 'deletar_criterio',
            resource: 'Criterio',
            details: { id, result },
            ip: req.ip,
        });
        return result;
    }
}