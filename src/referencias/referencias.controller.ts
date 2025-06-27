import { Body, Controller, Post } from '@nestjs/common';
import { ReferenciasService } from './referencias.service';
import { CriarReferenciaDto } from './referencias.dto';

@Controller('referencias')
export class ReferenciasController {
  constructor(private readonly referenciasService: ReferenciasService) {}

  @Post()
  async indicarReferencia(@Body() dto: CriarReferenciaDto) {
    return this.referenciasService.criarReferencia(dto);
  }
} 