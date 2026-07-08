import { api } from '@/lib/api'
import type { ApiResponse } from '@/types/api'
import type { NotificationAlerts } from './types'

export async function getNotificationAlerts() {
  const { data } = await api.get<ApiResponse<NotificationAlerts>>('/notifications/alerts')
  return data.data
}
