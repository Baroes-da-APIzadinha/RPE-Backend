import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AvaliacoesService } from './avaliacoes.service';

interface LancarAvaliacaoDto {
  idCiclo: string;
}

@Controller('avaliacoes')
export class AvaliacoesController {

    constructor(private readonly service: AvaliacoesService) {}

    @Post('lancar-auto-avaliacoes')
    async lancarAutoAvaliacao(@Body() dto: LancarAvaliacaoDto) {
        console.log('DTO recebido:', dto);
        await this.service.lancarAutoAvaliacoes(dto.idCiclo);
        return { message: 'Avaliações lançadas com sucesso!' };
    }

    @Post('lancar-pares')
    async lancarPares(@Body('idCiclo') idCiclo: string) {
        await this.service.lancarAvaliaçãoPares(idCiclo);
        return { message: 'Avaliações de pares lançadas com sucesso!' };
  }

    @Get('comite')
    async listarAvaliacoesComite() {
        return this.service.listarAvaliacoesComite();
    }

    @UseGuards(JwtAuthGuard)
    @Get('historico-lider')
    async historicoComoLider(@Req() req) {
        const userId = req.user.userId;
        return this.service.historicoComoLider(userId);
    }

}
