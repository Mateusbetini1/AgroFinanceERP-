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

export async function listBills() {
  const { data } = await api.get<PaginatedResponse<Bill>>('/bills')
  return data
}

export async function createBill(payload: BillPayload) {
  const { data } = await api.post<ApiResponse<Bill>>('/bills', cleanCreateBillPayload(payload))
  return data.data
}

export async function updateBill(id: string, payload: BillPayload) {
  const { data } = await api.patch<ApiResponse<Bill>>(`/bills/${id}`, cleanUpdateBillPayload(payload))
  return data.data
}

export async function deleteBill(id: string) {
  await api.delete(`/bills/${id}`)
}
