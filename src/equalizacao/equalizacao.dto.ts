import { IsNotEmpty, IsUUID, IsInt, IsString, Min, Max, IsOptional, IsEnum, IsDecimal } from 'class-validator';
import { preenchimentoStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEqualizacaoDto {
  @ApiProperty({ description: 'ID do ciclo'})
  @IsUUID()
  @IsNotEmpty()
  idCiclo: string;
}

export class UpdateEqualizacaoDto {
  @ApiProperty({ description: 'Nota da equalização' })
  @IsDecimal()
  @IsNotEmpty()
  notaAjustada: number;

  @ApiProperty({ description: 'justificativa para a nota' })
  @IsString()
  @IsNotEmpty()
  justificativa: string;

  @ApiPropertyOptional({ description: 'status de preenchimento', enum: preenchimentoStatus })
  @IsEnum(preenchimentoStatus)
  @IsOptional()
  status?: preenchimentoStatus;
}