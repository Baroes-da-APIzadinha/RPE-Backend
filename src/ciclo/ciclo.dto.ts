import { IsNotEmpty, IsString, IsNumber, IsOptional } from "class-validator";
import { cicloStatus } from "@prisma/client";

export class CreateCicloDto {
    @IsNotEmpty()
    @IsString()
    nome: string;

    @IsNotEmpty()
    @IsNumber()
    dataInicioAno: number;

    @IsNotEmpty()
    @IsNumber()
    dataInicioMes: number;

    @IsNotEmpty()
    @IsNumber()
    dataInicioDia: number;

    @IsNotEmpty()
    @IsNumber()
    dataFimAno: number;

    @IsNotEmpty()
    @IsNumber()
    dataFimMes: number;

    @IsNotEmpty()
    @IsNumber()
    dataFimDia: number;

    @IsOptional()
    @IsString()
    status?: cicloStatus;

    @IsNotEmpty()
    @IsNumber()
    duracaoEmAndamentoDias: number;

    @IsNotEmpty()
    @IsNumber()
    duracaoEmRevisaoDias: number;

    @IsNotEmpty()
    @IsNumber()
    duracaoEmEqualizacaoDias: number;
}

export class UpdateCicloDto {
    @IsOptional()
    @IsString()
    nome?: string;

    @IsOptional()
    @IsNumber()
    dataInicioAno?: number;

    @IsOptional()
    @IsNumber()
    dataInicioMes?: number;

    @IsOptional()
    @IsNumber()
    dataInicioDia?: number;

    @IsOptional()
    @IsNumber()
    dataFimAno?: number;

    @IsOptional()
    @IsNumber()
    dataFimMes?: number;

    @IsOptional()
    @IsNumber()
    dataFimDia?: number;

    @IsOptional()
    @IsString()
    status?: cicloStatus;

    @IsOptional()
    @IsNumber()
    duracaoEmAndamentoDias?: number;

    @IsOptional()
    @IsNumber()
    duracaoEmRevisaoDias?: number;

    @IsOptional()
    @IsNumber()
    duracaoEmEqualizacaoDias?: number;
}

export class PatchCicloDto {
    @IsOptional()
    @IsString()
    nome?: string;

    @IsOptional()
    @IsNumber()
    dataInicioAno?: number;

    @IsOptional()
    @IsNumber()
    dataInicioMes?: number;

    @IsOptional()
    @IsNumber()
    dataInicioDia?: number;

    @IsOptional()
    @IsNumber()
    dataFimAno?: number;

    @IsOptional()
    @IsNumber()
    dataFimMes?: number;

    @IsOptional()
    @IsNumber()
    dataFimDia?: number;

    @IsOptional()
    @IsString()
    status?: cicloStatus;

    @IsOptional()
    @IsNumber()
    duracaoEmAndamentoDias?: number;

    @IsOptional()
    @IsNumber()
    duracaoEmRevisaoDias?: number;

    @IsOptional()
    @IsNumber()
    duracaoEmEqualizacaoDias?: number;
}
