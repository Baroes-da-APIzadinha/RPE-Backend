import { IsNotEmpty, IsString, IsUUID, MaxLength, IsOptional } from 'class-validator';

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

  @IsString()
  @IsNotEmpty()
  tipo: string; // 'TECNICA' ou 'CULTURAL'

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  justificativa: string;
}

export class AtualizarReferenciaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tipo?: string; // 'TECNICA' ou 'CULTURAL'

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  justificativa?: string;
} 