import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prismaService';
import ai from './init';
import { generationConfig } from './config';
import { AvaliacoesService } from '../avaliacoes/avaliacoes.service';

@Injectable()
export class IaService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly avaliacoesService: AvaliacoesService
    ) { }

    async avaliarColaborador(idColaborador: string, idCiclo: string): Promise<string> {

        const dadosColaborador = await this.avaliacoesService.discrepanciaColaborador(idColaborador, idCiclo);

        if (dadosColaborador.status) {
            throw new Error(`Erro ao buscar dados: ${dadosColaborador.message}`);
        }

        if (!dadosColaborador.avaliacoes) {
            throw new Error('Dados de avaliações não encontrados para este colaborador');
        }


        try {
            const prompt = `
            Analise as seguintes informações do colaborador e sugira uma nota final:
            
            Autoavaliação: ${dadosColaborador.avaliacoes?.autoAvaliacao?.media}/5
            Justificativa da autoavaliação: Ok.
            
            Avaliação do líder: ${dadosColaborador.avaliacoes?.avaliacaoLider?.media}/5
            Justificativa do líder: Ok.
            
            Média das avaliações dos pares: ${dadosColaborador.avaliacoes?.avaliacaoPares?.media}/5
            Comentários dos pares: Ok.

            Discrepância: ${dadosColaborador.discrepancia?.desvioPadrao}
            
            Forneça uma nota final de 1 a 5 e um resumo de no máximo 300 caracteres explicando sua decisão.
            
            Formato da resposta:
            Nota final: X/5
            Resumo: [seu resumo aqui]
            `;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    systemInstruction: generationConfig.systemInstruction,
                    temperature: generationConfig.temperature,
                    topP: generationConfig.topP
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
}
