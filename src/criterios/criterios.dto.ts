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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';


export class CreateCriterioDto {
  @ApiProperty({description: 'Nome do critério'})
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nomeCriterio: string;

  @ApiPropertyOptional({description: 'Descrição do critério'})
  @IsString()
  @IsOptional()
  descricao?: string;

  @ApiPropertyOptional({description: 'Peso do critério', default: 1.0})
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  peso?: number = 1.0;
  
  @ApiPropertyOptional({description: 'Indica se o critério é obrigatório', default: true})
  @IsBoolean()
  @IsOptional()
  obrigatorio?: boolean = true;

  @ApiPropertyOptional({description: 'Pilar do critério', enum: pilarCriterio})
  @IsEnum(pilarCriterio)
  @IsOptional()
  pilar?: pilarCriterio;
}

export class UpdateCriterioDto {
  @ApiPropertyOptional({description: 'Nome do critério'})
  @IsString()
  @IsOptional()
  @MaxLength(255)
  nomeCriterio?: string;

  @ApiPropertyOptional({description: 'Descrição do critério'})
  @IsString()
  @IsOptional()
  descricao?: string;

  @ApiPropertyOptional({description: 'Peso do critério'})
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  peso?: number;

  @ApiPropertyOptional({description: 'Indica se o critério é obrigatório'})
  @IsBoolean()
  @IsOptional()
  obrigatorio?: boolean;
  
  @ApiPropertyOptional({description: 'Pilar do critério', enum: pilarCriterio})
  @IsEnum(pilarCriterio)
  @IsOptional()
  pilar?: pilarCriterio;
}