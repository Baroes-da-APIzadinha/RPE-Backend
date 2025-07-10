import { Module } from '@nestjs/common';
import { AvaliacoesController } from './avaliacoes.controller';
import { AvaliacoesService } from './avaliacoes.service';
import { PrismaService } from '../database/prismaService';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
    imports: [AuditoriaModule],
    controllers: [AvaliacoesController],
    providers: [AvaliacoesService, PrismaService],
})
export class AvaliacoesModule {}
