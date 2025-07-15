import { IsNotEmpty, IsString, IsUUID, MaxLength, IsOptional, IsEnum } from 'class-validator';
import { TipoReferencia } from './referencias.constants';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';


export class CriarReferenciaDto {
  @ApiProperty({ description: 'ID do ciclo' })
  @IsUUID()
  @IsNotEmpty()
  idCiclo: string;

  @ApiProperty({ description: 'ID do indicador' })
  @IsUUID()
  @IsNotEmpty()
  idIndicador: string;

  @ApiProperty({ description: 'ID do indicado' })
  @IsUUID()
  @IsNotEmpty()
  idIndicado: string;

  @ApiProperty({ description: 'Tipo de referência', enum: TipoReferencia})
  @IsEnum(TipoReferencia)
  @IsNotEmpty()
  tipo: string; // 'TECNICA' ou 'CULTURAL'

  @ApiProperty({ description: 'Justificativa da referência' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  justificativa: string;
}

export class AtualizarReferenciaDto {
  @ApiProperty({ description: 'Tipo de referência', enum: TipoReferencia })
  @IsEnum(TipoReferencia)
  @IsNotEmpty()
  tipo: string; // 'TECNICA' ou 'CULTURAL'

  @ApiPropertyOptional({ description: 'Justificativa da referência' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  justificativa?: string;
} 