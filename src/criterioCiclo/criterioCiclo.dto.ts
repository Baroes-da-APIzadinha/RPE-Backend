import {
  IsUUID,
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';
import { TRILHAS, CARGOS, UNIDADES } from '../colaborador/colaborador.constants';

// DTO para criação
export class CreateAssociacaoCriterioCicloDto {
  @IsUUID()
  idCiclo: string;

  @IsUUID()
  idCriterio: string;

  @IsOptional()
  @IsEnum(CARGOS)
  cargo?: string;

  @IsOptional()
  @IsEnum(TRILHAS)
  trilhaCarreira?: string;

  @IsOptional()
  @IsEnum(UNIDADES)
  unidade?: string;
}

// DTO para atualização
export class UpdateAssociacaoCriterioCicloDto {
  @IsOptional()
  @IsUUID()
  idCiclo?: string;

  @IsOptional()
  @IsUUID()
  idCriterio?: string;

  @IsOptional()
  @IsEnum(CARGOS)
  cargo?: string;

  @IsOptional()
  @IsEnum(TRILHAS)
  trilhaCarreira?: string;

  @IsOptional()
  @IsEnum(UNIDADES)
  unidade?: string;
}