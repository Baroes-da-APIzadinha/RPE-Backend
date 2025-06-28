import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prismaService';
import { CriarReferenciaDto, AtualizarReferenciaDto } from './referencias.dto';

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

  async atualizarReferencia(idIndicacao: string, dto: AtualizarReferenciaDto) {
    try {
      // Verificar se a referência existe
      const referenciaExistente = await this.prisma.indicacaoReferencia.findUnique({
        where: { idIndicacao },
      });

      if (!referenciaExistente) {
        throw new NotFoundException('Referência não encontrada');
      }

      // Preparar dados para atualização
      const dadosAtualizacao: any = {};
      if (dto.tipo !== undefined) dadosAtualizacao.tipo = dto.tipo;
      if (dto.justificativa !== undefined) dadosAtualizacao.justificativa = dto.justificativa;

      return await this.prisma.indicacaoReferencia.update({
        where: { idIndicacao },
        data: dadosAtualizacao,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Erro ao atualizar referência: ' + error.message);
    }
  }

  async deletarReferencia(idIndicacao: string) {
    try {
      // Verificar se a referência existe
      const referenciaExistente = await this.prisma.indicacaoReferencia.findUnique({
        where: { idIndicacao },
      });

      if (!referenciaExistente) {
        throw new NotFoundException('Referência não encontrada');
      }

      await this.prisma.indicacaoReferencia.delete({
        where: { idIndicacao },
      });

      return { message: 'Referência deletada com sucesso' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Erro ao deletar referência: ' + error.message);
    }
  }
} 