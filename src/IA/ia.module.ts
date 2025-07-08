import { Module } from '@nestjs/common';
import { IaController } from './ia.controller';
import { IaService } from './ia.service';
import { PrismaService } from '../database/prismaService';

@Module({
    controllers: [IaController],
    providers: [IaService, PrismaService],
})
export class IaModule {}
