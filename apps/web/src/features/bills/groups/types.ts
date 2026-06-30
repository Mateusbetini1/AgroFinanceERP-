import type { AccountType, BillStatus, CategoryType } from '@/types/api'

export type BillGroupStatus = 'PENDING' | 'IN_PROGRESS' | 'PAID' | 'OVERDUE'

export interface BillGroupSummary {
  id: string
  description: string
  supplier: { id: string; name: string } | null
  category: { id: string; name: string; type?: CategoryType } | null
  categoryMixed: boolean
  safra: { id: string; name: string } | null
  safraMixed: boolean
  totalAmount: number | string
  activeTotalAmount: number | string
  paidAmount: number | string
  pendingAmount: number | string
  installmentCount: number
  activeInstallments: number
  paidInstallments: number
  pendingInstallments: number
  overdueInstallments: number
  deletedInstallments: number
  nextDueDate: string | null
  status: BillGroupStatus
  createdAt: string
  updatedAt: string
}

export interface BillGroupInstallment {
  id: string
  description: string
  amount: number | string
  dueDate: string
  paidAt: string | null
  status: BillStatus
  installmentNumber: number | null
  installmentCount: number | null
  category: { id: string; name: string; type?: CategoryType } | null
  supplier: { id: string; name: string } | null
  account: { id: string; name: string; type?: AccountType } | null
  safra: { id: string; name: string } | null
}

export interface BillGroupDetail {
  summary: BillGroupSummary
  installments: BillGroupInstallment[]
}

export interface BillGroupFilters {
  page?: number
  limit?: number
  search?: string
  supplierId?: string
  status?: BillGroupStatus
}
