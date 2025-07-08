import { Module } from '@nestjs/common';
import { IaController } from './ia.controller';
import { IaService } from './ia.service';
import { PrismaService } from '../database/prismaService';
import { AvaliacoesModule } from '../avaliacoes/avaliacoes.module'; // ajuste o caminho se necessário
import { AvaliacoesService } from 'src/avaliacoes/avaliacoes.service';
@Module({
    controllers: [IaController],
    providers: [IaService, PrismaService, AvaliacoesService],
    imports: [AvaliacoesModule], // <-- Adicione aqui
    exports: [IaService],
})
export class IaModule {}
