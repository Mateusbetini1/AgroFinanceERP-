import { api } from '@/lib/api'
import type { ApiResponse } from '@/types/api'
import type { AssistantChatContext, AssistantResponse } from './types'

export async function sendAssistantMessage(payload: { message: string; context?: AssistantChatContext }) {
  const { data } = await api.post<ApiResponse<AssistantResponse>>('/assistant/chat', payload)
  return data.data
}
