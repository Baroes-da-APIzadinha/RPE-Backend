// src/reminders/dto/reminder.dto.ts
import { IsString, IsOptional, IsPositive, IsInt, Min, Max, IsUUID } from 'class-validator';

export class SetReminderDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Min(60) // mínimo 1 minuto
  @Max(86400) // máximo 24 horas
  ttlSeconds?: number = 3600;
}

export class ColaboradorParamDto {
  @IsUUID()
  idColaborador: string;
}
