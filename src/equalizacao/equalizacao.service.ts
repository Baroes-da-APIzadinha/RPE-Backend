import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prismaService';
import { CreateEqualizacaoDto, UpdateEqualizacaoDto } from './equalizacao.dto';
import { preenchimentoStatus } from '@prisma/client';
import { HashService } from '../common/hash.service';

@Injectable()
export class EqualizacaoService {
  private readonly logger = new Logger(EqualizacaoService.name);

  constructor(private readonly prisma: PrismaService, private readonly hashService: HashService) {}

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

  async findByAvaliadoCiclo(idAvaliado: string, idCiclo: string) {
  this.logger.log(`Buscando equalizações para avaliado: ${idAvaliado} no ciclo ${idCiclo}`);
    
    return this.prisma.equalizacao.findMany({
      where: {
        idAvaliado,
        idCiclo
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

  async findByComite(idMembroComite: string) {
    this.logger.log(`Buscando equalizações realizadas pelo membro do comitê: ${idMembroComite}`);
    
    return this.prisma.equalizacao.findMany({
      where: {
        idMembroComite,
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
    dataToUpdate.notaAjustada = updateEqualizacaoDto.notaAjustada;
    dataToUpdate.justificativa = this.hashService.hash(updateEqualizacaoDto.justificativa);

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

  async getEqualizacaoColaboradorCiclo(idColaborador: string, idCiclo: string) {
        return this.prisma.equalizacao.findFirst({
            where: {
                idAvaliado: idColaborador,
                idCiclo: idCiclo
            }
        });
    }
}