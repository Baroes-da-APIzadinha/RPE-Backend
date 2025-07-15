import { Controller, Get, Param, ParseUUIDPipe, Res, StreamableFile } from '@nestjs/common';
import { ExportacaoService } from './exportacao.service';
import type { Response } from 'express';

@Controller('exportacao')
export class ExportacaoController {
  constructor(private readonly exportacaoService: ExportacaoService) {}

  @Get('ciclo/:idCiclo')
  async exportarDadosDoCiclo(
    @Param('idCiclo', ParseUUIDPipe) idCiclo: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.exportacaoService.exportarDadosDoCiclo(idCiclo);

    const nomeArquivo = `relatorio_ciclo_${idCiclo}.xlsx`;

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="relatorio_ciclo_${idCiclo}.xlsx"`,
    });

    return new StreamableFile(buffer);
  }
}
