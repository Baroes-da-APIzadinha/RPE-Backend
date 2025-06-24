import { IsNotEmpty, IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';

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
    cargo?: string;

    @IsOptional()
    @IsString()
    trilhaCarreira?: string;

    @IsOptional()
    @IsString()
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
    cargo?: string;

    @IsOptional()
    @IsString()
    trilhaCarreira?: string;

    @IsOptional()
    @IsString()
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