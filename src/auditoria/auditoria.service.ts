import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prismaService';

@Injectable()
export class AuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    userId?: string;
    action: string;
    resource: string;
    details?: any;
    ip?: string;
  }) {
    const { userId, action, resource, details, ip } = params;
    return this.prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        details,
        ip,
      },
    });
  }

  async getLogs(filters: { userId?: string; action?: string; resource?: string }) {
    const { userId, action, resource } = filters;
    return this.prisma.auditLog.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(action ? { action } : {}),
        ...(resource ? { resource } : {}),
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  async getLogsPaginacao(inicio: number, fim?: number) {
    const skip = inicio;
    const take = fim ? fim - inicio : undefined;

    const logs = await this.prisma.auditLog.findMany({
      skip,
      take,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    return {
      logs: logs.map(log => ({
        dataHora: log.timestamp,
        usuario: log.user?.email || 'Sistema',
        acao: log.action,
        endpoint: log.resource,
      })),
    };
  }

  async getAllUsers() {
    const users = await this.prisma.colaborador.findMany({
      select: {
        idColaborador: true,
        nomeCompleto: true,
        email: true,
        cargo: true,
        trilhaCarreira: true,
        unidade: true,
        perfis: {
          select: {
            tipoPerfil: true,
          },
        },
      },
    });

    return {
      users: users.map(user => ({
        idColaborador: user.idColaborador,
        nome: user.nomeCompleto,
        cargos: user.perfis.map(perfil => perfil.tipoPerfil),
        email: user.email,
        trilha: user.trilhaCarreira || '',
        unidade: user.unidade || '',
      })),
    };
  }
}