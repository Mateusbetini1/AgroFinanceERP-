import { api } from '@/lib/api'
import type { ApiResponse, Expense, ExpenseStatus, PaginatedResponse } from '@/types/api'

export interface ExpensePayload {
  categoryId?: string
  supplierId?: string | null
  accountId?: string | null
  safraId?: string | null
  date?: string
  dueDate?: string | null
  paidAt?: string | null
  amount?: number
  description?: string
  status?: Exclude<ExpenseStatus, 'OVERDUE'>
  attachmentUrl?: string | null
}

export interface ExpenseFilters {
  search?: string
  status?: ExpenseStatus
  safraId?: string
  dateFrom?: string
  dateTo?: string
}

function cleanCreateExpensePayload(payload: ExpensePayload): ExpensePayload {
  const clean: ExpensePayload = {
    categoryId: payload.categoryId,
    date: payload.date,
    amount: payload.amount,
    description: payload.description,
    status: payload.status,
  }

  if (payload.supplierId) clean.supplierId = payload.supplierId
  if (payload.status === 'PAID' && payload.accountId) clean.accountId = payload.accountId
  if (payload.safraId) clean.safraId = payload.safraId
  if (payload.dueDate) clean.dueDate = payload.dueDate
  if (payload.paidAt) clean.paidAt = payload.paidAt
  if (payload.attachmentUrl) clean.attachmentUrl = payload.attachmentUrl

  return clean
}

function cleanUpdateExpensePayload(payload: ExpensePayload): ExpensePayload {
  const clean: ExpensePayload = {}

  for (const [key, value] of Object.entries(payload) as Array<[keyof ExpensePayload, ExpensePayload[keyof ExpensePayload]]>) {
    if (value === undefined || value === '') continue

    if (value === null) {
      if (
        key === 'supplierId' ||
        key === 'accountId' ||
        key === 'safraId' ||
        key === 'dueDate' ||
        key === 'paidAt' ||
        key === 'attachmentUrl'
      ) {
        clean[key] = value
      }
      continue
    }

    clean[key] = value as never
  }

  return clean
}

export async function listExpenses(filters?: ExpenseFilters) {
  const { data } = await api.get<PaginatedResponse<Expense>>('/expenses', { params: filters })
  return data
}

export async function createExpense(payload: ExpensePayload) {
  const { data } = await api.post<ApiResponse<Expense>>('/expenses', cleanCreateExpensePayload(payload))
  return data.data
}

export async function updateExpense(id: string, payload: ExpensePayload) {
  const { data } = await api.patch<ApiResponse<Expense>>(`/expenses/${id}`, cleanUpdateExpensePayload(payload))
  return data.data
}

export async function deleteExpense(id: string) {
  await api.delete(`/expenses/${id}`)
}
