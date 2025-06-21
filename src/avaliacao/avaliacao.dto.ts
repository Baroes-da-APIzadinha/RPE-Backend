import { IsNotEmpty, IsString, IsUUID, IsEnum, IsInt, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { avaliacaoTipo, preenchimentoStatus } from '@prisma/client';

export class DetalheAvaliacaoDto {
  @IsUUID()
  idCriterio: string;

  @IsInt()
  nota: number;

  @IsString()
  justificativa: string;
}

export class CreateAvaliacaoDto {
  @IsUUID()
  idCiclo: string;

  @IsUUID()
  idAvaliador: string;

  @IsUUID()
  idAvaliado: string;

  @IsEnum(avaliacaoTipo)
  tipo: avaliacaoTipo;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalheAvaliacaoDto)
  detalhes: DetalheAvaliacaoDto[];
}

export class AvaliacaoResponseDto {
  idAvaliacao: string;
  idCiclo: string;
  idAvaliador: string;
  idAvaliado: string;
  tipo: avaliacaoTipo;
  status: preenchimentoStatus;
  dataPreenchimento: Date;
  detalhes: DetalheAvaliacaoDto[];
} 