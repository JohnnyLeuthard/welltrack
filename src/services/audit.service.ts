import { AuditAction, Prisma } from '@prisma/client';
import prisma from '../lib/prisma';

export { AuditAction };

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export async function recordAuditEvent(
  userId: string,
  action: AuditAction,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await prisma.auditLog.create({
    data: { userId, action, metadata: (metadata as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull },
  });
}

export async function getAuditLog(userId: string): Promise<AuditLogEntry[]> {
  const rows = await prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, action: true, metadata: true, createdAt: true },
  });

  return rows.map((r) => ({
    ...r,
    metadata: r.metadata as Record<string, unknown> | null,
  }));
}
