import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { CriteriosService } from './criterios.service';
import { pilarCriterio } from '@prisma/client';
import { CreateCriterioDto, UpdateCriterioDto } from './criterios.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('criterios')
export class CriteriosController {
    constructor(private readonly criteriosService: CriteriosService) {}

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
    async createCriterio(@Body() data: CreateCriterioDto) {
        console.log('Body recebido:', data);
        return this.criteriosService.createCriterio(data);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'RH')
    @Patch(':id')
    async updateCriterio(@Param('id') id: string, @Body() data: UpdateCriterioDto) {
        return this.criteriosService.updateCriterio(id, data);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'RH')
    @Delete(':id')
    async deleteCriterio(@Param('id') id: string) {
        return this.criteriosService.deleteCriterio(id);
    }
}