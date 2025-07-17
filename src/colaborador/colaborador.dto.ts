import { IsNotEmpty, IsString, IsOptional, IsUUID, IsEnum, IsBoolean, MinLength } from 'class-validator';
import { TRILHAS, CARGOS, UNIDADES } from './colaborador.constants';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateColaboradorDto {
    @ApiProperty({description: 'Nome completo do colaborador'})
    @IsNotEmpty()
    @IsString()
    nomeCompleto: string;

    @ApiProperty({description: 'Email do colaborador'})
    @IsNotEmpty()
    @IsString()
    email: string;

    @ApiProperty({description: 'Senha do colaborador'})
    @IsNotEmpty()
    @IsString()
    senha: string;

    @ApiPropertyOptional({description: 'Se o colaborador é um administrador'})
    @IsOptional()
    @IsBoolean()
    admin?: boolean;

    @ApiPropertyOptional({description: 'Se o colaborador é um colaborador comum'})
    @IsOptional()
    @IsBoolean()
    colaboradorComum?: boolean;

    @ApiPropertyOptional({description: 'Se o colaborador é um gestor'})
    @IsOptional()
    @IsBoolean()
    gestor?: boolean;

    @ApiPropertyOptional({description: 'Se o colaborador é um mentor'})
    @IsOptional()
    @IsBoolean()
    mentor?: boolean;

    @ApiPropertyOptional({description: 'Se o colaborador é um líder'})
    @IsOptional()
    @IsBoolean()
    lider?: boolean;

    @ApiPropertyOptional({description: 'Se o colaborador é um RH'})
    @IsOptional()
    @IsBoolean()
    rh?: boolean;

    @ApiPropertyOptional({description: 'Se o colaborador é um membro do comitê'})
    @IsOptional()
    @IsBoolean()
    membroComite?: boolean;

    @ApiPropertyOptional({description: 'Trilha de carreira do colaborador', enum: TRILHAS})
    @IsOptional()
    @IsString()
    @IsEnum(TRILHAS)
    trilhaCarreira?: string;

    @ApiPropertyOptional({description: 'Unidade do colaborador', enum: UNIDADES})
    @IsOptional()
    @IsString()
    @IsEnum(UNIDADES)
    unidade?: string;

    @ApiPropertyOptional({description: 'Cargo do colaborador', enum: CARGOS})
    @IsOptional()
    @IsString()
    @IsEnum(CARGOS)
    cargo?: string;

    @ApiPropertyOptional({description: 'Indica se é o primeiro login do colaborador'})
    @IsOptional()
    @IsBoolean()
    primeiroLogin?: boolean;
}

export class UpdateColaboradorDto {
    @ApiPropertyOptional({description: 'Nome completo do colaborador'})
    @IsOptional()
    @IsString()
    nomeCompleto?: string;

    @ApiPropertyOptional({description: 'Email do colaborador'})
    @IsOptional()
    @IsString()
    email?: string;

    @ApiPropertyOptional({description: 'Senha do colaborador'})
    @IsOptional()
    @IsString()
    senha?: string;

    @ApiPropertyOptional({description: 'Cargo do colaborador', enum: CARGOS})
    @IsOptional()
    @IsString()
    @IsEnum(CARGOS)
    cargo?: string;

    @ApiPropertyOptional({description: 'Trilha de carreira do colaborador', enum: TRILHAS})
    @IsOptional()
    @IsString()
    @IsEnum(TRILHAS)
    trilhaCarreira?: string;

    @ApiPropertyOptional({description: 'Unidade do colaborador', enum: UNIDADES})
    @IsOptional()
    @IsString()
    @IsEnum(UNIDADES)
    unidade?: string;

    @ApiPropertyOptional({description: 'Indica se é o primeiro login do colaborador'})
    @IsOptional()
    @IsBoolean()
    primeiroLogin?: boolean;
}

export class AssociatePerfilDto {
    @ApiProperty({description: 'ID do colaborador'})
    @IsNotEmpty()
    @IsUUID()
    idColaborador: string;

    @ApiProperty({description: 'Tipo de perfil a ser associado', enum: ['ADMIN', 'COLABORADOR_COMUM', 'GESTOR', 'LIDER', 'MENTOR', 'RH', 'MEMBRO_COMITE']})
    @IsNotEmpty()
    @IsString()
    tipoPerfil: string;
}

export class TrocarSenhaDto {
    @ApiProperty({description: 'Senha atual do colaborador'})
    @IsString()
    senhaAtual: string;

    @ApiProperty({description: 'Nova senha do colaborador'})
    @IsString()
    @MinLength(6)
    novaSenha: string;
    
}