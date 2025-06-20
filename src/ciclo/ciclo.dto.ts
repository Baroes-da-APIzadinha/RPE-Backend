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
}

export class UpdateCicloDto {
    @IsString()
    nome?: string;

    @IsNumber()
    dataInicioAno?: number;

    @IsNumber()
    dataInicioMes?: number;

    @IsNumber()
    dataInicioDia?: number;

    @IsNumber()
    dataFimAno?: number;

    @IsNumber()
    dataFimMes?: number;

    @IsNumber()
    dataFimDia?: number;

    @IsString()
    status?: cicloStatus;
}
