import type { SafraStatus } from '@/types/api'

export interface SafraReportSummary {
  safraId: string
  safraName: string
  product: { id: string; name: string; unit: string | null }
  farmLocation: { id: string; name: string; type: string } | null
  status: SafraStatus
  startDate: string
  endDate: string | null
  estimatedYield: number | null
  receivedRevenue: number
  pendingRevenue: number
  totalRevenue: number
  paidExpenses: number
  pendingExpenses: number
  totalExpenses: number
  realizedResult: number
  projectedResult: number
  costPerEstimatedUnit: number | null
  revenuePerEstimatedUnit: number | null
  resultPerEstimatedUnit: number | null
  revenueTotal?: number
  expenseTotal?: number
  result?: number
}

export interface SafraReportFilters {
  safraId?: string
  productId?: string
  farmLocationId?: string
  status?: SafraStatus
  dateFrom?: string
  dateTo?: string
  search?: string
}

export interface SafraExpenseByCategory {
  categoryId: string
  categoryName: string
  paidAmount: number
  pendingAmount: number
  totalAmount: number
}

export interface SafraRevenueByProductClient {
  productId: string
  productName: string
  client: string | null
  receivedAmount: number
  pendingAmount: number
  totalAmount: number
}

export interface SafraReportMovement {
  id: string
  type: 'REVENUE' | 'EXPENSE'
  date: string
  description: string
  status: string
  amount: number
}

export interface SafraReportDetail {
  summary: SafraReportSummary
  expensesByCategory: SafraExpenseByCategory[]
  revenuesByProductClient: SafraRevenueByProductClient[]
  recentMovements: SafraReportMovement[]
}
