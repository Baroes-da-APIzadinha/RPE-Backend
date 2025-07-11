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
  UseGuards
} from '@nestjs/common';
import { EqualizacaoService } from './equalizacao.service';
import { CreateEqualizacaoDto, UpdateEqualizacaoDto } from './equalizacao.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('equalizacao')
export class EqualizacaoController {
  private readonly logger = new Logger(EqualizacaoController.name);
  
  constructor(private readonly equalizacaoService: EqualizacaoService) {}

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
  @Roles('ADMIN', 'COMITE')
  @Post()
  async create(@Body() createEqualizacaoDto: CreateEqualizacaoDto) {
    this.logger.log('Recebida requisição para criar nova equalização');
    return this.equalizacaoService.create(createEqualizacaoDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'COMITE')
  @Patch(':idEqualizacao')
  async update(@Param('idEqualizacao') idEqualizacao: string, @Body() updateEqualizacaoDto: UpdateEqualizacaoDto) {
    this.logger.log(`Recebida requisição para atualizar equalização: ${idEqualizacao}`);
    return this.equalizacaoService.update(idEqualizacao, updateEqualizacaoDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'COMITE')
  @Delete(':idEqualizacao')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('idEqualizacao') idEqualizacao: string) {
    this.logger.log(`Recebida requisição para remover equalização: ${idEqualizacao}`);
    return this.equalizacaoService.remove(idEqualizacao);
  }
}