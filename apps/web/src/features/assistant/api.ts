import { api } from '@/lib/api'
import type { ApiResponse } from '@/types/api'
import type { AssistantChatContext, AssistantDraft, AssistantResponse } from './types'

export async function sendAssistantMessage(payload: { message: string; context?: AssistantChatContext }) {
  const { data } = await api.post<ApiResponse<AssistantResponse>>('/assistant/chat', payload)
  return data.data
}

export async function confirmAssistantDraft(draft: AssistantDraft) {
  const { data } = await api.post<ApiResponse<{ draftType: AssistantDraft['draftType']; created: unknown }>>(
    '/assistant/drafts/confirm',
    { draft },
  )
  return data.data
}
