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
  confirmedDraft?: AssistantDraftDestination
}

export type AssistantChatContext = {
  currentRoute?: string
  currentDraft?: AssistantDraft
  recentMessages?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

export type AssistantDraft = {
  draftType:
    | 'CREATE_EXPENSE'
    | 'CREATE_BILL'
    | 'CREATE_BILL_INSTALLMENT_GROUP'
    | 'CREATE_EMPLOYEE_PAYMENT'
    | 'CREATE_REVENUE'
  payload: Record<string, unknown>
  missingFields: string[]
  confirmationRequired: true
}

export type AssistantDraftDestination = {
  draftType: AssistantDraft['draftType']
  label: string
  route: string
}
