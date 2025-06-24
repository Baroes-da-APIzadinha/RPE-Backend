import { IsNotEmpty, IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { TRILHAS, CARGOS, UNIDADES } from './colaborador.constants';

export class CreateColaboradorDto {
    @IsNotEmpty()
    @IsString()
    nomeCompleto: string;

    @IsNotEmpty()
    @IsString()
    email: string;

    @IsNotEmpty()
    @IsString()
    senha: string;

    @IsOptional()
    @IsString()
    @IsEnum(CARGOS)
    cargo?: string;

    @IsOptional()
    @IsString()
    @IsEnum(TRILHAS)
    trilhaCarreira?: string;

    @IsOptional()
    @IsString()
    @IsEnum(UNIDADES)
    unidade?: string;
}

export class UpdateColaboradorDto {
    @IsOptional()
    @IsString()
    nomeCompleto?: string;

    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsString()
    senha?: string;

    @IsOptional()
    @IsString()
    @IsEnum(CARGOS)
    cargo?: string;

    @IsOptional()
    @IsString()
    @IsEnum(TRILHAS)
    trilhaCarreira?: string;

    @IsOptional()
    @IsString()
    @IsEnum(UNIDADES)
    unidade?: string;
}

export class AssociatePerfilDto {
    @IsNotEmpty()
    @IsUUID()
    idColaborador: string;

    @IsNotEmpty()
    @IsString()
    tipoPerfil: string;
}