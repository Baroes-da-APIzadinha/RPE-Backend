import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prismaService';
import { CriarReferenciaDto, AtualizarReferenciaDto } from './referencias.dto';
import { HashService } from '../common/hash.service';

@Injectable()
export class ReferenciasService {
  constructor(private readonly prisma: PrismaService, private readonly hashService: HashService) {}

  async criarReferencia(dto: CriarReferenciaDto) {
    try {
      return await this.prisma.indicacaoReferencia.create({
        data: {
          idCiclo: dto.idCiclo,
          idIndicador: dto.idIndicador,
          idIndicado: dto.idIndicado,
          tipo: dto.tipo,
          justificativa: this.hashService.hash(dto.justificativa),
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
      if (dto.justificativa !== undefined) dadosAtualizacao.justificativa = this.hashService.hash(dto.justificativa);

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

  async getAllReferencias() {
    try {
      const referencias = await this.prisma.indicacaoReferencia.findMany({
        include: {
          ciclo: true,
          indicador: true,
          indicado: true,
        },
      });
      return referencias.map(ref => ({
        ...ref,
        justificativa: ref.justificativa ? this.hashService.decrypt(ref.justificativa) : null,
      }));
    } catch (error) {
      throw new BadRequestException('Erro ao listar referências: ' + error.message);
    }
  }

  async getReferenciaByIndicador(idIndicador: string) {
    try {
      const referencias = await this.prisma.indicacaoReferencia.findMany({
        where: { idIndicador },
        include: {
          ciclo: true,
          indicado: true,
        },
      });

      if (referencias.length === 0) {
        throw new NotFoundException('Nenhuma referência encontrada para este indicador');
      }

      return referencias.map(ref => ({
        ...ref,
        justificativa: ref.justificativa ? this.hashService.decrypt(ref.justificativa) : null,
      }));
    } catch (error) {
      throw new BadRequestException('Erro ao buscar referências por indicador: ' + error.message);
    }
  }

  async getReferenciaByIndicado(idIndicado: string) {
    try {
      const referencias = await this.prisma.indicacaoReferencia.findMany({
        where: { idIndicado },
        include: {
          ciclo: true,
          indicador: true,
        },
      });

      if (referencias.length === 0) {
        throw new NotFoundException('Nenhuma referência encontrada para este indicado');
      }

      return referencias.map(ref => ({
        ...ref,
        justificativa: ref.justificativa ? this.hashService.decrypt(ref.justificativa) : null,
      }));
    } catch (error) {
      throw new BadRequestException('Erro ao buscar referências por indicado: ' + error.message);
    }
  }

  async getReferenciaById(idIndicacao: string) {
    try {
      const referencia = await this.prisma.indicacaoReferencia.findUnique({
        where: { idIndicacao },
        include: {
          ciclo: true,
          indicador: true,
          indicado: true,
        },
      });

      if (!referencia) {
        throw new NotFoundException('Referência não encontrada');
      }

      return {
        ...referencia,
        justificativa: referencia.justificativa ? this.hashService.decrypt(referencia.justificativa) : null,
      };
    } catch (error) {
      throw new BadRequestException('Erro ao buscar referência: ' + error.message);
    }
  }
} 