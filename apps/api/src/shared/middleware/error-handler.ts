import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '@agrofinance/database'
import { AppError } from '../errors/AppError'
import { logger } from '../../config/logger'

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Erros de negócio tratados — retornar exatamente como modelados
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
    })
    return
  }

  // Erros de validação Zod
  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Dados inválidos',
      errors: err.flatten().fieldErrors,
    })
    return
  }

  // Erros conhecidos do Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        success: false,
        code: 'CONFLICT',
        message: 'Registro já existe com esses dados',
      })
      return
    }

    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Registro não encontrado',
      })
      return
    }
  }

  // Erros não tratados — logar e retornar genérico (nunca expor detalhes em produção)
  logger.error(
    { err, path: req.path, method: req.method },
    'Unhandled Error',
  )

  res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: 'Erro interno do servidor',
  })
}
