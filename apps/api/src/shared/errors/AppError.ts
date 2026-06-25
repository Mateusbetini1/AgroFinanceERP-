export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST') {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    Object.setPrototypeOf(this, AppError.prototype)
  }

  static badRequest(message: string, code = 'BAD_REQUEST'): AppError {
    return new AppError(message, 400, code)
  }

  static unauthorized(message = 'Não autorizado'): AppError {
    return new AppError(message, 401, 'UNAUTHORIZED')
  }

  static forbidden(message = 'Acesso negado'): AppError {
    return new AppError(message, 403, 'FORBIDDEN')
  }

  static notFound(resource: string): AppError {
    return new AppError(`${resource} não encontrado`, 404, 'NOT_FOUND')
  }

  static conflict(message: string): AppError {
    return new AppError(message, 409, 'CONFLICT')
  }

  static unprocessable(message: string): AppError {
    return new AppError(message, 422, 'UNPROCESSABLE')
  }

  static internal(message = 'Erro interno do servidor'): AppError {
    return new AppError(message, 500, 'INTERNAL_ERROR')
  }
}
