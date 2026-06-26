import { api } from '@/lib/api'
import type { ApiResponse, PaginatedResponse, Product } from '@/types/api'

export interface ProductPayload {
  name: string
  description?: string | null
  unit?: string
  categoryId?: string | null
  active?: boolean
}

function cleanCreateProductPayload(payload: ProductPayload): ProductPayload {
  const clean: ProductPayload = { name: payload.name }

  if (payload.description) clean.description = payload.description
  if (payload.unit) clean.unit = payload.unit.toUpperCase()
  if (payload.categoryId) clean.categoryId = payload.categoryId

  return clean
}

function cleanUpdateProductPayload(payload: ProductPayload): ProductPayload {
  const clean: ProductPayload = { name: payload.name }

  if (payload.description !== undefined) clean.description = payload.description
  if (payload.unit) clean.unit = payload.unit.toUpperCase()
  if (payload.categoryId !== undefined) clean.categoryId = payload.categoryId
  if (payload.active !== undefined) clean.active = payload.active

  return clean
}

export async function listProducts() {
  const { data } = await api.get<PaginatedResponse<Product>>('/products')
  return data
}

export async function createProduct(payload: ProductPayload) {
  const { data } = await api.post<ApiResponse<Product>>('/products', cleanCreateProductPayload(payload))
  return data.data
}

export async function updateProduct(id: string, payload: ProductPayload) {
  const { data } = await api.patch<ApiResponse<Product>>(`/products/${id}`, cleanUpdateProductPayload(payload))
  return data.data
}

export async function deleteProduct(id: string) {
  await api.delete(`/products/${id}`)
}
