import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import type { AuditAction } from '@agrofinance/shared'

interface AuditContext {
  action: AuditAction
  entityType: string
  entityId: string
  before?: unknown
  after?: unknown
}

// Função utilitária para registrar no audit log a partir de qualquer service.
// Uso: await writeAuditLog(req, { action: 'CREATE', entityType: 'Revenue', entityId: id, after: data })
export async function writeAuditLog(
  req: Request,
  context: AuditContext,
): Promise<void> {
  if (!req.user) return

  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        companyId: req.company?.id,
        action: context.action,
        entityType: context.entityType,
        entityId: context.entityId,
        before: context.before ? JSON.parse(JSON.stringify(context.before)) : undefined,
        after: context.after ? JSON.parse(JSON.stringify(context.after)) : undefined,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    })
  } catch (error) {
    // Audit log nunca deve bloquear a operação principal
    console.error('[AuditLog] Falha ao registrar:', error)
  }
}
