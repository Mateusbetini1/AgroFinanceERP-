import { api } from '@/lib/api'
import type { ApiResponse, InputPurchase, PaginatedResponse, SupplyUnit } from '@/types/api'

export interface InputPurchaseItemPayload {
  supplyId: string
  quantity: number
  unit: SupplyUnit
  totalAmount: number
}

export interface InputPurchasePayload {
  supplierId?: string | null
  purchaseDate: string
  documentNumber?: string | null
  notes?: string | null
  items: InputPurchaseItemPayload[]
}

function cleanInputPurchasePayload(payload: InputPurchasePayload): InputPurchasePayload {
  return {
    supplierId: payload.supplierId || null,
    purchaseDate: payload.purchaseDate,
    documentNumber: payload.documentNumber || null,
    notes: payload.notes || null,
    items: payload.items.map((item) => ({
      supplyId: item.supplyId,
      quantity: Number(item.quantity),
      unit: item.unit,
      totalAmount: Number(item.totalAmount),
    })),
  }
}

export async function listInputPurchases() {
  const { data } = await api.get<PaginatedResponse<InputPurchase>>('/input-purchases')
  return data
}

export async function createInputPurchase(payload: InputPurchasePayload) {
  const { data } = await api.post<ApiResponse<InputPurchase>>(
    '/input-purchases',
    cleanInputPurchasePayload(payload),
  )
  return data.data
}
