import { 
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Logger,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req
} from '@nestjs/common';
import { EqualizacaoService } from './equalizacao.service';
import { CreateEqualizacaoDto, UpdateEqualizacaoDto } from './equalizacao.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Controller('equalizacao')
export class EqualizacaoController {
  private readonly logger = new Logger(EqualizacaoController.name);
  
  constructor(private readonly equalizacaoService: EqualizacaoService, private readonly auditoriaService: AuditoriaService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    this.logger.log('Recebida requisição para listar todas as equalizações');
    return this.equalizacaoService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('avaliado/:idAvaliado')
  async findByAvaliado(@Param('idAvaliado') idAvaliado: string) {
    this.logger.log(`Recebida requisição para buscar equalizações do avaliado: ${idAvaliado}`);
    return this.equalizacaoService.findByAvaliado(idAvaliado);
  }

  @Get('avaliado/:idAvaliado/:idCiclo')
  async findByAvaliadoCiclo(@Param('idAvaliado') idAvaliado: string, @Param('idCiclo') idCiclo: string) {
    this.logger.log(`Recebida requisição para buscar equalizações do avaliado: ${idAvaliado} e ciclo: ${idCiclo}`);
    return this.equalizacaoService.findByAvaliadoCiclo(idAvaliado, idCiclo);
  }

  @UseGuards(JwtAuthGuard)
  @Get('comite/:idMembroComite')
  async findByComite(@Param('idMembroComite') idMembroComite: string) {
    this.logger.log(`Recebida requisição para buscar equalizações do membro do comitê: ${idMembroComite}`);
    return this.equalizacaoService.findByComite(idMembroComite);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':idEqualizacao')
  async findOne(@Param('idEqualizacao') idEqualizacao: string) {
    this.logger.log(`Recebida requisição para buscar equalização: ${idEqualizacao}`);
    return this.equalizacaoService.findOne(idEqualizacao);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MEMBRO_COMITE')
  @Post()
  async create(@Body() createEqualizacaoDto: CreateEqualizacaoDto, @Req() req) {
    this.logger.log('Recebida requisição para criar nova equalização');
    const result = await this.equalizacaoService.create(createEqualizacaoDto);
    await this.auditoriaService.log({
      userId: req.user?.userId,
      action: 'criar_equalizacao',
      resource: 'Equalizacao',
      details: { ...createEqualizacaoDto, result },
      ip: req.ip,
    });
    return result;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MEMBRO_COMITE')
  @Patch(':idEqualizacao')
  async update(@Param('idEqualizacao') idEqualizacao: string, @Body() updateEqualizacaoDto: UpdateEqualizacaoDto, @Req() req) {
    this.logger.log(`Recebida requisição para atualizar equalização: ${idEqualizacao}`);
    const result = await this.equalizacaoService.update(idEqualizacao, updateEqualizacaoDto);
    await this.auditoriaService.log({
      userId: req.user?.userId,
      action: 'atualizar_equalizacao',
      resource: 'Equalizacao',
      details: { idEqualizacao, ...updateEqualizacaoDto, result },
      ip: req.ip,
    });
    return result;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MEMBRO_COMITE')
  @Delete(':idEqualizacao')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('idEqualizacao') idEqualizacao: string, @Req() req) {
    this.logger.log(`Recebida requisição para remover equalização: ${idEqualizacao}`);
    const result = await this.equalizacaoService.remove(idEqualizacao);
    await this.auditoriaService.log({
      userId: req.user?.userId,
      action: 'remover_equalizacao',
      resource: 'Equalizacao',
      details: { idEqualizacao, result },
      ip: req.ip,
    });
    return result;
  }
}