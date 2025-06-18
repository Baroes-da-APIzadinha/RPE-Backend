import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { cicloStatus } from "@prisma/client";

export class CreateCicloDto {
    @IsNotEmpty()
    @IsString()
    nome: string;

    @IsNotEmpty()
    @IsString()
    dataInicio: string;

    @IsNotEmpty()
    @IsString()
    dataFim: string;

    @IsNotEmpty()
    @IsString()
    status: cicloStatus;
}

export class UpdateCicloDto {

    @IsOptional()
    @IsString()
    dataInicio: string;

    @IsOptional()
    @IsString()
    dataFim: string;

    @IsOptional()
    @IsString()
    status: cicloStatus;
}
