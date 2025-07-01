import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, Req } from '@nestjs/common';
import { ColaboradorService } from './colaborador.service';
import { CreateColaboradorDto, UpdateColaboradorDto, AssociatePerfilDto } from './colaborador.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('colaborador')
export class ColaboradorController {
    constructor(private readonly colaboradorService: ColaboradorService) {}

   
    @Post()
    async criarColaborador(@Body() data: CreateColaboradorDto) {
        return this.colaboradorService.criarColaborador(data);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Delete(':id')
    async removerColaborador(@Param('id') id: string) {
        return this.colaboradorService.removerColaborador(id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'COLABORADOR_COMUM')
    @Get(':id')
    async getColaborador(@Param('id') id: string, @Req() req) {
        return this.colaboradorService.getColaborador(id, req.user);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Put(':id')
    async atualizarColaborador(@Param('id') id: string, @Body() data: UpdateColaboradorDto) {
        return this.colaboradorService.updateColaborador(id, data);
    }

   
    @Post('associar-perfil')
    async associarPerfil(@Body() data: AssociatePerfilDto) {
        
        return this.colaboradorService.associarPerfilColaborador(data.idColaborador, data.tipoPerfil);
    }

    @Post('associar-ciclo')
    async associarCiclo(@Body() data: any) {
        return this.colaboradorService.associarColaboradorCiclo(data.idColaborador, data.idCiclo);
    }

    @Get('get-ativos')
    async getColaboradoresAtivos() {
        return this.colaboradorService.getColaboradoresAtivos();
    }

}
