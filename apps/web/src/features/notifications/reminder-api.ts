import { api } from '@/lib/api'
import type { ApiResponse } from '@/types/api'

export type ReminderRuleType = 'BILL' | 'EXPENSE' | 'REVENUE' | 'GENERAL'
export type ReminderRecurrenceType = 'MONTHLY_DAY' | 'ONE_TIME'

export type ReminderRule = {
  id: string
  name: string
  type: ReminderRuleType
  active: boolean
  recurrenceType: ReminderRecurrenceType
  dayOfMonth: number | null
  dueDate: string | null
  leadDays: number[]
  pushEnabled: boolean
  inAppEnabled: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export type ReminderRulePayload = {
  name: string
  type: ReminderRuleType
  active?: boolean
  recurrenceType: ReminderRecurrenceType
  dayOfMonth?: number | null
  dueDate?: string | null
  leadDays: number[]
  pushEnabled: boolean
  inAppEnabled: boolean
  notes?: string | null
}

export type ReminderPreviewItem = {
  ruleId: string
  ruleName: string
  type: ReminderRuleType
  scheduledFor: string
  dueDate: string
  leadDays: number
  label: string
}

export type ReminderPreview = {
  items: ReminderPreviewItem[]
}

function cleanPayload(payload: ReminderRulePayload): ReminderRulePayload {
  return {
    name: payload.name,
    type: payload.type,
    active: payload.active,
    recurrenceType: payload.recurrenceType,
    dayOfMonth: payload.recurrenceType === 'MONTHLY_DAY' ? payload.dayOfMonth : null,
    dueDate: payload.recurrenceType === 'ONE_TIME' ? payload.dueDate : null,
    leadDays: payload.leadDays,
    pushEnabled: payload.pushEnabled,
    inAppEnabled: payload.inAppEnabled,
    notes: payload.notes?.trim() ? payload.notes.trim() : null,
  }
}

export async function listReminderRules() {
  const { data } = await api.get<ApiResponse<ReminderRule[]>>('/notifications/reminder-rules')
  return data.data
}

export async function getReminderPreview() {
  const { data } = await api.get<ApiResponse<ReminderPreview>>('/notifications/reminder-rules/preview')
  return data.data
}

export async function createReminderRule(payload: ReminderRulePayload) {
  const { data } = await api.post<ApiResponse<ReminderRule>>('/notifications/reminder-rules', cleanPayload(payload))
  return data.data
}

export async function updateReminderRule(id: string, payload: Partial<ReminderRulePayload>) {
  const { data } = await api.patch<ApiResponse<ReminderRule>>(`/notifications/reminder-rules/${id}`, payload)
  return data.data
}

export async function deleteReminderRule(id: string) {
  const { data } = await api.delete<ApiResponse<{ id: string; deleted: boolean }>>(`/notifications/reminder-rules/${id}`)
  return data.data
}
