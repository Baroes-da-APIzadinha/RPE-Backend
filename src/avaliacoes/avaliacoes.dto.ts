import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { IsNumber } from "class-validator";
import { Motivacao, Status } from "./avaliacoes.constants";
import { IsArray, ValidateNested, IsOptional, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class AvaliacaoParesDto {

    @IsNotEmpty()
    @IsString()
    @IsUUID()
    idAvaliacao: string;

    @IsNotEmpty()
    @IsEnum(Status)
    status : Status;

    @IsOptional()
    @IsNumber()
    nota?: number;

    @IsOptional()
    @IsEnum(Motivacao)
    motivacao?: Motivacao;

    @IsOptional()
    @IsString()
    pontosFortes?: string;

    @IsOptional()
    @IsString()
    pontosFracos?: string;
    
}

export class AvaliacaoColaboradorMentorDto {
    @IsNotEmpty()
    @IsString()
    idAvaliacao: string;

    @IsNotEmpty()
    @IsEnum(Status)
    status : Status

    @IsOptional()
    @IsNumber()
    nota?: number;

    @IsOptional()
    @IsString()
    justificativa?: string;
    
}

export class CriterioAutoAvaliacaoDto {
    @IsString()
    nome: string;

    @IsNumber()
    @Min(0)
    @Max(5)
    nota: number;

    @IsString()
    justificativa: string;
}

export class PreencherAuto_ou_Lider_Dto {
    @IsString()
    @IsUUID()
    idAvaliacao: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CriterioAutoAvaliacaoDto)
    criterios: CriterioAutoAvaliacaoDto[];
}