import { IsNotEmpty, IsString, IsUUID, MaxLength, IsOptional, IsEnum } from 'class-validator';
import { TipoReferencia } from './referencias.constants';


export class CriarReferenciaDto {
  @IsUUID()
  @IsNotEmpty()
  idCiclo: string;

  @IsUUID()
  @IsNotEmpty()
  idIndicador: string;

  @IsUUID()
  @IsNotEmpty()
  idIndicado: string;

  @IsEnum(TipoReferencia)
  @IsNotEmpty()
  tipo: string; // 'TECNICA' ou 'CULTURAL'

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  justificativa: string;
}

export class AtualizarReferenciaDto {
  @IsEnum(TipoReferencia)
  @IsNotEmpty()
  tipo: string; // 'TECNICA' ou 'CULTURAL'

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  justificativa?: string;
} 