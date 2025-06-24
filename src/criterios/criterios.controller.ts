import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { CriteriosService } from './criterios.service';
import { pilarCriterio } from '@prisma/client';
import { CreateCriterioDto, UpdateCriterioDto } from './criterios.dto';

@Controller('criterios')
export class CriteriosController {
    constructor(private readonly criteriosService: CriteriosService) {}

    @Get()
    async getCriterios() {
        return this.criteriosService.getCriterios();
    }

    @Get('pilar/:pilar')
    async getCriterioPorPilar(@Param('pilar') pilar: pilarCriterio) {
        return this.criteriosService.getCriterioPorPilar(pilar);
    }

    @Get(':id')
    async getCriterio(@Param('id') id: string) {
        return this.criteriosService.getCriterio(id);
    }
    @Post()
    async createCriterio(@Body() data: CreateCriterioDto) {
        console.log('Body recebido:', data);
        return this.criteriosService.createCriterio(data);
    }

    @Patch(':id')
    async updateCriterio(@Param('id') id: string, @Body() data: UpdateCriterioDto) {
        return this.criteriosService.updateCriterio(id, data);
    }

    @Delete(':id')
    async deleteCriterio(@Param('id') id: string) {
        return this.criteriosService.deleteCriterio(id);
    }
}