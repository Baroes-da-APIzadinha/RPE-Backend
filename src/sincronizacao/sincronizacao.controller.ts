import { Controller, Post, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { SincronizacaoService } from './sincronizacao.service';

@Controller('sincronizacao')
// @UseGuards(AuthGuard, RolesGuard)
export class SincronizacaoController {
  constructor(private readonly sincronizacaoService: SincronizacaoService) {}

  @Post()
  // @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async triggerSincronizacao() {
    return this.sincronizacaoService.dispararSincronizacaoManual();
  }
}
