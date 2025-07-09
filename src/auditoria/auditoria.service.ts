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
}