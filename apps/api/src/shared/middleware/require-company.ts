import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { AppError } from '../errors/AppError'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Middleware que resolve e valida o contexto de empresa da requisição.
// Requer authenticate antes dele na cadeia.
// O companyId vem do header x-company-id e deve ser um UUID válido.
// Popula req.company e req.membership após validar a membership ativa.
export async function requireCompany(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const companyId = req.headers['x-company-id'] as string | undefined

  if (!companyId) {
    next(AppError.badRequest('Header x-company-id é obrigatório', 'MISSING_COMPANY_HEADER'))
    return
  }

  if (!UUID_REGEX.test(companyId)) {
    next(AppError.badRequest('Header x-company-id deve ser um UUID válido', 'INVALID_COMPANY_ID'))
    return
  }

  if (!req.user) {
    next(AppError.unauthorized())
    return
  }

  const membership = await prisma.membership.findUnique({
    where: {
      companyId_userId: {
        companyId,
        userId: req.user.id,
      },
    },
    select: {
      active: true,
      role: true,
      company: {
        select: {
          id: true,
          name: true,
          active: true,
          deletedAt: true,
        },
      },
    },
  })

  if (!membership || !membership.active) {
    next(AppError.forbidden('Você não tem acesso a esta empresa'))
    return
  }

  if (!membership.company.active || membership.company.deletedAt) {
    next(AppError.forbidden('Empresa inativa ou desativada'))
    return
  }

  req.company = { id: companyId, name: membership.company.name }
  req.membership = { role: membership.role }
  next()
}
