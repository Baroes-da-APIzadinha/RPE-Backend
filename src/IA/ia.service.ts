import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prismaService';
import ai from './init';
import { generationConfig, MiniConfig } from './config';
import { AvaliacoesService } from '../avaliacoes/avaliacoes.service';

@Injectable()
export class IaService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly avaliacoesService: AvaliacoesService
    ) { }

    async avaliarColaborador(idColaborador: string, idCiclo: string): Promise<string> {
        
        const avaliacoes = await this.getAvaliacoesIA(idColaborador, idCiclo);

        if (!avaliacoes || avaliacoes.length === 0) {
            throw new Error('Nenhuma avaliação encontrada para este colaborador neste ciclo');
        }

        const dadosProcessados = this.processarAvaliacoes(avaliacoes);
        let prompt_base = this.criarPromptDetalhado(dadosProcessados);
        prompt_base += `        
        === FORMATO DA RESPOSTA ===

        **Nota Final Sugerida:** X/5

        **Análise Detalhada:**
        [Análise explicando o raciocínio, incluindo comparação entre múltiplos líderes se aplicável]

        **Resumo Executivo:**
        [Resumo conciso para relatórios]`

        const prompt = prompt_base
        console.log('=== PROMPT ENVIADO PARA IA ===');
        console.log(prompt);

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    systemInstruction: generationConfig.systemInstruction,
                    temperature: generationConfig.temperature,
                    topP: generationConfig.topP,
                    maxOutputTokens: generationConfig.maxOutputTokens,
                    responseMimeType: generationConfig.responseMimeType,
                    thinkingConfig: generationConfig.thinkingConfig
                }
            });

            console.log('Resposta da IA:', response.text);
            return response.text || 'Erro na geração de resposta pela IA';
        } catch (error) {
            console.error('Erro ao avaliar colaborador:', error);
            throw error;
        }
    }

    async getAvaliacoesIA(idColaborador: string, idCiclo: string) {
        const avaliacoes = await this.prisma.avaliacao.findMany({
            where: {
                idAvaliado: idColaborador,
                idCiclo: idCiclo
            },
            include: {

                autoAvaliacao: {include: { cardAutoAvaliacoes: true }},

                avaliacaoPares: true,

                avaliacaoLiderColaborador: { include: { cardAvaliacaoLiderColaborador: true } }
            }
        });
        return avaliacoes;
    }

    private processarAvaliacoes(avaliacoes: any[]) {
        const resultado = {
            autoAvaliacao: null as any,
            avaliacoesLider: [] as any[], 
            avaliacoesPares: [] as any[],
            resumo: {
                totalAvaliacoes: avaliacoes.length,
                temAutoAvaliacao: false,
                quantidadeLideres: 0, 
                quantidadePares: 0
            }
        };

        avaliacoes.forEach(avaliacao => {
            switch (avaliacao.tipoAvaliacao) {
                case 'AUTOAVALIACAO':
                    resultado.autoAvaliacao = {
                        notaFinal: avaliacao.autoAvaliacao?.notaFinal,
                        criterios: avaliacao.autoAvaliacao?.cardAutoAvaliacoes || [],
                        avaliador: avaliacao.avaliador
                    };
                    resultado.resumo.temAutoAvaliacao = true;
                    break;

                case 'LIDER_COLABORADOR':
                    resultado.avaliacoesLider.push({
                        notaFinal: avaliacao.avaliacaoLiderColaborador?.notaFinal,
                        criterios: avaliacao.avaliacaoLiderColaborador?.cardAvaliacaoLiderColaborador || [],
                        avaliador: avaliacao.avaliador
                    });
                    resultado.resumo.quantidadeLideres++; 
                    break;

                case 'AVALIACAO_PARES':
                    resultado.avaliacoesPares.push({
                        nota: avaliacao.avaliacaoPares?.nota,
                        motivadoTrabalharNovamente: avaliacao.avaliacaoPares?.motivadoTrabalharNovamente,
                        pontosFortes: avaliacao.avaliacaoPares?.pontosFortes,
                        pontosFracos: avaliacao.avaliacaoPares?.pontosFracos,
                        avaliador: avaliacao.avaliador
                    });
                    resultado.resumo.quantidadePares++;
                    break;
            }
        });

        return resultado;
    }

    private criarPromptDetalhado(dados: any): string {
        let prompt = `
        === ANÁLISE COMPLETA DE AVALIAÇÃO DE DESEMPENHO ===

        Analise as seguintes informações detalhadas do colaborador e forneça uma avaliação equilibrada e justa:

        `;

        // ✅ AUTOAVALIAÇÃO
        if (dados.autoAvaliacao) {
            prompt += `
            === AUTOAVALIAÇÃO ===
            Nota Final: ${dados.autoAvaliacao.notaFinal || 'Não informada'}/5
            Avaliador: ${dados.autoAvaliacao.avaliador?.nomeCompleto || 'Não informado'}

            Critérios Avaliados:
            `;
            dados.autoAvaliacao.criterios.forEach((criterio: any) => {
                prompt += `
                • ${criterio.nomeCriterio}: ${criterio.nota || 'N/A'}/5
                Justificativa: "${criterio.justificativa || 'Não informada'}"
                `;
            });
        } else {
            prompt += `
            === AUTOAVALIAÇÃO ===
            ❌ Autoavaliação não realizada
            `;
        }

        // ✅ AVALIAÇÕES DOS LÍDERES
        if (dados.avaliacoesLider && dados.avaliacoesLider.length > 0) {
            prompt += `
            === AVALIAÇÕES DOS LÍDERES (${dados.avaliacoesLider.length} avaliações) ===
            `;
            dados.avaliacoesLider.forEach((lider: any, index: number) => {
                prompt += `
                --- Avaliação do Líder ${index + 1} ---
                Nota Final: ${lider.notaFinal || 'Não informada'}/5
                Avaliador: ${lider.avaliador?.nomeCompleto || 'Não informado'} (${lider.avaliador?.cargo || 'Cargo não informado'})

                Critérios Avaliados:
                `;
                lider.criterios.forEach((criterio: any) => {
                    prompt += `
                    • ${criterio.nomeCriterio}: ${criterio.nota || 'N/A'}/5
                    Justificativa: "${criterio.justificativa || 'Não informada'}"
                    `;
                });
            });
        } else {
            prompt += `
            === AVALIAÇÕES DOS LÍDERES ===
            ❌ Nenhuma avaliação de líder realizada
            `;
        }

        // ✅ AVALIAÇÕES DOS PARES
        if (dados.avaliacoesPares.length > 0) {
            prompt += `
            === AVALIAÇÕES DOS PARES (${dados.avaliacoesPares.length} avaliações) ===
            `;
            dados.avaliacoesPares.forEach((par: any, index: number) => {
                prompt += `
                Avaliação ${index + 1} - Por: ${par.avaliador?.nomeCompleto || 'Não informado'}
                • Nota Geral: ${par.nota || 'N/A'}/5
                • Motivado a trabalhar novamente: ${par.motivadoTrabalharNovamente || 'Não informado'}
                • Pontos Fortes: "${par.pontosFortes || 'Não informado'}"
                • Pontos Fracos: "${par.pontosFracos || 'Não informado'}"
                `;
            });
        } else {
            prompt += `
            === AVALIAÇÕES DOS PARES ===
            ❌ Nenhuma avaliação de pares realizada
            `;
        }

        // ✅ ANÁLISE E DISCREPÂNCIAS (atualizada)
        prompt += `
        === ANÁLISE DE DISCREPÂNCIAS ===
        ${this.analisarDiscrepancias(dados)}

        === INSTRUÇÕES PARA ANÁLISE ===
        Com base em todas as informações fornecidas acima:

        1. Analise a consistência entre as diferentes avaliações
        2. Compare múltiplas avaliações de líderes quando disponíveis
        3. Identifique possíveis discrepâncias e suas causas
        4. Considere as justificativas fornecidas para cada critério
        5. Avalie a qualidade e coerência dos feedbacks dos pares

        IMPORTANTE: 
        - Seja equilibrado e justo na análise
        - Compare avaliações de múltiplos líderes quando disponível
        - Identifique pontos de convergência e divergência
        - Explique o raciocínio por trás da nota sugerida
        `;

        return prompt;
    }

    private analisarDiscrepancias(dados: any): string {
        const notas: number[] = [];
        let analise = '';

        // Autoavaliação
        if (dados.autoAvaliacao?.notaFinal) {
            notas.push(Number(dados.autoAvaliacao.notaFinal));
        }

        // Múltiplas avaliações de líderes
        if (dados.avaliacoesLider && dados.avaliacoesLider.length > 0) {
            dados.avaliacoesLider.forEach((lider: any) => {
                if (lider.notaFinal) {
                    notas.push(Number(lider.notaFinal));
                }
            });
        }

        // Avaliações dos pares
        if (dados.avaliacoesPares.length > 0) {
            const mediaParesNotas = dados.avaliacoesPares
                .filter((p: any) => p.nota)
                .map((p: any) => Number(p.nota));
            if (mediaParesNotas.length > 0) {
                const media = mediaParesNotas.reduce((a, b) => a + b, 0) / mediaParesNotas.length;
                notas.push(media);
            }
        }

        // Análise detalhada
        if (notas.length >= 2) {
            const max = Math.max(...notas);
            const min = Math.min(...notas);
            const diferenca = max - min;
            const media = notas.reduce((a, b) => a + b, 0) / notas.length;
            
            analise += `Resumo das notas:\n`;
            analise += `• Autoavaliação: ${dados.autoAvaliacao?.notaFinal || 'N/A'}\n`;
            
            if (dados.avaliacoesLider && dados.avaliacoesLider.length > 0) {
                analise += `• Líderes (${dados.avaliacoesLider.length}): `;
                const notasLideres = dados.avaliacoesLider
                    .filter((l: any) => l.notaFinal)
                    .map((l: any) => Number(l.notaFinal));
                analise += `${notasLideres.map(n => n.toFixed(1)).join(', ')}\n`;
            }
            
            if (dados.avaliacoesPares.length > 0) {
                const notasPares = dados.avaliacoesPares
                    .filter((p: any) => p.nota)
                    .map((p: any) => Number(p.nota));
                const mediaPares = notasPares.reduce((a, b) => a + b, 0) / notasPares.length;
                analise += `• Pares (média de ${notasPares.length}): ${mediaPares.toFixed(1)}\n`;
            }
            
            analise += `\nAnálise de discrepância:\n`;
            analise += `• Diferença máxima: ${diferenca.toFixed(1)} pontos\n`;
            analise += `• Média geral: ${media.toFixed(1)}\n`;
            
            if (diferenca > 1.5) {
                analise += `ALTA DISCREPÂNCIA detectada (>1.5 pontos)\n`;
            } else if (diferenca > 0.8) {
                analise += `Discrepância moderada detectada (>0.8 pontos)\n`;
            } else {
                analise += `Baixa discrepância entre avaliações\n`;
            }
        } else {
            analise += `Dados insuficientes para análise de discrepância (apenas ${notas.length} nota(s) disponível(is))\n`;
        }

        return analise;
    }

    async miniAvaliarColaborador(idColaborador: string, idCiclo: string): Promise<string> {
        
        const avaliacoes = await this.getAvaliacoesIA(idColaborador, idCiclo);

        if (!avaliacoes || avaliacoes.length === 0) {
            throw new Error('Nenhuma avaliação encontrada para este colaborador neste ciclo');
        }

        const dadosProcessados = this.processarAvaliacoes(avaliacoes);
        let prompt_base = this.criarPromptDetalhado(dadosProcessados);
        prompt_base += `
        === FORMATO DA RESPOSTA ===

        **Nota Final Sugerida:** X/5

        **Justificativa:**
        [Resumo conciso para relatórios]`

        const prompt = prompt_base
        console.log('=== PROMPT ENVIADO PARA IA ===');
        console.log(prompt);

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    systemInstruction: MiniConfig.systemInstruction,
                    temperature: MiniConfig.temperature,
                    topP: MiniConfig.topP,
                    maxOutputTokens: MiniConfig.maxOutputTokens,
                    responseMimeType: MiniConfig.responseMimeType,
                    thinkingConfig: MiniConfig.thinkingConfig
                }
            });

            console.log('Resposta da IA:', response.text);
            return response.text || 'Erro na geração de resposta pela IA';
        } catch (error) {
            console.error('Erro ao avaliar colaborador:', error);
            throw error;
        }
    }
}
