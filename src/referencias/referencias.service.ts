import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prismaService';
import { CriarReferenciaDto } from './referencias.dto';

@Injectable()
export class ReferenciasService {
  constructor(private readonly prisma: PrismaService) {}

  async criarReferencia(dto: CriarReferenciaDto) {
    try {
      return await this.prisma.indicacaoReferencia.create({
        data: {
          idCiclo: dto.idCiclo,
          idIndicador: dto.idIndicador,
          idIndicado: dto.idIndicado,
          tipo: dto.tipo,
          justificativa: dto.justificativa,
        },
      });
    } catch (error) {
      throw new BadRequestException('Erro ao criar referência: ' + error.message);
    }
  }
} 