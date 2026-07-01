export type AssistantKind = 'ANSWER' | 'NEEDS_CLARIFICATION' | 'ERROR'

export type AssistantSource = {
  label: string
  route?: string
}

export type AssistantResponse = {
  answer: string
  kind: AssistantKind
  sources: AssistantSource[]
  data?: unknown
}

export type AssistantMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  kind?: AssistantKind
  sources?: AssistantSource[]
}

export type AssistantChatContext = {
  currentRoute?: string
  recentMessages?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}
