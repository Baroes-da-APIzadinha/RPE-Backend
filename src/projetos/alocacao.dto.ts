import { IsNotEmpty, IsOptional, IsDateString, IsUUID } from 'class-validator';

export class CreateAlocacaoDto {
  @IsUUID()
  @IsNotEmpty({ message: 'O ID do colaborador é obrigatório.' })
  idColaborador: string;

  @IsDateString({}, { message: 'A data de entrada deve ser uma data válida.' })
  @IsNotEmpty({ message: 'A data de entrada é obrigatória.' })
  dataEntrada: string;

  @IsDateString({}, { message: 'A data de saída deve ser uma data válida.' })
  @IsOptional()
  dataSaida?: string;
}

export class UpdateAlocacaoDto {
  @IsDateString({}, { message: 'A data de entrada deve ser uma data válida.' })
  @IsOptional()
  dataEntrada?: string;

  @IsDateString({}, { message: 'A data de saída deve ser uma data válida.' })
  @IsOptional()
  dataSaida?: string;
}
