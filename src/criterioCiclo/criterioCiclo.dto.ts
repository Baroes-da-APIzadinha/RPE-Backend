import {
  IsUUID,
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';
import { TRILHAS, CARGOS, UNIDADES } from '../colaborador/colaborador.constants';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// DTO para criação
export class CreateAssociacaoCriterioCicloDto {
  @ApiProperty({ description: 'ID do ciclo' })
  @IsUUID()
  idCiclo: string;

  @ApiProperty({ description: 'ID do critério' })
  @IsUUID()
  idCriterio: string;

  @ApiPropertyOptional({ description: 'Cargo associado', enum: CARGOS })
  @IsOptional()
  @IsEnum(CARGOS)
  cargo?: string;

  @ApiPropertyOptional({ description: 'Trilha de carreira associada', enum: TRILHAS })
  @IsOptional()
  @IsEnum(TRILHAS)
  trilhaCarreira?: string;

  @ApiPropertyOptional({ description: 'Unidade associada', enum: UNIDADES })
  @IsOptional()
  @IsEnum(UNIDADES)
  unidade?: string;
}

// DTO para atualização
export class UpdateAssociacaoCriterioCicloDto {
  @ApiPropertyOptional({ description: 'ID do ciclo' })
  @IsOptional()
  @IsUUID()
  idCiclo?: string;

  @ApiPropertyOptional({ description: 'ID do critério' })
  @IsOptional()
  @IsUUID()
  idCriterio?: string;

  @ApiPropertyOptional({ description: 'Cargo associado', enum: CARGOS })
  @IsOptional()
  @IsEnum(CARGOS)
  cargo?: string;

  @ApiPropertyOptional({ description: 'Trilha de carreira associada', enum: TRILHAS })
  @IsOptional()
  @IsEnum(TRILHAS)
  trilhaCarreira?: string;

  @ApiPropertyOptional({ description: 'Unidade associada', enum: UNIDADES })
  @IsOptional()
  @IsEnum(UNIDADES)
  unidade?: string;
}