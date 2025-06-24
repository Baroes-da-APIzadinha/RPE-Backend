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

// DTO para resposta de critério (colaborador)
export class RespostaCriterioColaboradorDto {
  @IsUUID() idCriterio: string;
  @IsInt() @Min(1) @Max(5) nota: number;
  @IsString() @IsOptional() justificativa?: string;
}

// DTO para resposta de critério (gestor)
export class RespostaCriterioGestorDto {
  @IsUUID() idCriterio: string;
  @IsInt() @Min(1) @Max(5) notaGestor: number;
  @IsString() @IsOptional() justificativaGestor?: string;
}

// DTO para preenchimento de autoavaliação
export class PreencherAutoAvaliacaoDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => RespostaCriterioColaboradorDto)
  respostas: RespostaCriterioColaboradorDto[];
}

// DTO para preenchimento de avaliação gestor-liderado
export class PreencherAvaliacaoGestorLideradoDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => RespostaCriterioGestorDto)
  respostasGestor: RespostaCriterioGestorDto[];
}

// DTO para avaliações qualitativas (pares/liderado-gestor)
export class PreencherAvaliacaoQualitativaDto {
  @IsInt() @Min(1) @Max(5) @IsNotEmpty()
  notaGeral: number;

  @IsString() @IsNotEmpty()
  pontosFortes: string;
  
  @IsString() @IsNotEmpty()
  pontosMelhorar: string;
  
  @IsBoolean() @IsNotEmpty()
  trabalhariaNovamente: boolean;
}

// DTOs de criação (mantidos para compatibilidade)
export class CreateAutoAvaliacaoDto {
  @IsUUID()
  @IsNotEmpty({ message: 'O ID do ciclo é obrigatório.' })
  idCiclo: string;

  @IsUUID()
  @IsNotEmpty({ message: 'O ID do colaborador é obrigatório.' })
  idColaborador: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RespostaCriterioColaboradorDto)
  @IsNotEmpty({ message: 'A lista de respostas não pode estar vazia.' })
  respostas: RespostaCriterioColaboradorDto[];
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

  @IsBoolean({ message: 'O campo "trabalharia novamente" deve ser um valor booleano (true/false).' })
  @IsNotEmpty({ message: 'O campo "trabalharia novamente" é obrigatório.' })
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