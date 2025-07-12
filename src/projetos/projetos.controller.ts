import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { ProjetosService } from './projetos.service';
import { CreateProjetoDto, UpdateProjetoDto } from './projetos.dto';
import { CreateAlocacaoDto, UpdateAlocacaoDto } from './alocacao.dto';

@Controller('projetos')
export class ProjetosController {
  constructor(private readonly projetosService: ProjetosService) {}

  @Post()
  create(@Body() createProjetoDto: CreateProjetoDto) {
    return this.projetosService.create(createProjetoDto);
  }

  @Get()
  findAll() {
    return this.projetosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.projetosService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateProjetoDto: UpdateProjetoDto) {
    return this.projetosService.update(id, updateProjetoDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.projetosService.remove(id);
  }

  @Post(':idProjeto/alocacoes')
  alocarColaborador(
    @Param('idProjeto', ParseUUIDPipe) idProjeto: string,
    @Body() dto: CreateAlocacaoDto
  ) {
    return this.projetosService.alocarColaborador(idProjeto, dto);
  }

  @Get(':idProjeto/alocacoes')
  listarAlocacoesPorProjeto(@Param('idProjeto', ParseUUIDPipe) idProjeto: string) {
    return this.projetosService.listarAlocacoesPorProjeto(idProjeto);
  }

  @Patch('alocacoes/:idAlocacao')
  atualizarAlocacao(
    @Param('idAlocacao', ParseUUIDPipe) idAlocacao: string,
    @Body() dto: UpdateAlocacaoDto
  ) {
    return this.projetosService.atualizarAlocacao(idAlocacao, dto);
  }

  @Delete('alocacoes/:idAlocacao')
  removerAlocacao(@Param('idAlocacao', ParseUUIDPipe) idAlocacao: string) {
    return this.projetosService.removerAlocacao(idAlocacao);
  }
}
