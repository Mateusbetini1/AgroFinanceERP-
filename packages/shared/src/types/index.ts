import type { MembershipRole } from '../enums'

export interface AuthenticatedUser {
  id: string
  email: string
}

export interface CompanyContext {
  id: string
  name: string
}

export interface MembershipContext {
  role: MembershipRole
}

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

export interface ApiResponse<T = undefined> {
  success: boolean
  data?: T
  message?: string
}

export interface DateRangeFilter {
  startDate?: string
  endDate?: string
}

export interface MonthYearFilter {
  month?: number
  year?: number
}
