import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { projetoStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjetoDto {
  @ApiProperty({ description: 'Nome do projeto' })
  @IsString()
  @IsNotEmpty({ message: 'O nome do projeto é obrigatório.' })
  nomeProjeto: string;

  @ApiPropertyOptional({ description: 'Cliente do projeto' })
  @IsString()
  @IsOptional()
  cliente?: string;

  @ApiPropertyOptional({ description: 'Data de início do projeto'})
  @IsDateString()
  @IsOptional()
  dataInicio?: string;

  @ApiPropertyOptional({ description: 'Data de término do projeto' })
  @IsDateString()
  @IsOptional()
  dataFim?: string;

  @ApiPropertyOptional({ description: 'Status do projeto', enum: projetoStatus })
  @IsEnum(projetoStatus)
  @IsOptional()
  status?: projetoStatus;
}

export class UpdateProjetoDto {
  @ApiPropertyOptional({ description: 'Nome do projeto' })
  @IsString()
  @IsOptional()
  nomeProjeto?: string;

  @ApiPropertyOptional({ description: 'Cliente do projeto' })
  @IsString()
  @IsOptional()
  cliente?: string;

  @ApiPropertyOptional({ description: 'Data de início do projeto' })
  @IsDateString()
  @IsOptional()
  dataInicio?: string;

  @ApiPropertyOptional({ description: 'Data de término do projeto' })
  @IsDateString()
  @IsOptional()
  dataFim?: string;

  @ApiPropertyOptional({ description: 'Status do projeto', enum: projetoStatus })
  @IsEnum(projetoStatus)
  @IsOptional()
  status?: projetoStatus;
}
