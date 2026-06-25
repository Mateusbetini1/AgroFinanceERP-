import { api } from '@/lib/api'
import type { PaginatedResponse, Product } from '@/types/api'

export async function listProducts() {
  const { data } = await api.get<PaginatedResponse<Product>>('/products')
  return data
}
