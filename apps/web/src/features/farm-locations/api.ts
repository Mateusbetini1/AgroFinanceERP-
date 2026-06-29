import { api } from '@/lib/api'
import type { FarmLocation, PaginatedResponse } from '@/types/api'

export async function listFarmLocations({ active }: { active?: boolean } = {}) {
  const { data } = await api.get<PaginatedResponse<FarmLocation>>('/farm-locations', {
    params: active === undefined ? undefined : { active: String(active) },
  })
  return data
}
