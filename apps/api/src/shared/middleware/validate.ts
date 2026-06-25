import type { Request, Response, NextFunction, RequestHandler } from 'express'
import type { ZodSchema } from 'zod'

type ValidationTarget = 'body' | 'query' | 'params'

// Middleware de validação com Zod.
// Mutaciona req[target] com os dados parseados (coerção de tipos aplicada).
export function validate(schema: ZodSchema, target: ValidationTarget = 'body'): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target])

    if (!result.success) {
      next(result.error)
      return
    }

    // Substituir com dados coercidos/transformados pelo Zod
    ;(req as unknown as Record<string, unknown>)[target] = result.data
    next()
  }
}
