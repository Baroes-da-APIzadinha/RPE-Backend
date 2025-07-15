import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { IsNumber } from "class-validator";
import { Motivacao, Status } from "./avaliacoes.constants";
import { IsArray, ValidateNested, IsOptional, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AvaliacaoParesDto {

    @ApiProperty({ description: 'ID da avaliação' })
    @IsNotEmpty()
    @IsString()
    @IsUUID()
    idAvaliacao: string;

    @ApiProperty({ description: 'Status da avaliação' })
    @IsNotEmpty()
    @IsEnum(Status)
    status : Status;

    @ApiPropertyOptional({ description: 'Nota da avaliação' })
    @IsOptional()
    @IsNumber()
    nota?: number;

    @ApiPropertyOptional({ description: 'Motivação da nota', enum: Motivacao })
    @IsOptional()
    @IsEnum(Motivacao)
    motivacao?: Motivacao;

    @ApiPropertyOptional({ description: 'Pontos fortes identificados' })
    @IsOptional()
    @IsString()
    pontosFortes?: string;

    @ApiPropertyOptional({ description: 'Pontos fracos identificados' })
    @IsOptional()
    @IsString()
    pontosFracos?: string;
    
}

export class AvaliacaoColaboradorMentorDto {
    @ApiProperty({ description: 'ID da avaliação' })
    @IsNotEmpty()
    @IsString()
    idAvaliacao: string;

    @ApiProperty({ description: 'Status da avaliação', enum: Status })
    @IsNotEmpty()
    @IsEnum(Status)
    status : Status

    @ApiPropertyOptional({ description: 'Nota da avaliação' })
    @IsOptional()
    @IsNumber()
    nota?: number;

    @ApiPropertyOptional({ description: 'Justificativa da nota' })
    @IsOptional()
    @IsString()
    justificativa?: string;
    
}

export class CriterioAutoAvaliacaoDto {
    @ApiProperty({ description: 'Nome do critério' })
    @IsString()
    nome: string;

    @ApiProperty({ description: 'Nota do critério' })
    @IsNumber()
    @Min(0)
    @Max(5)
    nota: number;

    @ApiProperty({ description: 'Justificativa da nota'})
    @IsString()
    justificativa: string;
}

export class PreencherAuto_ou_Lider_Dto {
    @ApiProperty({ description: 'ID da avaliação' })
    @IsString()
    @IsUUID()
    idAvaliacao: string;

    @ApiProperty({ description: 'Critérios de avaliação' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CriterioAutoAvaliacaoDto)
    criterios: CriterioAutoAvaliacaoDto[];
}

export class LideradoDto {
  @ApiProperty()
  @IsString()
  idColaborador: string;

  @ApiProperty()
  @IsString()
  nomeCompleto: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cargo: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  notaAutoavaliacao: string | number | null;

  @ApiPropertyOptional()
  @IsOptional()
  notaLider: string | number | null;

  @ApiProperty({ enum: Status })
  @IsEnum(Status)
  statusAutoavaliacao: Status;

  @ApiProperty({ enum: Status })
  @IsEnum(Status)
  statusAvaliacao360: Status;
}

export class AvaliadorDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  nomeLider: string;
}

export class LideradosPorCicloResponseDto {
  @ApiProperty({ type: () => AvaliadorDto })
  avaliador: AvaliadorDto;

  @ApiProperty({ type: [LideradoDto] })
  liderados: LideradoDto[];
}