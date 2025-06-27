import { IsNotEmpty, IsString } from "class-validator";
import { IsNumber } from "class-validator";
import { Motivacao } from "./avaliacoes.contants";

export class AvaliacaoParesDto {
    @IsNotEmpty()
    @IsString()
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
    idAvaliacao: string;

    @IsNotEmpty()
    @IsNumber()
    nota: number;

    @IsNotEmpty()
    @IsString()
    justificativa: string;
    
    
}