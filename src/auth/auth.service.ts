import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prismaService';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async login(loginDto: LoginDto): Promise<string | null> {
    const user = await this.prisma.colaborador.findUnique({
      where: { email: loginDto.email },
      include: { perfis: true },
    });
    if (!user || !(await bcrypt.compare(loginDto.senha, user.senha))) {
      return null;
    }
    const roles = user.perfis.map((perfil) => perfil.tipoPerfil);
    const payload = { sub: user.idColaborador, email: user.email, roles };
    return this.jwtService.sign(payload);
  }
} 