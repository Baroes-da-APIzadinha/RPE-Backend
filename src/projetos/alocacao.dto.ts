import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsDateString, IsUUID } from 'class-validator';

export class CreateAlocacaoDto {
  @ApiProperty({ description: 'ID do colaborador' })
  @IsUUID()
  @IsNotEmpty({ message: 'O ID do colaborador é obrigatório.' })
  idColaborador: string;

  @ApiProperty({ description: 'Data de entrada do colaborador' })
  @IsDateString({}, { message: 'A data de entrada deve ser uma data válida.' })
  @IsNotEmpty({ message: 'A data de entrada é obrigatória.' })
  dataEntrada: string;

  @ApiPropertyOptional({ description: 'Data de saída do colaborador' })
  @IsDateString({}, { message: 'A data de saída deve ser uma data válida.' })
  @IsOptional()
  dataSaida?: string;
}

export class UpdateAlocacaoDto {
  @ApiPropertyOptional({ description: 'Data de entrada do colaborador' })
  @IsDateString({}, { message: 'A data de entrada deve ser uma data válida.' })
  @IsOptional()
  dataEntrada?: string;

  @ApiPropertyOptional({ description: 'Data de saída do colaborador' })
  @IsDateString({}, { message: 'A data de saída deve ser uma data válida.' })
  @IsOptional()
  dataSaida?: string;
}
