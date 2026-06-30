import { api } from '@/lib/api'
import type { ApiResponse, Bill, BillStatus, PaginatedResponse } from '@/types/api'

export interface BillPayload {
  supplierId?: string | null
  accountId?: string | null
  description?: string
  amount?: number
  dueDate?: string
  paidAt?: string | null
  status?: Exclude<BillStatus, 'OVERDUE'>
  fileUrl?: string | null
  installmentNumber?: number | null
  installmentCount?: number | null
}

export interface BillInstallmentsPayload {
  supplierId?: string
  accountId?: string
  description: string
  totalAmount: number
  installmentCount: number
  firstDueDate: string
  fileUrl?: string
}

export interface BillRecurringPayload {
  supplierId?: string
  accountId?: string
  description: string
  amount: number
  firstDueDate: string
  months: number
  skipExisting?: boolean
}

export interface BillInstallmentsResult {
  group: {
    id: string
    companyId: string
    supplierId: string | null
    description: string
    totalAmount: number | string
    installmentCount: number
    createdAt: string
    updatedAt: string
  }
  bills: Bill[]
}

export interface BillRecurringResult {
  created: Bill[]
  skipped: Array<{
    dueDate: string
    reason: 'DUPLICATE'
    existingBillId: string
  }>
  countCreated: number
  countSkipped: number
}

function cleanCreateBillPayload(payload: BillPayload): BillPayload {
  const clean: BillPayload = {
    description: payload.description,
    amount: payload.amount,
    dueDate: payload.dueDate,
    status: payload.status,
  }

  if (payload.supplierId) clean.supplierId = payload.supplierId
  if (payload.status === 'PAID' && payload.accountId) clean.accountId = payload.accountId
  if (payload.paidAt) clean.paidAt = payload.paidAt
  if (payload.fileUrl) clean.fileUrl = payload.fileUrl
  if (payload.installmentNumber) clean.installmentNumber = payload.installmentNumber
  if (payload.installmentCount) clean.installmentCount = payload.installmentCount

  return clean
}

function cleanUpdateBillPayload(payload: BillPayload): BillPayload {
  const clean: BillPayload = {}

  for (const [key, value] of Object.entries(payload) as Array<[keyof BillPayload, BillPayload[keyof BillPayload]]>) {
    if (value === undefined || value === '') continue

    if (value === null) {
      if (
        key === 'supplierId' ||
        key === 'accountId' ||
        key === 'paidAt' ||
        key === 'fileUrl' ||
        key === 'installmentNumber' ||
        key === 'installmentCount'
      ) {
        clean[key] = value
      }
      continue
    }

    clean[key] = value as never
  }

  return clean
}

function cleanCreateBillInstallmentsPayload(payload: BillInstallmentsPayload): BillInstallmentsPayload {
  const clean: BillInstallmentsPayload = {
    description: payload.description,
    totalAmount: payload.totalAmount,
    installmentCount: payload.installmentCount,
    firstDueDate: payload.firstDueDate,
  }

  if (payload.supplierId) clean.supplierId = payload.supplierId
  if (payload.accountId) clean.accountId = payload.accountId
  if (payload.fileUrl) clean.fileUrl = payload.fileUrl

  return clean
}

function cleanCreateBillRecurringPayload(payload: BillRecurringPayload): BillRecurringPayload {
  const clean: BillRecurringPayload = {
    description: payload.description,
    amount: payload.amount,
    firstDueDate: payload.firstDueDate,
    months: payload.months,
    skipExisting: payload.skipExisting ?? true,
  }

  if (payload.supplierId) clean.supplierId = payload.supplierId
  if (payload.accountId) clean.accountId = payload.accountId

  return clean
}

export async function listBills() {
  const { data } = await api.get<PaginatedResponse<Bill>>('/bills')
  return data
}

export async function createBill(payload: BillPayload) {
  const { data } = await api.post<ApiResponse<Bill>>('/bills', cleanCreateBillPayload(payload))
  return data.data
}

export async function createBillInstallments(payload: BillInstallmentsPayload) {
  const { data } = await api.post<ApiResponse<BillInstallmentsResult>>(
    '/bills/installments',
    cleanCreateBillInstallmentsPayload(payload),
  )
  return data.data
}

export async function createRecurringBills(payload: BillRecurringPayload) {
  const { data } = await api.post<ApiResponse<BillRecurringResult>>(
    '/bills/recurring-generate',
    cleanCreateBillRecurringPayload(payload),
  )
  return data.data
}

export async function updateBill(id: string, payload: BillPayload) {
  const { data } = await api.patch<ApiResponse<Bill>>(`/bills/${id}`, cleanUpdateBillPayload(payload))
  return data.data
}

export async function deleteBill(id: string) {
  await api.delete(`/bills/${id}`)
}
