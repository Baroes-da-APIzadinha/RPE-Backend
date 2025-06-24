import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prismaService';
import { Prisma, avaliacaoTipo, preenchimentoStatus } from '@prisma/client';
import { 
  PreencherAutoAvaliacaoDto, 
  PreencherAvaliacaoGestorLideradoDto, 
  PreencherAvaliacaoQualitativaDto 
} from './avaliacoes.dto';

@Injectable()
export class AvaliacoesService {
  private readonly logger = new Logger(AvaliacoesService.name);
  constructor(private readonly prisma: PrismaService) {}

  // ===================================================================
  // LANÇAMENTO DE AVALIAÇÕES (AÇÃO DO RH/SISTEMA)
  // ===================================================================

  async lancarAvaliacoes(idCiclo: string) {
    // Dispara a execução em background
    this.executarLancamentoEmBackground(idCiclo).catch(error => {
      this.logger.error(`Falha CRÍTICA no lançamento do ciclo ${idCiclo}`, error.stack);
    });
    return { message: 'Lançamento de avaliações iniciado em segundo plano.' };
  }

  private async executarLancamentoEmBackground(idCiclo: string): Promise<void> {
    this.logger.log(`Iniciando job de lançamento para o ciclo ID: ${idCiclo}`);
    
    // ... (validações de ciclo e de conflito que você já tem) ...

    const participantesDoCiclo = await this.prisma.colaboradorCiclo.findMany({
        where: { idCiclo }, include: { colaborador: true }
    });
    if (participantesDoCiclo.length === 0) {
        this.logger.warn(`Nenhum colaborador associado a este ciclo. Processo encerrado.`);
        return;
    }
    const mapaGestaoDoCiclo = await this.prisma.gestorColaborador.findMany({ where: { idCiclo } });
    
    let novasAvaliacoes: Prisma.AvaliacaoCreateManyInput[] = [];

    // Loop principal sobre cada participante
    for (const participante of participantesDoCiclo) {
        const colaborador = participante.colaborador;

        // 1. Lançar AUTOAVALIACAO
        novasAvaliacoes.push({
            idCiclo, idAvaliado: colaborador.idColaborador, idAvaliador: colaborador.idColaborador,
            tipo: 'AUTOAVALIACAO' as avaliacaoTipo, status: 'PENDENTE'
        });

        // 2. Lançar GESTOR_LIDERADO e LIDERADO_GESTOR
        const relacaoGestor = mapaGestaoDoCiclo.find(rel => rel.idColaborador === colaborador.idColaborador);
        if (relacaoGestor) {
            novasAvaliacoes.push({
                idCiclo, idAvaliado: colaborador.idColaborador, idAvaliador: relacaoGestor.idGestor,
                tipo: 'GESTOR_LIDERADO' as avaliacaoTipo, status: 'PENDENTE'
            });
            novasAvaliacoes.push({
                idCiclo, idAvaliado: relacaoGestor.idGestor, idAvaliador: colaborador.idColaborador,
                tipo: 'LIDERADO_GESTOR' as avaliacaoTipo, status: 'PENDENTE'
            });
        }
    }
    
    // 3. Lançar AVALIACAO_PARES (Lógica aprimorada)
    const paresParaAvaliar: { idAvaliador: string; idAvaliado: string }[] = await this.encontrarPares(participantesDoCiclo);
    novasAvaliacoes.push(...paresParaAvaliar.map(par => ({
        idCiclo,
        idAvaliado: par.idAvaliado,
        idAvaliador: par.idAvaliador,
        tipo: avaliacaoTipo.AVALIACAO_PARES,
        status: preenchimentoStatus.PENDENTE
    })));

    if (novasAvaliacoes.length > 0) {
        // Remove duplicatas antes de criar
        const avaliacoesUnicas = Array.from(new Set(novasAvaliacoes.map(a => JSON.stringify(a)))).map(s => JSON.parse(s));
        const resultado = await this.prisma.avaliacao.createMany({ data: avaliacoesUnicas });
        this.logger.log(`${resultado.count} avaliações geradas com SUCESSO para o ciclo ${idCiclo}.`);
    } else {
        this.logger.warn(`Nenhuma avaliação foi gerada para o ciclo ${idCiclo}.`);
    }
  }

  // Método auxiliar para encontrar pares que trabalharam juntos
  private async encontrarPares(participantes: any[]): Promise<{idAvaliador: string, idAvaliado: string}[]> {
      const quinzeDiasAtras = new Date();
      quinzeDiasAtras.setDate(quinzeDiasAtras.getDate() - 15);
      let pares: { idAvaliador: string; idAvaliado: string }[] = [];
      // Lógica simplificada: todos os participantes do ciclo se avaliam
      // A lógica real usaria a tabela `AlocacaoColaboradorProjeto` para verificar projetos e datas
      for(let i = 0; i < participantes.length; i++) {
          for(let j = 0; j < participantes.length; j++) {
              if (i !== j) { // Um colaborador não avalia a si mesmo como par
                  pares.push({
                      idAvaliador: participantes[i].colaborador.idColaborador,
                      idAvaliado: participantes[j].colaborador.idColaborador
                  });
              }
          }
      }
      return pares;
  }

  // ===================================================================
  // PREENCHIMENTO DE AVALIAÇÕES (AÇÃO DO USUÁRIO)
  // ===================================================================

  async preencherAutoAvaliacao(idAvaliacao: string, dto: PreencherAutoAvaliacaoDto) {
    const { respostas } = dto;
    return this.prisma.$transaction(async (tx) => {
        // ... (validação da avaliação pendente e do tipo AUTOAVALIACAO) ...
        const avaliacao = await this.validarAvaliacaoPendente(tx, idAvaliacao, 'AUTOAVALIACAO');
        
        const detalhesParaCriar = respostas.map(r => ({
            idAvaliacao, idCriterio: r.idCriterio, nota: r.nota, justificativa: r.justificativa || ''
        }));
        await tx.detalheAvaliacao.createMany({ data: detalhesParaCriar });

        return this.finalizarAvaliacao(tx, idAvaliacao);
    });
  }

  async preencherAvaliacaoGestorLiderado(idAvaliacao: string, dto: PreencherAvaliacaoGestorLideradoDto) {
    return this.prisma.$transaction(async (tx) => {
        const avaliacao = await this.validarAvaliacaoPendente(tx, idAvaliacao, 'GESTOR_LIDERADO');

        // O gestor precisa ver a autoavaliação primeiro.
        const autoAvaliacaoDoLiderado = await tx.avaliacao.findFirst({
            where: { idCiclo: avaliacao.idCiclo, idAvaliado: avaliacao.idAvaliado, tipo: 'AUTOAVALIACAO' }
        });
        if (!autoAvaliacaoDoLiderado || autoAvaliacaoDoLiderado.status !== 'CONCLUIDA') {
            throw new ConflictException('A autoavaliação do liderado precisa ser concluída antes da avaliação do gestor.');
        }

        // Atualiza os detalhes existentes com a nota do gestor
        for (const resposta of dto.respostasGestor) {
            await tx.detalheAvaliacao.updateMany({
                where: { idAvaliacao: autoAvaliacaoDoLiderado.idAvaliacao, idCriterio: resposta.idCriterio },
                // Atualize aqui apenas com campos existentes no modelo DetalheAvaliacao
                data: { /* campos existentes, por exemplo: nota: resposta.notaGestor, justificativa: resposta.justificativaGestor */ }
            });
        }
        return this.finalizarAvaliacao(tx, idAvaliacao);
    });
  }

  async preencherAvaliacaoQualitativa(idAvaliacao: string, dto: PreencherAvaliacaoQualitativaDto, tipoEsperado: 'AVALIACAO_PARES' | 'LIDERADO_GESTOR') {
      return this.prisma.$transaction(async (tx) => {
          await this.validarAvaliacaoPendente(tx, idAvaliacao, tipoEsperado);
          
          return tx.avaliacao.update({
              where: { idAvaliacao },
              data: { ...dto, status: 'CONCLUIDA', dataPreenchimento: new Date() }
          });
      });
  }

  async listarPorColaborador(idColaborador: string) {
    return this.prisma.avaliacao.findMany({
      where: { idAvaliado: idColaborador },
      include: { detalhes: true },
    });
  }

  async findAvaliacaoParaPreencher(id: string) {
    // Busca a avaliação e seus detalhes para exibir na tela de preenchimento
    return this.prisma.avaliacao.findUnique({
      where: { idAvaliacao: id },
      include: { detalhes: true },
    });
  }

  // --- Métodos Auxiliares ---
  private async validarAvaliacaoPendente(tx: any, idAvaliacao: string, tipoEsperado: avaliacaoTipo) {
      const avaliacao = await tx.avaliacao.findUnique({ where: { idAvaliacao } });
      if (!avaliacao) throw new NotFoundException(`Avaliação ${idAvaliacao} não encontrada.`);
      if (avaliacao.status !== 'PENDENTE') throw new ConflictException('Esta avaliação não está mais pendente.');
      if (avaliacao.tipo !== tipoEsperado) throw new ConflictException(`Esta avaliação não é do tipo ${tipoEsperado}.`);
      return avaliacao;
  }

  private async finalizarAvaliacao(tx: any, idAvaliacao: string) {
      return tx.avaliacao.update({
          where: { idAvaliacao },
          data: { status: 'CONCLUIDA', dataPreenchimento: new Date() },
          include: { detalhes: true },
      });
  }
}
