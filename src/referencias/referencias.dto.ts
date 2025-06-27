import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

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