import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { pilarCriterio } from '@prisma/client';


export class CreateCriterioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nomeCriterio: string;

  @IsString()
  @IsOptional()
  descricao?: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  peso?: number = 1.0;

  @IsBoolean()
  @IsOptional()
  obrigatorio?: boolean = true;

  @IsEnum(pilarCriterio)
  @IsOptional()
  pilar?: pilarCriterio;
}

export class UpdateCriterioDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  nomeCriterio?: string;

  @IsString()
  @IsOptional()
  descricao?: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  peso?: number;

  @IsBoolean()
  @IsOptional()
  obrigatorio?: boolean;

  @IsEnum(pilarCriterio)
  @IsOptional()
  pilar?: pilarCriterio;
}