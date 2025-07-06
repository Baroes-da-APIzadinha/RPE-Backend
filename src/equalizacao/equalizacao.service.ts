import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prismaService';
import { CreateEqualizacaoDto, UpdateEqualizacaoDto } from './equalizacao.dto';
import { preenchimentoStatus } from '@prisma/client';

@Injectable()
export class EqualizacaoService {
  private readonly logger = new Logger(EqualizacaoService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createEqualizacaoDto: CreateEqualizacaoDto) {
    this.logger.log(`Lançando equalizações para todos os colaboradores do ciclo: ${createEqualizacaoDto.idCiclo}`);
    
    // 1. Verificar se o ciclo existe
    const ciclo = await this.prisma.cicloAvaliacao.findUnique({
        where: { idCiclo: createEqualizacaoDto.idCiclo }
    });
    
    if (!ciclo) {
        throw new NotFoundException(`Ciclo com ID ${createEqualizacaoDto.idCiclo} não encontrado`);
    }
    
    // 2. Obter todos os colaboradores participantes do ciclo
    const participantesCiclo = await this.prisma.colaboradorCiclo.findMany({
        where: { 
        idCiclo: createEqualizacaoDto.idCiclo 
        },
        include: {
        colaborador: true
        }
    });
    
    if (participantesCiclo.length === 0) {
        this.logger.warn(`Nenhum participante encontrado para o ciclo: ${createEqualizacaoDto.idCiclo}`);
        throw new BadRequestException(`Ciclo não possui participantes para equalização`);
    }
    
    this.logger.log(`Encontrados ${participantesCiclo.length} participantes no ciclo`);
    
    // 3. Criar equalização para cada colaborador
    let equalizacoesCriadas: any[] = [];
    
    for (const participante of participantesCiclo) {
        // Verifica se já existe uma equalização para este colaborador neste ciclo
        const equalizacaoExistente = await this.prisma.equalizacao.findFirst({
            where: {
                idAvaliado: participante.idColaborador,
                idCiclo: createEqualizacaoDto.idCiclo
            }
        });
        
        if (!equalizacaoExistente) {
        try {
            const novaEqualizacao = await this.prisma.equalizacao.create({
            data: {
                idCiclo: createEqualizacaoDto.idCiclo,
                idAvaliado: participante.idColaborador,
                // Outros campos permanecem com valores padrão
            },
            include: {
                alvo: true
            }
            });
            
            equalizacoesCriadas.push(novaEqualizacao);
            
        } catch (error) {
            this.logger.error(`Erro ao criar equalização para ${participante.colaborador.nomeCompleto}: ${error.message}`);
            // Continua o loop para tentar criar para outros colaboradores
        }
        } else {
        this.logger.warn(`Equalização já existe para ${participante.colaborador.nomeCompleto}`);
        }
    }
    
    this.logger.log(`Criadas ${equalizacoesCriadas.length} novas equalizações de um total de ${participantesCiclo.length} participantes`);
    
    return {
        message: `Equalizações criadas com sucesso para ${equalizacoesCriadas.length} colaboradores`,
        total: participantesCiclo.length,
        novasEqualizacoes: equalizacoesCriadas.length,
        equalizacoes: equalizacoesCriadas
    };
  }

  async findAll() {
    this.logger.log('Buscando todas as equalizações');
    
    return this.prisma.equalizacao.findMany({
      include: {
        alvo: {
          select: {
            nomeCompleto: true,
            cargo: true,
            unidade: true,
            trilhaCarreira: true,
          },
        },
      },
    });
  }

  async findByAvaliado(idAvaliado: string) {
    this.logger.log(`Buscando equalizações para avaliado: ${idAvaliado}`);
    
    return this.prisma.equalizacao.findMany({
      where: {
        idAvaliado,
      },
      include: {
        alvo: {
          select: {
            nomeCompleto: true,
            cargo: true,
          },
        },
      },
      orderBy: {
        dataEqualizacao: 'desc',
      },
    });
  }

  // Função utilitária para calcular o desvio padrão
  private calcularDesvioPadrao(notas: number[]): number {
    if (notas.length === 0) return 0;
    const media = notas.reduce((a, b) => a + b, 0) / notas.length;
    const variancia = notas.reduce((acc, n) => acc + Math.pow(n - media, 2), 0) / notas.length;
    return Math.sqrt(variancia);
  }

  async findByComite(idMembroComite: string) {
    this.logger.log(`Buscando equalizações realizadas pelo membro do comitê: ${idMembroComite}`);
    const equalizacoes = await this.prisma.equalizacao.findMany({
      where: {
        idMembroComite,
      },
      include: {
        alvo: {
          select: {
            idColaborador: true,
            nomeCompleto: true,
            cargo: true,
          },
        },
      },
      orderBy: {
        dataEqualizacao: 'desc',
      },
    });

    // Para cada equalização, calcular a média e o desvio padrão das notas recebidas pelo avaliado
    const result: any[] = [];
    for (const eq of equalizacoes) {
      // Buscar todas as avaliações recebidas pelo avaliado no mesmo ciclo
      const avaliacoes = await this.prisma.avaliacao.findMany({
        where: {
          idAvaliado: eq.idAvaliado,
          idCiclo: eq.idCiclo,
        },
        select: {
          autoAvaliacao: { select: { notaFinal: true } },
          avaliacaoPares: { select: { nota: true } },
          avaliacaoColaboradorMentor: { select: { nota: true } },
          avaliacaoLiderColaborador: { select: { notaFinal: true } },
        },
      });
      // Extrair todas as notas possíveis
      const notas: number[] = [];
      for (const av of avaliacoes) {
        if (av.autoAvaliacao?.notaFinal != null) notas.push(Number(av.autoAvaliacao.notaFinal));
        if (av.avaliacaoPares?.nota != null) notas.push(Number(av.avaliacaoPares.nota));
        if (av.avaliacaoColaboradorMentor?.nota != null) notas.push(Number(av.avaliacaoColaboradorMentor.nota));
        if (av.avaliacaoLiderColaborador?.notaFinal != null) notas.push(Number(av.avaliacaoLiderColaborador.notaFinal));
      }
      if (notas.length === 0) continue;
      const mediaNotas = notas.reduce((a, b) => a + b, 0) / notas.length;
      const desvioPadrao = this.calcularDesvioPadrao(notas);
      const notaAjustada = eq.notaAjustada != null ? Number(eq.notaAjustada) : null;
      if (notaAjustada == null) continue;
      const discrepancia = Math.abs(notaAjustada - mediaNotas);
      // Considera discrepância alta se for maior que 1 desvio padrão
      if (discrepancia > desvioPadrao) {
        result.push({
          ...eq,
          mediaNotas,
          desvioPadrao,
          discrepancia,
        });
      }
    }
    return result;
  }

  async findOne(idEqualizacao: string) {
    this.logger.log(`Buscando equalização: ${idEqualizacao}`);
    
    const equalizacao = await this.prisma.equalizacao.findUnique({
      where: {
        idEqualizacao,
      },
      include: {
        alvo: {
          select: {
            idColaborador: true,
            nomeCompleto: true,
            cargo: true,
            unidade: true,
            trilhaCarreira: true,
          },
        },
        membroComite: {
          select: {
            idColaborador: true,
            nomeCompleto: true,
          },
        },
      },
    });
    
    if (!equalizacao) {
      this.logger.warn(`Equalização não encontrada: ${idEqualizacao}`);
      throw new NotFoundException(`Equalização com ID ${idEqualizacao} não encontrada`);
    }
    
    return equalizacao;
  }

  async update(idEqualizacao: string, updateEqualizacaoDto: UpdateEqualizacaoDto) {
    this.logger.log(`Atualizando equalização: ${idEqualizacao}`);
    
    // Verificar se a equalização existe
    await this.findOne(idEqualizacao);

    if (!updateEqualizacaoDto.notaAjustada) {
        throw new BadRequestException('A nota é obrigatória para preencher a equalização');
    }

    const nota = parseFloat(updateEqualizacaoDto.notaAjustada.toString());
    if (isNaN(nota) || (nota < 1) || (nota > 5)) {
        throw new BadRequestException('A nota deve estar entre 1 e 5');
    }

    if (!updateEqualizacaoDto.justificativa) {
        throw new BadRequestException('A justificativa é obrigatória para preencher a equalização');
    }

    let dataToUpdate = { ...updateEqualizacaoDto };

    if (!updateEqualizacaoDto.status) {
        dataToUpdate.status = preenchimentoStatus.CONCLUIDA;
        this.logger.log(`Marcando equalização ${idEqualizacao} como CONCLUIDA`);
    }
    
    const updatedEqualizacao = await this.prisma.equalizacao.update({
      where: {
        idEqualizacao,
      },
      data: dataToUpdate,
      include: {
        alvo: true,
      },
    });
    
    this.logger.log(`Equalização atualizada com sucesso: ${idEqualizacao}`);
    return updatedEqualizacao;
  }

  async remove(idEqualizacao: string) {
    this.logger.log(`Removendo equalização: ${idEqualizacao}`);
    
    // Verificar se a equalização existe
    await this.findOne(idEqualizacao);
    
    await this.prisma.equalizacao.delete({
      where: {
        idEqualizacao,
      },
    });
    
    this.logger.log(`Equalização removida com sucesso: ${idEqualizacao}`);
    return { message: 'Equalização removida com sucesso' };
  }
}