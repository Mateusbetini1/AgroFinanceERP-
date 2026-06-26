import { api } from '@/lib/api'
import type { Employee, PaginatedResponse } from '@/types/api'

export async function listActiveEmployees() {
  const { data } = await api.get<PaginatedResponse<Employee>>('/employees', {
    params: { status: 'ACTIVE' },
  })
  return data
}
