import { api } from '@/lib/api'
import type { ApiResponse, PaginatedResponse, Product } from '@/types/api'

export interface ProductPayload {
  name: string
  description?: string | null
  unit?: string
  categoryId?: string | null
  active?: boolean
}

export async function listProducts() {
  const { data } = await api.get<PaginatedResponse<Product>>('/products')
  return data
}

export async function createProduct(payload: ProductPayload) {
  const { data } = await api.post<ApiResponse<Product>>('/products', payload)
  return data.data
}

export async function updateProduct(id: string, payload: ProductPayload) {
  const { data } = await api.patch<ApiResponse<Product>>(`/products/${id}`, payload)
  return data.data
}

export async function deleteProduct(id: string) {
  await api.delete(`/products/${id}`)
}
