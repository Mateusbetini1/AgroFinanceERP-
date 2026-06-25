import { api } from '@/lib/api'
import type { ApiResponse, Category, CategoryType, PaginatedResponse } from '@/types/api'

export interface CategoryPayload {
  name: string
  type?: CategoryType
  color?: string | null
  active?: boolean
}

export async function listCategories() {
  const { data } = await api.get<PaginatedResponse<Category>>('/categories')
  return data
}

export async function createCategory(payload: CategoryPayload) {
  const { data } = await api.post<ApiResponse<Category>>('/categories', payload)
  return data.data
}

export async function updateCategory(id: string, payload: CategoryPayload) {
  const { data } = await api.patch<ApiResponse<Category>>(`/categories/${id}`, payload)
  return data.data
}

export async function deleteCategory(id: string) {
  await api.delete(`/categories/${id}`)
}
