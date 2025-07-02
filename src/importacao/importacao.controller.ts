import { Controller, Post, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportacaoService } from './importacao.service';
// Importe seus Guards de autenticação e roles aqui

@Controller('importacao')
// @UseGuards(AuthGuard, RolesGuard) // Proteja todo o controller
export class ImportacaoController {
  constructor(private readonly importacaoService: ImportacaoService) {}

  @Post('avaliacoes')
  // @Roles('RH', 'ADMIN') // Apenas usuários com estas roles podem acessar
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
