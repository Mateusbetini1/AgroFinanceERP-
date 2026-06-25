import type { Request, Response, NextFunction } from 'express'
import { logger } from '../../config/logger'

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now()

  res.on('finish', () => {
    const durationMs = Date.now() - start
    const entry = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
    }

    if (res.statusCode >= 500) {
      logger.error(entry)
    } else if (res.statusCode >= 400) {
      logger.warn(entry)
    } else {
      logger.info(entry)
    }
  })

  next()
}
