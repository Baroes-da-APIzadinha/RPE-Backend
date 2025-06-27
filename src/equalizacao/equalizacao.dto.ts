import { IsNotEmpty, IsUUID, IsInt, IsString, Min, Max, IsOptional, IsEnum, IsDecimal } from 'class-validator';
import { preenchimentoStatus } from '@prisma/client';

export class CreateEqualizacaoDto {
  @IsUUID()
  @IsNotEmpty()
  idCiclo: string;
}

export class UpdateEqualizacaoDto {
  @IsDecimal()
  @IsNotEmpty()
  notaAjustada: number;

  @IsString()
  @IsNotEmpty()
  justificativa: string;

  @IsEnum(preenchimentoStatus)
  @IsOptional()
  status?: preenchimentoStatus;
}