import {
  IsUUID,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

// DTO para criação
export class CreateAssociacaoCriterioCicloDto {
  @IsUUID()
  idCiclo: string;

  @IsUUID()
  idCriterio: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cargo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  trilhaCarreira?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
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
  @IsString()
  @MaxLength(100)
  cargo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  trilhaCarreira?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  unidade?: string;
}