import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env'
import { AppError } from '../errors/AppError'

interface AccessTokenPayload {
  sub: string
  email: string
  iat: number
  exp: number
}

// Middleware de autenticação. Valida o JWT e popula req.user.
// Deve ser aplicado antes de qualquer middleware que precise do usuário.
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    next(AppError.unauthorized('Token de acesso não fornecido'))
    return
  }

  const token = authHeader.slice(7)

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload
    req.user = { id: payload.sub, email: payload.email }
    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(AppError.unauthorized('Token expirado'))
      return
    }
    next(AppError.unauthorized('Token inválido'))
  }
}
