import { IsNotEmpty, IsString, IsNumber, IsOptional } from "class-validator";
import { cicloStatus } from "@prisma/client";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateCicloDto {
    @ApiProperty({ description: 'Nome do ciclo' })
    @IsNotEmpty()
    @IsString()
    nome: string;

    @ApiProperty({ description: 'Data de início do ciclo (ano)' })
    @IsNotEmpty()
    @IsNumber()
    dataInicioAno: number;

    @ApiProperty({ description: 'Data de início do ciclo (mês)' })
    @IsNotEmpty()
    @IsNumber()
    dataInicioMes: number;

    @ApiProperty({ description: 'Data de início do ciclo (dia)' })
    @IsNotEmpty()
    @IsNumber()
    dataInicioDia: number;

    @ApiProperty({ description: 'Data de fim do ciclo (ano)' })
    @IsNotEmpty()
    @IsNumber()
    dataFimAno: number;

    @ApiProperty({ description: 'Data de fim do ciclo (mês)' })
    @IsNotEmpty()
    @IsNumber()
    dataFimMes: number;

    @ApiProperty({ description: 'Data de fim do ciclo (dia)' })
    @IsNotEmpty()
    @IsNumber()
    dataFimDia: number;

    @ApiPropertyOptional({ description: 'Status do ciclo', enum: cicloStatus })
    @IsOptional()
    @IsString()
    status?: cicloStatus;

    @ApiProperty({ description: 'Duração do status "em andamento" em dias' })
    @IsNotEmpty()
    @IsNumber()
    duracaoEmAndamentoDias: number;

    @ApiProperty({ description: 'Duração do status "em revisão" em dias' })
    @IsNotEmpty()
    @IsNumber()
    duracaoEmRevisaoDias: number;

    @ApiProperty({ description: 'Duração do status "em equalização" em dias' })
    @IsNotEmpty()
    @IsNumber()
    duracaoEmEqualizacaoDias: number;
}

export class UpdateCicloDto {
    @ApiPropertyOptional({ description: 'Nome do ciclo' })
    @IsOptional()
    @IsString()
    nome?: string;

    @ApiPropertyOptional({ description: 'Data de início do ciclo (ano)' })
    @IsOptional()
    @IsNumber()
    dataInicioAno?: number;

    @ApiPropertyOptional({ description: 'Data de início do ciclo (mês)' })
    @IsOptional()
    @IsNumber()
    dataInicioMes?: number;

    @ApiPropertyOptional({ description: 'Data de início do ciclo (dia)' })
    @IsOptional()
    @IsNumber()
    dataInicioDia?: number;

    @ApiPropertyOptional({ description: 'Data de fim do ciclo (ano)' })
    @IsOptional()
    @IsNumber()
    dataFimAno?: number;

    @ApiPropertyOptional({ description: 'Data de fim do ciclo (mês)' })
    @IsOptional()
    @IsNumber()
    dataFimMes?: number;

    @ApiPropertyOptional({ description: 'Data de fim do ciclo (dia)' })
    @IsOptional()
    @IsNumber()
    dataFimDia?: number;

    @ApiPropertyOptional({ description: 'Status do ciclo', enum: cicloStatus })
    @IsOptional()
    @IsString()
    status?: cicloStatus;

    @ApiPropertyOptional({ description: 'Duração do status "em andamento" em dias' })
    @IsOptional()
    @IsNumber()
    duracaoEmAndamentoDias?: number;

    @ApiPropertyOptional({ description: 'Duração do status "em revisão" em dias' })
    @IsOptional()
    @IsNumber()
    duracaoEmRevisaoDias?: number;

    @ApiPropertyOptional({ description: 'Duração do status "em equalização" em dias' })
    @IsOptional()
    @IsNumber()
    duracaoEmEqualizacaoDias?: number;
}


