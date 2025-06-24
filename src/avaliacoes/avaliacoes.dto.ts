import {
  IsBoolean,
  IsEmail,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

// Esta classe representa a resposta para UM ÚNICO critério.
export class RespostaCriterioDto {
  @IsUUID()
  @IsNotEmpty({ message: 'O ID do critério é obrigatório.' })
  idCriterio: string;

  @IsInt()
  @Min(1, { message: 'A nota deve ser no mínimo 1.' })
  @Max(5, { message: 'A nota deve ser no máximo 5.' })
  @IsNotEmpty({ message: 'A nota é obrigatória.' })
  nota: number;

  @IsString()
  @IsOptional() // A justificativa pode ser opcional
  justificativa?: string;
}

// Esta é a classe principal que a sua API vai receber.
export class CreateAutoAvaliacaoDto {
  @IsUUID()
  @IsNotEmpty({ message: 'O ID do ciclo é obrigatório.' })
  idCiclo: string;

  @IsUUID()
  @IsNotEmpty({ message: 'O ID do colaborador é obrigatório.' })
  idColaborador: string;

  @IsArray()
  @ValidateNested({ each: true }) // Valida cada objeto dentro do array
  @Type(() => RespostaCriterioDto)
  @IsNotEmpty({ message: 'A lista de respostas não pode estar vazia.' })
  respostas: RespostaCriterioDto[];
}


export class CreateAvaliacao360Dto {
  @IsUUID()
  @IsNotEmpty({ message: 'O ID do ciclo é obrigatório.' })
  idCiclo: string;
  
  @IsUUID()
  @IsNotEmpty({ message: 'O ID de quem está avaliando (avaliador) é obrigatório.' })
  idAvaliador: string;

  @IsEmail({}, { message: 'O email do avaliado deve ser um email válido.'})
  @IsNotEmpty({ message: 'O email do colaborador avaliado é obrigatório.' })
  emailAvaliado: string;

  @IsUUID()
  @IsNotEmpty({ message: 'O ID do projeto em que trabalharam juntos é obrigatório.'})
  idProjeto: string;

  @IsString()
  @IsNotEmpty({ message: 'O campo "tempo juntos" é obrigatório.'})
  tempoJuntos: string;

  @IsBoolean({ message: 'O campo "trabalharia novamente" deve ser um valor booleano (true/false).'})
  @IsNotEmpty({ message: 'O campo "trabalharia novamente" é obrigatório.'})
  trabalhariaNovamente: boolean;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsNotEmpty({ message: 'A nota geral é obrigatória.'})
  notaGeral: number;

  @IsString()
  @IsOptional()
  pontosFortes?: string;

  @IsString()
  @IsOptional()
  pontosMelhorar?: string;
}