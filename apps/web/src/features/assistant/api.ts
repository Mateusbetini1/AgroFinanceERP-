import { api } from '@/lib/api'
import type { ApiResponse } from '@/types/api'
import type { AssistantResponse } from './types'

export async function sendAssistantMessage(message: string) {
  const { data } = await api.post<ApiResponse<AssistantResponse>>('/assistant/chat', { message })
  return data.data
}
