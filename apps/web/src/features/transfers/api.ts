import { api } from '@/lib/api'
import type { ApiResponse, PaginatedResponse, Transfer } from '@/types/api'

export interface TransferPayload {
  fromAccountId?: string
  toAccountId?: string
  amount?: number
  description?: string | null
  date?: string
}

function cleanCreateTransferPayload(payload: TransferPayload): TransferPayload {
  const clean: TransferPayload = {
    fromAccountId: payload.fromAccountId,
    toAccountId: payload.toAccountId,
    amount: payload.amount,
    date: payload.date,
  }

  if (payload.description) clean.description = payload.description

  return clean
}

function cleanUpdateTransferPayload(payload: TransferPayload): TransferPayload {
  const clean: TransferPayload = {}

  for (const [key, value] of Object.entries(payload) as Array<[keyof TransferPayload, TransferPayload[keyof TransferPayload]]>) {
    if (value === undefined || value === '') continue

    if (value === null) {
      if (key === 'description') clean.description = null
      continue
    }

    clean[key] = value as never
  }

  return clean
}

export async function listTransfers() {
  const { data } = await api.get<PaginatedResponse<Transfer>>('/transfers')
  return data
}

export async function createTransfer(payload: TransferPayload) {
  const { data } = await api.post<ApiResponse<Transfer>>('/transfers', cleanCreateTransferPayload(payload))
  return data.data
}

export async function updateTransfer(id: string, payload: TransferPayload) {
  const { data } = await api.patch<ApiResponse<Transfer>>(`/transfers/${id}`, cleanUpdateTransferPayload(payload))
  return data.data
}

export async function deleteTransfer(id: string) {
  await api.delete(`/transfers/${id}`)
}
