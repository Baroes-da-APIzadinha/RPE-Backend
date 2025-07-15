import { Controller, Post, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, UseGuards, Req, Get, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportacaoService } from './importacao.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { Response } from 'express';

@Controller('importacao')
//@UseGuards(JwtAuthGuard, RolesGuard)
//@Roles('ADMIN', 'RH')
export class ImportacaoController {
  constructor(private readonly importacaoService: ImportacaoService, private readonly auditoriaService: AuditoriaService) {}

  @Post('avaliacoes')
  @UseInterceptors(FileInterceptor('file')) 
  async importarAvaliacoes(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), 
        ],
      })
    ) file: any,
    @Req() req
  ) {
    await this.auditoriaService.log({
      userId: req.user?.userId,
      action: 'importar_avaliacoes',
      resource: 'Importacao',
      details: { originalname: file?.originalname },
      ip: req.ip,
    });
    // A lógica pesada é delegada para o service
    return this.importacaoService.iniciarProcessoDeImportacao(file);
  }

  @Get('template')
  async baixarTemplate(@Res() res: Response) {
    return this.importacaoService.baixarTemplateImportacao(res);
  }
}
