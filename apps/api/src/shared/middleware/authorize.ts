import type { Request, Response, NextFunction } from 'express'
import { MembershipRole } from '@agrofinance/database'
import { AppError } from '../errors/AppError'

// Hierarquia de roles: OWNER > ADMIN > FINANCIAL > AGRONOMIST > VIEWER
const ROLE_HIERARCHY: Record<MembershipRole, number> = {
  [MembershipRole.OWNER]: 100,
  [MembershipRole.ADMIN]: 80,
  [MembershipRole.FINANCIAL]: 60,
  [MembershipRole.AGRONOMIST]: 40,
  [MembershipRole.VIEWER]: 20,
}

// Middleware de autorização baseado em role.
// Uso: authorize([MembershipRole.OWNER, MembershipRole.ADMIN])
// Requer authenticate + requireCompany antes.
export function authorize(allowedRoles: MembershipRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.membership) {
      next(AppError.forbidden())
      return
    }

    const userRoleLevel = ROLE_HIERARCHY[req.membership.role]
    const hasAccess = allowedRoles.some(
      (role) => ROLE_HIERARCHY[role] <= userRoleLevel,
    )

    if (!hasAccess) {
      next(
        AppError.forbidden(
          `Permissão insuficiente. Necessário: ${allowedRoles.join(' ou ')}`,
        ),
      )
      return
    }

    next()
  }
}

// Shortcut: apenas OWNER e ADMIN
export const adminOnly = authorize([MembershipRole.OWNER, MembershipRole.ADMIN])

// Shortcut: OWNER, ADMIN e FINANCIAL
export const financialAccess = authorize([
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
  MembershipRole.FINANCIAL,
])

// Shortcut: qualquer membro autenticado na empresa
export const anyMember = authorize([
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
  MembershipRole.FINANCIAL,
  MembershipRole.AGRONOMIST,
  MembershipRole.VIEWER,
])
