import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prismaService';
import { CreateAssociacaoCriterioCicloDto, UpdateAssociacaoCriterioCicloDto } from './criterioCiclo.dto';

@Injectable()
export class AssociacaoCriterioCicloService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAssociacaoCriterioCicloDto) {
    return this.prisma.associacaoCriterioCiclo.create({
        data: {
        idCiclo: dto.idCiclo,
        idCriterio: dto.idCriterio,
        cargo: dto.cargo,
        trilhaCarreira: dto.trilhaCarreira,
        unidade: dto.unidade,
        },
    });
  }


  async findAll() {
    return this.prisma.associacaoCriterioCiclo.findMany();
  }

  async findOne(id: string) {
    const associacao = await this.prisma.associacaoCriterioCiclo.findUnique({
      where: { idAssociacao: id },
    });

    if (!associacao) {
      throw new NotFoundException(`Associação com ID ${id} não encontrada.`);
    }

    return associacao;
  }

  async update(id: string, dto: UpdateAssociacaoCriterioCicloDto) {
    const exists = await this.prisma.associacaoCriterioCiclo.findUnique({
      where: { idAssociacao: id },
    });

    if (!exists) {
      throw new NotFoundException(`Associação com ID ${id} não encontrada.`);
    }

    return this.prisma.associacaoCriterioCiclo.update({
      where: { idAssociacao: id },
      data: { ...dto },
    });
  }

  async remove(id: string) {
    const exists = await this.prisma.associacaoCriterioCiclo.findUnique({
      where: { idAssociacao: id },
    });

    if (!exists) {
      throw new NotFoundException(`Associação com ID ${id} não encontrada.`);
    }

    return this.prisma.associacaoCriterioCiclo.delete({
      where: { idAssociacao: id },
    });
  }

  //Buscar todas as associações de um determinado ciclo
  async findByCiclo(idCiclo: string) {
    return this.prisma.associacaoCriterioCiclo.findMany({
        where: { idCiclo },
        include: {
            criterio: true,
        },
    });
  }
}
