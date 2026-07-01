export type AssistantKind = 'ANSWER' | 'NEEDS_CLARIFICATION' | 'ERROR' | 'DRAFT'

export type AssistantSource = {
  label: string
  route?: string
}

export type AssistantResponse = {
  answer: string
  kind: AssistantKind
  sources: AssistantSource[]
  data?: unknown
  draft?: AssistantDraft
}

export type AssistantMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  kind?: AssistantKind
  sources?: AssistantSource[]
  draft?: AssistantDraft
}

export type AssistantChatContext = {
  currentRoute?: string
  recentMessages?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

export type AssistantDraft = {
  draftType: 'CREATE_EXPENSE' | 'CREATE_BILL' | 'CREATE_EMPLOYEE_PAYMENT'
  payload: Record<string, unknown>
  missingFields: string[]
  confirmationRequired: true
}
