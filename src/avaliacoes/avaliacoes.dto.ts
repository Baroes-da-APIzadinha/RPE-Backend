import { IsNotEmpty, IsString } from "class-validator";
import { IsNumber } from "class-validator";
import { Motivacao } from "./avaliacoes.contants";
import { IsArray, ValidateNested, IsOptional, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class AvaliacaoParesDto {
    @IsNotEmpty()
    @IsString()
    @IsUUID()
    idAvaliacao: string;

    @IsNotEmpty()
    @IsNumber()
    nota: number;

    @IsNotEmpty()
    @IsString()
    motivacao: Motivacao;

    @IsNotEmpty()
    @IsString()
    pontosFortes: string;

    @IsNotEmpty()
    @IsString()
    pontosFracos: string;
    
}

export class AvaliacaoColaboradorMentorDto {
    @IsNotEmpty()
    @IsString()
    @IsUUID()
    idAvaliacao: string;

    @IsNotEmpty()
    @IsNumber()
    nota: number;

    @IsNotEmpty()
    @IsString()
    justificativa: string;
    
    
}

export class Autoavaliação{

    
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