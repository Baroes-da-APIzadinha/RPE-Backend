import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prismaService';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async login(loginDto: LoginDto, ip?: string): Promise<string | null> {
    const user = await this.prisma.colaborador.findUnique({
      where: { email: loginDto.email },
      include: { perfis: true },
    });
    if (!user || !(await bcrypt.compare(loginDto.senha, user.senha))) {
      await this.auditoriaService.log({
        userId: user?.idColaborador,
        action: 'login_failed',
        resource: 'Auth',
        details: { email: loginDto.email },
        ip,
      });
      return null;
    }
    const roles = user.perfis.map((perfil) => perfil.tipoPerfil);
    const payload = { sub: user.idColaborador, email: user.email, roles };
    const token = this.jwtService.sign(payload);
    await this.auditoriaService.log({
      userId: user.idColaborador,
      action: 'login_success',
      resource: 'Auth',
      details: { email: user.email },
      ip,
    });
    return token;
  }
} 