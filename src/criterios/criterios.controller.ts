import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { CriteriosService } from './criterios.service';

@Controller('criterios')
export class CriteriosController {
    constructor(private readonly criteriosService: CriteriosService) {}

    @Get()
    async getCriterios() {
        return this.criteriosService.getCriterios();
    }

    @Get(':id')
    async getCriterio(@Param('id') id: string) {
        return this.criteriosService.getCriterio(id);
    }

    @Post()
    async createCriterio(@Body() data: any) {
        return this.criteriosService.createCriterio(data);
    }

    @Patch(':id')
    async updateCriterio(@Param('id') id: string, @Body() data: any) {
        return this.criteriosService.updateCriterio(id, data);
    }

    @Delete(':id')
    async deleteCriterio(@Param('id') id: string) {
        return this.criteriosService.deleteCriterio(id);
    }
}