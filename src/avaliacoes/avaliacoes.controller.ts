import { Controller, Post, Body } from '@nestjs/common';
import { AvaliacoesService } from './avaliacoes.service';

@Controller('avaliacoes')
export class AvaliacoesController {
  constructor(private readonly avaliacoesService: AvaliacoesService) {}

  @Post('lancar-pares')
  async lancarPares(@Body('idCiclo') idCiclo: string) {
    await this.avaliacoesService.lancarAvaliaçãoPares(idCiclo);
    return { message: 'Avaliações de pares lançadas com sucesso!' };
  }
}
