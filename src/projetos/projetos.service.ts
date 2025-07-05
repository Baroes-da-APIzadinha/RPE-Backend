import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prismaService'; // Ajuste o caminho se necessário
import { CreateProjetoDto, UpdateProjetoDto } from './projetos.dto';
import { CreateAlocacaoDto, UpdateAlocacaoDto } from './alocacao.dto';

@Injectable()
export class ProjetosService {
  constructor(private prisma: PrismaService) {}

  create(data: CreateProjetoDto) {
    const dataComDatasConvertidas = {
      ...data,
      dataInicio: data.dataInicio ? new Date(data.dataInicio) : undefined,
      dataFim: data.dataFim ? new Date(data.dataFim) : undefined,
    };
    return this.prisma.projeto.create({
      data: dataComDatasConvertidas,
    });
  }

  findAll() {
    return this.prisma.projeto.findMany();
  }

  async findOne(id: string) {
    const projeto = await this.prisma.projeto.findUnique({
      where: { idProjeto: id },
    });

    if (!projeto) {
      throw new NotFoundException(`Projeto com ID "${id}" não encontrado.`);
    }
    return projeto;
  }

  async update(id: string, data: UpdateProjetoDto) {
    await this.findOne(id);

    const dataComDatasConvertidas = {
      ...data,
      dataInicio: data.dataInicio ? new Date(data.dataInicio) : undefined,
      dataFim: data.dataFim ? new Date(data.dataFim) : undefined,
    };

    return this.prisma.projeto.update({
      where: { idProjeto: id },
      data: dataComDatasConvertidas,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.projeto.delete({
      where: { idProjeto: id },
    });
  }

  // =======================================================
  // === NOVOS MÉTODOS PARA GERENCIAR ALOCAÇÕES ===
  // =======================================================

  /**
   * Aloca um colaborador a um projeto específico.
   */
  async alocarColaborador(idProjeto: string, dto: CreateAlocacaoDto) {
    const { idColaborador, dataEntrada, dataSaida } = dto;

    // Valida se o projeto e o colaborador existem
    await this.findOne(idProjeto); // Reutiliza o método que já lança erro se não encontrar
    const colaborador = await this.prisma.colaborador.findUnique({ where: { idColaborador } });
    if (!colaborador) {
      throw new NotFoundException(`Colaborador com ID "${idColaborador}" não encontrado.`);
    }

    // Valida se a alocação já não existe
    const alocacaoExistente = await this.prisma.alocacaoColaboradorProjeto.findFirst({
      where: { idProjeto, idColaborador },
    });
    if (alocacaoExistente) {
      throw new ConflictException('Este colaborador já está alocado neste projeto.');
    }

    return this.prisma.alocacaoColaboradorProjeto.create({
      data: {
        idProjeto,
        idColaborador,
        dataEntrada: new Date(dataEntrada),
        dataSaida: dataSaida ? new Date(dataSaida) : null,
      },
    });
  }

  /**
   * Lista todos os colaboradores alocados em um projeto.
   */
  async listarAlocacoesPorProjeto(idProjeto: string) {
    await this.findOne(idProjeto); // Garante que o projeto existe

    return this.prisma.alocacaoColaboradorProjeto.findMany({
      where: { idProjeto },
      include: {
        // Inclui os dados do colaborador para uma resposta mais rica
        colaborador: {
          select: {
            idColaborador: true,
            nomeCompleto: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Atualiza uma alocação existente (ex: para adicionar uma data de saída).
   */
  async atualizarAlocacao(idAlocacao: string, dto: UpdateAlocacaoDto) {
    const alocacao = await this.prisma.alocacaoColaboradorProjeto.findUnique({
      where: { idAlocacao },
    });
    if (!alocacao) {
      throw new NotFoundException(`Alocação com ID "${idAlocacao}" não encontrada.`);
    }

    return this.prisma.alocacaoColaboradorProjeto.update({
      where: { idAlocacao },
      data: {
        dataEntrada: dto.dataEntrada ? new Date(dto.dataEntrada) : undefined,
        dataSaida: dto.dataSaida ? new Date(dto.dataSaida) : undefined,
      },
    });
  }

  /**
   * Remove uma alocação de um colaborador de um projeto.
   */
  async removerAlocacao(idAlocacao: string) {
    const alocacao = await this.prisma.alocacaoColaboradorProjeto.findUnique({
      where: { idAlocacao },
    });
    if (!alocacao) {
      throw new NotFoundException(`Alocação com ID "${idAlocacao}" não encontrada.`);
    }

    return this.prisma.alocacaoColaboradorProjeto.delete({
      where: { idAlocacao },
    });
  }
}
