import { Controller } from '@nestjs/common';
import { Post, Body } from '@nestjs/common';
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

    @Post('lancar-lider-colaborador')
    async lancarLiderColaborador(@Body('idCiclo') idCiclo: string) {
        await this.service.lancarAvaliacaoLiderColaborador(idCiclo);
        return { message: 'Avaliações Lider-Colaborador lançadas com sucesso!' };
  }
    @Post('lancar-colaborador-mentor')
    async lancarColaboradorMentor(@Body('idCiclo') idCiclo : string){
      await this.service.lancarAvaliacaoColaboradorMentor(idCiclo)
      return {message: 'Avaliações Colaborador-Mentor lançadas com sucesso'}
    }

}
