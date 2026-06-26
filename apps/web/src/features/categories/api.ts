import { api } from '@/lib/api'
import type { ApiResponse, Category, CategoryType, PaginatedResponse } from '@/types/api'

export interface CategoryPayload {
  name: string
  type?: CategoryType
  color?: string | null
  active?: boolean
}

function cleanCreateCategoryPayload(payload: CategoryPayload): CategoryPayload {
  const clean: CategoryPayload = { name: payload.name }

  if (payload.type) clean.type = payload.type
  if (payload.color) clean.color = payload.color

  return clean
}

function cleanUpdateCategoryPayload(payload: CategoryPayload): CategoryPayload {
  const clean: CategoryPayload = { name: payload.name }

  if (payload.type) clean.type = payload.type
  if (payload.color !== undefined) clean.color = payload.color
  if (payload.active !== undefined) clean.active = payload.active

  return clean
}

export async function listCategories() {
  const { data } = await api.get<PaginatedResponse<Category>>('/categories')
  return data
}

export async function createCategory(payload: CategoryPayload) {
  const { data } = await api.post<ApiResponse<Category>>('/categories', cleanCreateCategoryPayload(payload))
  return data.data
}

export async function updateCategory(id: string, payload: CategoryPayload) {
  const { data } = await api.patch<ApiResponse<Category>>(`/categories/${id}`, cleanUpdateCategoryPayload(payload))
  return data.data
}

export async function deleteCategory(id: string) {
  await api.delete(`/categories/${id}`)
}
