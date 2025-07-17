import { Module } from '@nestjs/common';
import { IaController } from './ia.controller';
import { IaService } from './ia.service';
import { PrismaService } from '../database/prismaService';
import { AvaliacoesModule } from '../avaliacoes/avaliacoes.module'; 
import { AvaliacoesService } from 'src/avaliacoes/avaliacoes.service';
import { HashService } from 'src/common/hash.service';

@Module({
    controllers: [IaController],
    providers: [IaService, PrismaService, AvaliacoesService, HashService],
    imports: [AvaliacoesModule], 
    exports: [IaService],
})
export class IaModule {}
