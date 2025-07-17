import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({ description: 'Email do usuário'})
  email: string;
  @ApiProperty({ description: 'Senha do usuário'})
  senha: string;
} 