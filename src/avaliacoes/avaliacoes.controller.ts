import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AvaliacoesService } from './avaliacoes.service';
import {
  PreencherAutoAvaliacaoDto,
  PreencherAvaliacaoGestorLideradoDto,
  PreencherAvaliacaoQualitativaDto,
} from './avaliacoes.dto';

@Controller('avaliacoes')
export class AvaliacoesController {
  constructor(private readonly avaliacoesService: AvaliacoesService) {}

  /**
   * Endpoint para um colaborador submeter (preencher) uma autoavaliação pendente.
   * Utiliza o método PUT pois estamos atualizando um recurso existente.
   * @param id O ID da avaliação (da tabela Avaliacao) que está sendo preenchida.
   * @param dto O corpo da requisição com as respostas dos critérios.
   */
  @Put(':id/preencher-auto')
  async preencherAutoAvaliacao(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PreencherAutoAvaliacaoDto,
  ) {
    return this.avaliacoesService.preencherAutoAvaliacao(id, dto);
  }

  /**
   * Endpoint para um colaborador submeter (preencher) uma avaliação gestor-liderado.
   * @param id O ID da avaliação que está sendo preenchida.
   * @param dto O corpo da requisição com as respostas dos critérios.
   */
  @Put(':id/preencher-gestor')
  async preencherAvaliacaoGestorLiderado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PreencherAvaliacaoGestorLideradoDto,
  ) {
    return this.avaliacoesService.preencherAvaliacaoGestorLiderado(id, dto);
  }

  /**
   * Endpoint para um colaborador submeter (preencher) uma avaliação qualitativa/pares/liderado-gestor.
   * @param id O ID da avaliação que está sendo preenchida.
   * @param tipo O tipo da avaliação: AVALIACAO_PARES ou LIDERADO_GESTOR.
   * @param dto O corpo da requisição com os feedbacks qualitativos.
   */
  @Put(':id/preencher-qualitativa/:tipo')
  async preencherAvaliacaoQualitativa(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tipo') tipo: 'AVALIACAO_PARES' | 'LIDERADO_GESTOR',
    @Body() dto: PreencherAvaliacaoQualitativaDto,
  ) {
    return this.avaliacoesService.preencherAvaliacaoQualitativa(id, dto, tipo);
  }

  /**
   * Endpoint para listar todas as avaliações de um colaborador (tanto as que ele fez quanto as que recebeu).
   * Útil para o frontend montar a tela de "Minhas Avaliações".
   * @param id O ID do colaborador.
   */
  @Get('colaborador/:id')
  async listarPorColaborador(@Param('id', ParseUUIDPipe) id: string) {
    return this.avaliacoesService.listarPorColaborador(id);
  }

  /**
   * Endpoint para buscar os detalhes de UMA avaliação específica.
   * O frontend usaria isso antes de exibir a tela de preenchimento,
   * para saber quais critérios perguntar.
   * @param id O ID da avaliação.
   */
  @Get(':id/detalhes')
  async buscarDetalhes(@Param('id', ParseUUIDPipe) id: string) {
    return this.avaliacoesService.findAvaliacaoParaPreencher(id);
  }
}
