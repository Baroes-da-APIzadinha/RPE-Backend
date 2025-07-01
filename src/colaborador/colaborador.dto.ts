import { IsNotEmpty, IsString, IsOptional, IsUUID, IsEnum, IsBoolean } from 'class-validator';
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
    @IsBoolean()
    admin?: boolean;

    @IsOptional()
    @IsBoolean()
    colaboradorComum?: boolean;

    @IsOptional()
    @IsBoolean()
    gestor?: boolean;

    @IsOptional()
    @IsBoolean()
    mentor?: boolean;

    @IsOptional()
    @IsBoolean()
    lider?: boolean;

    @IsOptional()
    @IsBoolean()
    rh?: boolean;

    @IsOptional()
    @IsBoolean()
    membroComite?: boolean;

    @IsOptional()
    @IsString()
    @IsEnum(TRILHAS)
    trilhaCarreira?: string;

    @IsOptional()
    @IsString()
    @IsEnum(UNIDADES)
    unidade?: string;

    @IsOptional()
    @IsString()
    @IsEnum(CARGOS)
    cargo?: string;
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