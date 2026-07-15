import { api } from '@/lib/api'
import type { Account, AccountType, ApiResponse, PaginatedResponse } from '@/types/api'

export type AccountSummarySourceType = 'REVENUE' | 'EXPENSE' | 'BILL' | 'EMPLOYEE_PAYMENT' | 'TRANSFER'
export type AccountSummaryDirection = 'INFLOW' | 'OUTFLOW'

export interface AccountSummaryPendingItem {
  id: string
  date: string
  description: string
  amount: number
  status: string
  sourceType: AccountSummarySourceType
  supplier?: { id: string; name: string } | null
  category?: { id: string; name: string } | null
}

export interface AccountSummaryMovement {
  id: string
  date: string
  sourceType: AccountSummarySourceType
  description: string
  amount: number
  direction: AccountSummaryDirection
  relatedId: string
}

export interface AccountSummary {
  account: Account
  period: {
    year: number
    month: number
    startDate: string
    endDate: string
  }
  totals: {
    inflows: number
    outflows: number
    net: number
    pendingInflows: number
    pendingOutflows: number
  }
  pending: {
    revenues: AccountSummaryPendingItem[]
    expenses: AccountSummaryPendingItem[]
    bills: AccountSummaryPendingItem[]
    employeePayments: AccountSummaryPendingItem[]
  }
  movements: AccountSummaryMovement[]
}

export interface AccountPayload {
  name: string
  type: AccountType
  bankName?: string | null
  agency?: string | null
  accountNumber?: string | null
  initialBalance?: number
  active?: boolean
}

function cleanCreateAccountPayload(payload: AccountPayload): AccountPayload {
  const clean: AccountPayload = {
    name: payload.name,
    type: payload.type,
  }

  if (payload.bankName) clean.bankName = payload.bankName
  if (payload.agency) clean.agency = payload.agency
  if (payload.accountNumber) clean.accountNumber = payload.accountNumber
  if (payload.initialBalance !== undefined) clean.initialBalance = payload.initialBalance

  return clean
}

function cleanUpdateAccountPayload(payload: Omit<AccountPayload, 'initialBalance'>): Omit<AccountPayload, 'initialBalance'> {
  const clean: Omit<AccountPayload, 'initialBalance'> = {
    name: payload.name,
    type: payload.type,
  }

  if (payload.bankName !== undefined) clean.bankName = payload.bankName
  if (payload.agency !== undefined) clean.agency = payload.agency
  if (payload.accountNumber !== undefined) clean.accountNumber = payload.accountNumber
  if (payload.active !== undefined) clean.active = payload.active

  return clean
}

export async function listAccounts() {
  const { data } = await api.get<PaginatedResponse<Account>>('/accounts')
  return data
}

export async function getAccountSummary(id: string, period: { month: number; year: number }) {
  const { data } = await api.get<ApiResponse<AccountSummary>>(`/accounts/${id}/summary`, { params: period })
  return data.data
}

export async function createAccount(payload: AccountPayload) {
  const { data } = await api.post<ApiResponse<Account>>('/accounts', cleanCreateAccountPayload(payload))
  return data.data
}

export async function updateAccount(id: string, payload: Omit<AccountPayload, 'initialBalance'>) {
  const { data } = await api.patch<ApiResponse<Account>>(`/accounts/${id}`, cleanUpdateAccountPayload(payload))
  return data.data
}

export async function deleteAccount(id: string) {
  await api.delete(`/accounts/${id}`)
}
