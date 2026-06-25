import type { PaginationMeta, PaginatedResponse } from '@agrofinance/shared'

export interface PaginationOptions {
  page: number
  limit: number
}

export function getPaginationArgs(options: PaginationOptions) {
  const { page, limit } = options
  return {
    skip: (page - 1) * limit,
    take: limit,
  }
}

export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  options: PaginationOptions,
): PaginatedResponse<T> {
  const { page, limit } = options
  const meta: PaginationMeta = {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
  return { data, meta }
}
