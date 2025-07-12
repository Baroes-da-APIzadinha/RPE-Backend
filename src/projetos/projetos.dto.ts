import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { projetoStatus } from '@prisma/client';

export class CreateProjetoDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome do projeto é obrigatório.' })
  nomeProjeto: string;

  @IsString()
  @IsOptional()
  cliente?: string;

  @IsDateString()
  @IsOptional()
  dataInicio?: string;

  @IsDateString()
  @IsOptional()
  dataFim?: string;

  @IsEnum(projetoStatus)
  @IsOptional()
  status?: projetoStatus;
}

export class UpdateProjetoDto {
  @IsString()
  @IsOptional()
  nomeProjeto?: string;

  @IsString()
  @IsOptional()
  cliente?: string;

  @IsDateString()
  @IsOptional()
  dataInicio?: string;

  @IsDateString()
  @IsOptional()
  dataFim?: string;

  @IsEnum(projetoStatus)
  @IsOptional()
  status?: projetoStatus;
}
