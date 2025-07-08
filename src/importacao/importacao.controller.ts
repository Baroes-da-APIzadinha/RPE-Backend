import { Controller, Post, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportacaoService } from './importacao.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
// Importe seus Guards de autenticação e roles aqui

@Controller('importacao')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'RH')
export class ImportacaoController {
  constructor(private readonly importacaoService: ImportacaoService) {}

  @Post('avaliacoes')
  @UseInterceptors(FileInterceptor('file')) // 'file' é o nome do campo no formulário
  async importarAvaliacoes(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // Limite de 10MB
          // Você pode adicionar validadores de tipo de arquivo aqui
        ],
      })
    ) file: any
  ) {
    // A lógica pesada é delegada para o service
    return this.importacaoService.iniciarProcessoDeImportacao(file);
  }
}
